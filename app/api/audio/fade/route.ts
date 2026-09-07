// app/api/audio/fade/route.ts
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

export const runtime = "nodejs";

/** Longest fade we will apply, in seconds. */
const MAX_FADE_SECONDS = 60 * 60;

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

    const fadeIn = parseNumber(formData.get("fadeIn"), {
      min: 0,
      max: MAX_FADE_SECONDS,
      fallback: 0,
      label: "Fade in",
    });

    const fadeOut = parseNumber(formData.get("fadeOut"), {
      min: 0,
      max: MAX_FADE_SECONDS,
      fallback: 0,
      label: "Fade out",
    });

    const totalDuration = parseNumber(formData.get("duration"), {
      min: 0,
      max: 24 * 60 * 60,
      fallback: 0,
      label: "Duration",
    });

    // Fixed allowlist — same guarantee as the numeric fields above, just
    // for a string field instead of a number.
    const format = parseChoice(formData.get("format"), FORMATS, "mp3") as Format;
    const config = FORMAT_CONFIG[format];

    /*
     * Filter values are built from numbers this route parsed itself, never
     * from raw form strings — an unchecked value here would be appended to
     * the filtergraph and could rewrite the whole chain.
     */
    const filterParts: string[] = [];

    if (fadeIn > 0) {
      filterParts.push(`afade=t=in:st=0:d=${fadeIn}`);
    }

    if (fadeOut > 0) {
      const startTime =
        totalDuration > fadeOut ? totalDuration - fadeOut : 0;

      filterParts.push(`afade=t=out:st=${startTime}:d=${fadeOut}`);
    }

    const filterString =
      filterParts.length > 0 ? filterParts.join(",") : "anull";

    tempDirectory = await createTempDir("audio-fade");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, `faded.${format}`);

    const args = [
      "-y",
      "-i",
      inputPath,
      "-af",
      filterString,
      "-vn",
      ...config.codecArgs,
    ];

    // Bitrate only makes sense for lossy codecs — lossless formats ignore it.
    if (config.lossy) {
      args.push("-b:a", "192k");
    }

    args.push("-ar", "44100", outputPath);

    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Fade",
    });

    return await fileResponse(outputPath, {
      contentType: config.contentType,
      downloadName: `${upload.baseName}_fade.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}