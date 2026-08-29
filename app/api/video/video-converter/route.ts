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
  parseChoice,
  parseNumber,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const FORMATS = ["mp4", "webm", "mov", "mkv", "avi", "gif"] as const;
type Format = (typeof FORMATS)[number];

const ENCODERS: Record<Format, { args: string[]; contentType: string }> = {
  mp4: {
    args: ["-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac"],
    contentType: "video/mp4",
  },
  webm: {
    args: ["-c:v", "libvpx-vp9", "-b:v", "1M", "-c:a", "libopus"],
    contentType: "video/webm",
  },
  mov: {
    args: ["-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac"],
    contentType: "video/quicktime",
  },
  mkv: {
    args: ["-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac"],
    contentType: "video/x-matroska",
  },
  avi: {
    args: ["-c:v", "mpeg4", "-c:a", "libmp3lame"],
    contentType: "video/x-msvideo",
  },
  gif: {
    args: [
      "-vf",
      // Two-pass palette gives far better colour than default quantisation.
      "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
      "-loop",
      "0",
      "-an",
    ],
    contentType: "image/gif",
  },
};

/** GIF output is uncompressed-ish and balloons fast — cap the clip length. */
const MAX_GIF_SECONDS = 30;

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

    const format = parseChoice(formData.get("format"), FORMATS, "mp4");
    const encoder = ENCODERS[format];

    const startTime = parseNumber(formData.get("startTime"), {
      min: 0,
      max: 86_400,
      fallback: 0,
      label: "start time",
    });

    const rawEnd = formData.get("endTime");
    const hasEnd = rawEnd !== null && rawEnd !== "";

    const endTime = hasEnd
      ? parseNumber(rawEnd, {
        min: 0,
        max: 86_400,
        label: "end time",
      })
      : null;

    if (endTime !== null && endTime <= startTime) {
      throw new MediaError("End time must be greater than the start time.");
    }

    const duration = endTime !== null ? endTime - startTime : null;

    if (format === "gif" && (duration === null || duration > MAX_GIF_SECONDS)) {
      throw new MediaError(
        `GIF clips are limited to ${MAX_GIF_SECONDS} seconds. Select a shorter range.`
      );
    }

    tempDir = await createTempDir("video-convert");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `converted.${format}`);

    // -ss before -i seeks fast; -t after -i bounds the copied duration.
    const args = ["-y", "-ss", String(startTime), "-i", inputPath];

    if (duration !== null) {
      args.push("-t", String(duration));
    }

    args.push(...encoder.args, outputPath);

    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "video",
      tool: "Video converter",
    });

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