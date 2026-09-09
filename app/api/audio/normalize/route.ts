// app/api/audio/normalize/route.ts
import { NextRequest } from "next/server";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  parseChoice,
  parseNumber,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import path from "path";
import { audioQualityOverride, parseQuality } from "@/lib/server/quality";

export const runtime = "nodejs";

/** Fixed set — the output format can never be an arbitrary client string. */
const FORMATS = ["mp3", "m4a", "aac", "ogg", "wav", "flac"] as const;
type Format = (typeof FORMATS)[number];

type FormatConfig = { codecArgs: string[]; lossy: boolean; contentType: string };

const FORMAT_CONFIG: Record<Format, FormatConfig> = {
  mp3: { codecArgs: ["-c:a", "libmp3lame"], lossy: true, contentType: "audio/mpeg" },
  m4a: { codecArgs: ["-c:a", "aac"], lossy: true, contentType: "audio/mp4" },
  aac: { codecArgs: ["-c:a", "aac"], lossy: true, contentType: "audio/aac" },
  ogg: { codecArgs: ["-c:a", "libvorbis"], lossy: true, contentType: "audio/ogg" },
  wav: { codecArgs: ["-c:a", "pcm_s16le"], lossy: false, contentType: "audio/wav" },
  flac: { codecArgs: ["-c:a", "flac"], lossy: false, contentType: "audio/flac" },
};

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tempDirectory: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    /*
     * Bounded to the range loudnorm accepts for integrated loudness.
     *
     * This value is interpolated into the filtergraph, so it must be a
     * number and nothing else. Passing the raw form string through would
     * let a value like "-14:TP=0,areverse" close the loudnorm options and
     * append filters of the caller's choosing — the arguments never reach
     * a shell, but FFmpeg still parses the filter chain itself.
     */
    const targetLevel = parseNumber(formData.get("targetLevel"), {
      min: -70,
      max: -5,
      fallback: -14,
      label: "Target level",
    });

    // Fixed allowlist — same guarantee as targetLevel above, just for a
    // string field instead of a number.
    const format = parseChoice(formData.get("format"), FORMATS, "mp3") as Format;
    const quality = parseQuality(formData.get("quality"));
    const config = FORMAT_CONFIG[format];

    tempDirectory = await createTempDir("audio-normalize");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, `normalized.${format}`);

    const args = [
      "-y",
      "-i",
      inputPath,
      "-af",
      `loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`,
      "-vn",
      ...config.codecArgs,
      ...audioQualityOverride(format, quality),
    ];

    /*
     * A hardcoded 192k used to be pushed here for lossy formats. It came after
     * audioQualityOverride() in the same array, and FFmpeg takes the last
     * occurrence — so it silently overrode whatever the user picked, making
     * High and Low produce identical files. The override already skips
     * lossless formats, which is the only thing this guard was for.
     */

    args.push("-ar", "44100", outputPath);

    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Normalize",
    });

    return await fileResponse(outputPath, {
      contentType: config.contentType,
      downloadName: `${upload.baseName}_normalized.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}