import { NextRequest } from "next/server";
import path from "path";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  parseChoice,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import { audioQualityOverride, parseQuality } from "@/lib/server/quality";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Fixed set — the bitrate can never be an arbitrary client string. */
const BITRATES = ["64", "96", "128", "192", "256", "320"] as const;

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

  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const bitrate = parseChoice(formData.get("bitrate"), BITRATES, "128");
    const format = parseChoice(formData.get("format"), FORMATS, "mp3") as Format;
    const quality = parseQuality(formData.get("quality"));
    const config = FORMAT_CONFIG[format];

    tempDir = await createTempDir("audio-compress");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `compressed.${format}`);

    const args = [
      "-y",
      "-i",
      inputPath,
      "-vn",
      ...config.codecArgs,
      ...audioQualityOverride(format, quality),
    ];

    // Bitrate only makes sense for lossy codecs — lossless formats ignore it.
    if (config.lossy) {
      args.push("-b:a", `${bitrate}k`);
    }

    args.push("-ar", "44100", outputPath);

    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Compress",
    });

    return await fileResponse(outputPath, {
      contentType: config.contentType,
      downloadName: `${upload.baseName}-${format}${config.lossy ? `-${bitrate}kbps` : ""}.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}