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

/** Fixed set — the bitrate can never be an arbitrary client string. */
const BITRATES = ["64", "96", "128", "192", "256", "320"] as const;

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const bitrate = parseChoice(formData.get("bitrate"), BITRATES, "128");

    tempDir = await createTempDir("audio-compress");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, "compressed.mp3");

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      `${bitrate}k`,
      "-ar",
      "44100",
      outputPath,
    ]);

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}-${bitrate}kbps.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}