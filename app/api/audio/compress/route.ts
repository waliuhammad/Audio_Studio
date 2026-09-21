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

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Quality = bitrate. Fixed set — can never be an arbitrary client string.
 * Must stay in sync with QUALITY_OPTIONS on the frontend.
 */
const BITRATES = ["96", "128", "192", "320"] as const;

/**
 * Compression = sample rate + channel count, independent of bitrate.
 * Fixed set — must stay in sync with COMPRESSION_OPTIONS on the frontend.
 */
const COMPRESSION_LEVELS = ["low", "medium", "high", "max"] as const;
type CompressionLevel = (typeof COMPRESSION_LEVELS)[number];

type CompressionConfig = { sampleRate: number; channels: number };

const COMPRESSION_CONFIG: Record<CompressionLevel, CompressionConfig> = {
  low: { sampleRate: 44100, channels: 2 },
  medium: { sampleRate: 32000, channels: 2 },
  high: { sampleRate: 22050, channels: 1 },
  max: { sampleRate: 16000, channels: 1 },
};

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
    const compressionLevel = parseChoice(
      formData.get("compression"),
      COMPRESSION_LEVELS,
      "low"
    ) as CompressionLevel;

    const config = FORMAT_CONFIG[format];
    const { sampleRate, channels } = COMPRESSION_CONFIG[compressionLevel];

    tempDir = await createTempDir("audio-compress");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `compressed.${format}`);

    const args = [
      "-y",
      "-i",
      inputPath,
      "-vn",
      ...config.codecArgs,
    ];

    // Bitrate (Quality) only makes sense for lossy codecs — lossless
    // formats ignore it but still respect the Compression sample-rate /
    // channel settings below.
    if (config.lossy) {
      args.push("-b:a", `${bitrate}k`);
    }

    // Compression: independent of bitrate. Always applied.
    args.push("-ar", `${sampleRate}`, "-ac", `${channels}`, outputPath);

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
      downloadName: `${upload.baseName}-${format}${config.lossy ? `-${bitrate}kbps` : ""}-${compressionLevel}.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}