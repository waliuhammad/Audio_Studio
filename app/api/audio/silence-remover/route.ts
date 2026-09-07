import { NextRequest } from "next/server";
import path from "path";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  parseNumber,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Remove silent sections using FFmpeg's silenceremove filter.
 *
 * Running it once only trims leading silence, so the standard approach is
 * to apply it, reverse the stream, apply it again, and reverse back — which
 * catches trailing silence too. The middle pass with stop_periods=-1 strips
 * silent gaps throughout.
 */

/**
 * Output format support. Keep the `value` keys in sync with
 * FORMAT_OPTIONS in app/audiotools/silence-remover/page.tsx.
 *
 * `ext` drives both the ffmpeg output path (some muxers are inferred
 * from the file extension) and the downloaded filename.
 */
const AUDIO_FORMAT_CONFIG = {
  mp3: {
    ext: "mp3",
    contentType: "audio/mpeg",
    codecArgs: ["-c:a", "libmp3lame", "-q:a", "2"],
  },
  wav: {
    ext: "wav",
    contentType: "audio/wav",
    codecArgs: ["-c:a", "pcm_s16le"],
  },
  flac: {
    ext: "flac",
    contentType: "audio/flac",
    codecArgs: ["-c:a", "flac"],
  },
  ogg: {
    ext: "ogg",
    contentType: "audio/ogg",
    codecArgs: ["-c:a", "libvorbis", "-q:a", "5"],
  },
  m4a: {
    ext: "m4a",
    contentType: "audio/mp4",
    codecArgs: ["-c:a", "aac", "-b:a", "192k"],
  },
} as const;

type AudioFormat = keyof typeof AUDIO_FORMAT_CONFIG;

const DEFAULT_FORMAT: AudioFormat = "mp3";

function resolveFormat(raw: FormDataEntryValue | null): AudioFormat {
  const value = typeof raw === "string" ? raw.toLowerCase().trim() : "";

  return value in AUDIO_FORMAT_CONFIG ? (value as AudioFormat) : DEFAULT_FORMAT;
}

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

    // Anything quieter than this counts as silence.
    const threshold = parseNumber(formData.get("threshold"), {
      min: -80,
      max: -10,
      fallback: -40,
      label: "threshold",
    });

    // Ignore silences shorter than this so speech isn't chopped mid-sentence.
    const minDuration = parseNumber(formData.get("minDuration"), {
      min: 0.1,
      max: 10,
      fallback: 0.5,
      label: "minimum silence duration",
    });

    const format = resolveFormat(formData.get("format"));
    const formatConfig = AUDIO_FORMAT_CONFIG[format];

    tempDir = await createTempDir("audio-silence");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `trimmed.${formatConfig.ext}`);

    const detect = `silenceremove=stop_periods=-1:stop_duration=${minDuration}:stop_threshold=${threshold}dB`;

    // Strip gaps + leading, then reverse to catch trailing, then restore order.
    const filters = [detect, "areverse", detect, "areverse"].join(",");

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-af",
      filters,
      "-vn",
      ...formatConfig.codecArgs,
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Silence remover",
    });

    return await fileResponse(outputPath, {
      contentType: formatConfig.contentType,
      downloadName: `${upload.baseName}-silence-removed.${formatConfig.ext}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}