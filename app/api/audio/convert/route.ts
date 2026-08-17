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

export const runtime = "nodejs";
export const maxDuration = 300;

const FORMATS = ["mp3", "wav", "aac", "flac", "ogg", "m4a"] as const;
type Format = (typeof FORMATS)[number];

/**
 * Encoder settings per format.
 *
 * Relying on FFmpeg to infer the codec from the file extension is fragile —
 * being explicit avoids silent failures (e.g. .m4a defaulting oddly).
 */
const ENCODERS: Record<Format, { args: string[]; contentType: string }> = {
  mp3: {
    args: ["-c:a", "libmp3lame", "-q:a", "2"],
    contentType: "audio/mpeg",
  },
  wav: {
    args: ["-c:a", "pcm_s16le"],
    contentType: "audio/wav",
  },
  aac: {
    args: ["-c:a", "aac", "-b:a", "192k"],
    contentType: "audio/aac",
  },
  flac: {
    args: ["-c:a", "flac"],
    contentType: "audio/flac",
  },
  ogg: {
    args: ["-c:a", "libvorbis", "-q:a", "5"],
    contentType: "audio/ogg",
  },
  m4a: {
    args: ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"],
    contentType: "audio/mp4",
  },
};

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const format = parseChoice(formData.get("format"), FORMATS, "mp3");
    const encoder = ENCODERS[format];

    tempDir = await createTempDir("audio-convert");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `converted.${format}`);

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      ...encoder.args,
      outputPath,
    ]);

    return await fileResponse(outputPath, {
      contentType: encoder.contentType,
      downloadName: `${upload.baseName}.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}