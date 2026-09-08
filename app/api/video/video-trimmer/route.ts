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

const VIDEO_FORMATS = {
  mp4: {
    extension: "mp4",
    contentType: "video/mp4",
    codecArgs: ["-c:v", "libx264", "-c:a", "aac"],
  },
  webm: {
    extension: "webm",
    contentType: "video/webm",
    codecArgs: ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
  },
  mov: {
    extension: "mov",
    contentType: "video/quicktime",
    codecArgs: ["-c:v", "libx264", "-c:a", "aac"],
  },
  mkv: {
    extension: "mkv",
    contentType: "video/x-matroska",
    codecArgs: ["-c:v", "libx264", "-c:a", "aac"],
  },
  avi: {
    extension: "avi",
    contentType: "video/x-msvideo",
    codecArgs: ["-c:v", "mpeg4", "-c:a", "libmp3lame"],
  },
  ts: {
    extension: "ts",
    contentType: "video/mp2t",
    codecArgs: ["-c:v", "libx264", "-c:a", "aac"],
  },
} as const;

type VideoFormat = keyof typeof VIDEO_FORMATS;

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();

  if (isRefused(access)) {
    return access;
  }

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
      throw new MediaError(
        "End time must be greater than the start time."
      );
    }

    const duration = endTime - startTime;

    if (duration < 0.1) {
      throw new MediaError("Select at least 0.1 seconds.");
    }

    /*
     * Output format.
     *
     * The frontend sends:
     * mp4, webm, mov, mkv, avi, or ts
     *
     * MP4 is used when no format is supplied.
     */
    const requestedFormat = String(
      formData.get("format") || "mp4"
    )
      .trim()
      .toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(
      VIDEO_FORMATS,
      requestedFormat
    )) {
      throw new MediaError("Unsupported video format.");
    }

    const format = requestedFormat as VideoFormat;
    const formatConfig = VIDEO_FORMATS[format];

    tempDir = await createTempDir("video-trim");

    const inputPath = await writeUpload(tempDir, upload);

    const outputPath = path.join(
      tempDir,
      `trimmed.${formatConfig.extension}`
    );

    /*
     * Build FFmpeg arguments.
     *
     * We keep the existing fast-seek behavior:
     * -ss before -i
     * -t after -i
     */
    const ffmpegArgs: string[] = [
      "-y",
      "-ss",
      String(startTime),
      "-i",
      inputPath,
      "-t",
      String(duration),
      ...formatConfig.codecArgs,
    ];

    /*
     * Encoding preset.
     *
     * libx264 supports veryfast.
     * VP9 does not use the x264 preset, so WebM is handled separately.
     */
    if (format !== "webm") {
      ffmpegArgs.push("-preset", "veryfast");
    }

    /*
     * +faststart is appropriate for MP4 and MOV.
     * It should not be applied to every container.
     */
    if (format === "mp4" || format === "mov") {
      ffmpegArgs.push("-movflags", "+faststart");
    }

    ffmpegArgs.push(outputPath);

    await runFFmpeg(ffmpegArgs);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "video",
      tool: "Video trimmer",
    });

    return await fileResponse(outputPath, {
      contentType: formatConfig.contentType,
      downloadName: `${upload.baseName}-trimmed.${formatConfig.extension}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}