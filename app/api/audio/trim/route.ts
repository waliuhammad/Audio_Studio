import { NextRequest } from "next/server";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MediaError,
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
import path from "path";

export const runtime = "nodejs";

// Supported download formats. Each maps to the ffmpeg args needed to
// encode into that container/codec, plus the extension and MIME type
// used for the response.
type AudioFormat = {
  ext: string;
  contentType: string;
  ffmpegArgs: string[];
};

const AUDIO_FORMATS: Record<string, AudioFormat> = {
  mp3: {
    ext: "mp3",
    contentType: "audio/mpeg",
    ffmpegArgs: ["-c:a", "libmp3lame", "-b:a", "192k"],
  },
  wav: {
    ext: "wav",
    contentType: "audio/wav",
    ffmpegArgs: ["-c:a", "pcm_s16le"],
  },
  m4a: {
    ext: "m4a",
    contentType: "audio/mp4",
    ffmpegArgs: ["-c:a", "aac", "-b:a", "192k", "-f", "ipod"],
  },
  ogg: {
    ext: "ogg",
    contentType: "audio/ogg",
    ffmpegArgs: ["-c:a", "libvorbis", "-q:a", "5"],
  },
  aac: {
    ext: "aac",
    contentType: "audio/aac",
    ffmpegArgs: ["-c:a", "aac", "-b:a", "192k"],
  },
  flac: {
    ext: "flac",
    contentType: "audio/flac",
    ffmpegArgs: ["-c:a", "flac"],
  },
};

const DEFAULT_FORMAT = "mp3";

function resolveFormat(raw: FormDataEntryValue | null): AudioFormat & { key: string } {
  const key = String(raw ?? DEFAULT_FORMAT).trim().toLowerCase();
  const format = AUDIO_FORMATS[key];

  if (!format) {
    throw new MediaError(
      `Unsupported output format. Choose one of: ${Object.keys(AUDIO_FORMATS).join(", ")}.`
    );
  }

  return { ...format, key };
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

    const start = parseNumber(formData.get("start"), {
      min: 0,
      max: 24 * 60 * 60,
      label: "Start time",
    });

    const end = parseNumber(formData.get("end"), {
      min: 0,
      max: 24 * 60 * 60,
      label: "End time",
    });

    if (end <= start) {
      throw new MediaError("End time must be greater than start time.");
    }

    const duration = end - start;

    if (duration < 0.1) {
      throw new MediaError("Please select at least 0.1 seconds.");
    }

    const format = resolveFormat(formData.get("format"));

    tempDirectory = await createTempDir("audio-trimmer");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, `trimmed.${format.ext}`);

    await runFFmpeg([
      "-y",
      "-ss",
      String(start),
      "-i",
      inputPath,
      "-t",
      String(duration),
      "-vn",
      ...format.ffmpegArgs,
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Trim",
    });

    return await fileResponse(outputPath, {
      contentType: format.contentType,
      downloadName: `${upload.baseName}-trimmed.${format.ext}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}