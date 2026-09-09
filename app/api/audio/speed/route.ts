// app/api/audio/speed/route.ts
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

/** The UI offers 0.5x–2x; allow a little more, but keep it bounded. */
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;

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

/**
 * Build an atempo chain for any supported multiplier.
 *
 * A single atempo filter only accepts 0.5–2.0, so anything outside that has
 * to be split across several. The previous version used one extra stage and
 * silently produced an invalid filter beyond 0.25x / 4x — e.g. 5x became
 * "atempo=2.0,atempo=2.5", which FFmpeg rejects. Halving or doubling until
 * what remains is in range handles the whole span instead.
 */
function buildTempoChain(speed: number): string {
  const stages: number[] = [];

  let remaining = speed;

  while (remaining > 2) {
    stages.push(2);
    remaining /= 2;
  }

  while (remaining < 0.5) {
    stages.push(0.5);
    remaining /= 0.5;
  }

  stages.push(remaining);

  return stages
    .map((stage) => `atempo=${Number(stage.toFixed(6))}`)
    .join(",");
}

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

    const speed = parseNumber(formData.get("speed"), {
      min: MIN_SPEED,
      max: MAX_SPEED,
      fallback: 1,
      label: "Speed",
    });

    // Fixed allowlist — same guarantee as the numeric speed field above,
    // just for a string field instead of a number.
    const format = parseChoice(formData.get("format"), FORMATS, "mp3") as Format;
    const quality = parseQuality(formData.get("quality"));
    const config = FORMAT_CONFIG[format];

    tempDirectory = await createTempDir("audio-speed");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, `speed.${format}`);

    const args = [
      "-y",
      "-i",
      inputPath,
      "-filter:a",
      buildTempoChain(speed),
      "-vn",
      ...config.codecArgs,
      ...audioQualityOverride(format, quality),
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
      tool: "Speed",
    });

    return await fileResponse(outputPath, {
      contentType: config.contentType,
      downloadName: `${upload.baseName}_${speed}x.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}