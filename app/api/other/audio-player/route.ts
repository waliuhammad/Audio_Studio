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

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    // Bounded: an unbounded multiplier could produce a destructive gain value.
    const volume = parseNumber(formData.get("volume"), {
      min: 0,
      max: 4,
      fallback: 1,
      label: "volume",
    });

    tempDir = await createTempDir("audio-player");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, "processed.mp3");

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-filter:a",
      `volume=${volume}`,
      "-vn",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputPath,
    ]);

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}-vol${volume}.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}