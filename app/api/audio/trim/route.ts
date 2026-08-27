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

    tempDirectory = await createTempDir("audio-trimmer");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, "trimmed.mp3");

    await runFFmpeg([
      "-y",
      "-ss",
      String(start),
      "-i",
      inputPath,
      "-t",
      String(duration),
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt);

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}-trimmed.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}