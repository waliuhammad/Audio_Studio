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

/**
 * Remove silent sections using FFmpeg's silenceremove filter.
 *
 * Running it once only trims leading silence, so the standard approach is
 * to apply it, reverse the stream, apply it again, and reverse back — which
 * catches trailing silence too. The middle pass with stop_periods=-1 strips
 * silent gaps throughout.
 */

export async function POST(request: NextRequest) {
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

    tempDir = await createTempDir("audio-silence");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, "trimmed.mp3");

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
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputPath,
    ]);

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}-silence-removed.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}