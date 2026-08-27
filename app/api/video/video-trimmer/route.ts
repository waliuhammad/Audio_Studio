import { NextRequest } from "next/server";
import path from "path";
import {
  MAX_VIDEO_BYTES,
  MediaError,
  VIDEO_EXTENSIONS,
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
      allowed: VIDEO_EXTENSIONS,
      maxBytes: MAX_VIDEO_BYTES,
      label: "video file",
    });

    const startTime = parseNumber(formData.get("startTime"), {
      min: 0,
      max: 86_400,
      fallback: 0,
      label: "start time",
    });

    const endTime = parseNumber(formData.get("endTime"), {
      min: 0,
      max: 86_400,
      label: "end time",
    });

    if (endTime <= startTime) {
      throw new MediaError("End time must be greater than the start time.");
    }

    const duration = endTime - startTime;

    if (duration < 0.1) {
      throw new MediaError("Select at least 0.1 seconds.");
    }

    tempDir = await createTempDir("video-trim");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, "trimmed.mp4");

    await runFFmpeg([
      "-y",
      // Fast seek before -i, then exact duration after.
      "-ss",
      String(startTime),
      "-i",
      inputPath,
      "-t",
      String(duration),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt);

    return await fileResponse(outputPath, {
      contentType: "video/mp4",
      downloadName: `${upload.baseName}-trimmed.mp4`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}