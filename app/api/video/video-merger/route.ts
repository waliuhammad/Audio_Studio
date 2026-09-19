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
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import { videoQualityOverride, parseQuality } from "@/lib/server/quality";

export const runtime = "nodejs";

/* =========================================================
   CONFIG
========================================================= */

const MIN_VIDEOS = 2;
const MAX_VIDEOS = 5;

type FormatKey = "mp4" | "webm" | "mov" | "mkv" | "avi" | "ts";

interface FormatSpec {
  ext: FormatKey;
  contentType: string;
  videoCodec: string[];
  audioCodec: string[];
  containerArgs: string[];
}

// Same 6 formats offered in the UI dropdown.
const FORMAT_SPECS: Record<FormatKey, FormatSpec> = {
  mp4: {
    ext: "mp4",
    contentType: "video/mp4",
    videoCodec: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"],
    audioCodec: ["-c:a", "aac", "-b:a", "192k"],
    containerArgs: ["-movflags", "+faststart"],
  },
  webm: {
    ext: "webm",
    contentType: "video/webm",
    videoCodec: ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0"],
    audioCodec: ["-c:a", "libopus", "-b:a", "160k"],
    containerArgs: [],
  },
  mov: {
    ext: "mov",
    contentType: "video/quicktime",
    videoCodec: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"],
    audioCodec: ["-c:a", "aac", "-b:a", "192k"],
    containerArgs: [],
  },
  mkv: {
    ext: "mkv",
    contentType: "video/x-matroska",
    videoCodec: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"],
    audioCodec: ["-c:a", "aac", "-b:a", "192k"],
    containerArgs: [],
  },
  avi: {
    ext: "avi",
    contentType: "video/x-msvideo",
    videoCodec: ["-c:v", "mpeg4", "-q:v", "4"],
    audioCodec: ["-c:a", "libmp3lame", "-b:a", "192k"],
    containerArgs: [],
  },
  ts: {
    ext: "ts",
    contentType: "video/mp2t",
    videoCodec: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"],
    audioCodec: ["-c:a", "aac", "-b:a", "192k"],
    containerArgs: ["-mpegts_flags", "+resend_headers"],
  },
};

/*
 * Videos are normalized to one resolution and frame rate before
 * concatenation, so clips with mismatched dimensions or codecs can still be
 * joined. The size is the one the page offers; anything else falls back to
 * 720p, which is what this route always produced before.
 */
const RESOLUTIONS: Record<string, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
  "360p": { width: 640, height: 360 },
};

const DEFAULT_RESOLUTION = "720p";
const NORMALIZED_FPS = 30;

/* =========================================================
   ROUTE HANDLER
========================================================= */

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let workDir: string | null = null;

  try {
    const formData = await request.formData();

    const entries = formData.getAll("videos");

    const rawFormat = (formData.get("format") as string | null) || "mp4";
    const format = rawFormat.toLowerCase() as FormatKey;
    const quality = parseQuality(formData.get("quality"));

    const rawResolution = String(
      formData.get("resolution") ?? DEFAULT_RESOLUTION
    ).toLowerCase();

    const size = RESOLUTIONS[rawResolution] ?? RESOLUTIONS[DEFAULT_RESOLUTION]!;

    if (!(format in FORMAT_SPECS)) {
      throw new MediaError(
        `Unsupported output format. Choose one of: ${Object.keys(FORMAT_SPECS).join(", ")}.`
      );
    }

    // Counted before anything is validated or written: concatenation cost
    // grows with every input, so the cap is what stops one request from
    // queueing an unbounded amount of encoding.
    if (entries.length < MIN_VIDEOS || entries.length > MAX_VIDEOS) {
      throw new MediaError(
        `Please provide between ${MIN_VIDEOS} and ${MAX_VIDEOS} videos to merge.`
      );
    }

    const uploads = entries.map((entry) =>
      validateUpload(entry, {
        allowed: VIDEO_EXTENSIONS,
        maxBytes: MAX_VIDEO_BYTES,
        label: "video file",
      })
    );

    // Stage uploads to a scratch directory
    workDir = await createTempDir("video-merger");

    const inputPaths: string[] = [];
    for (const [i, upload] of uploads.entries()) {
      inputPaths.push(await writeUpload(workDir, upload, `input-${i}`));
    }

    const spec = FORMAT_SPECS[format];
    const outputPath = path.join(workDir, `merged.${spec.ext}`);

    // Build a filter_complex chain: normalize every input's video (scale,
    // pad, fps) and audio (sample rate, channel layout) so mismatched
    // sources can be concatenated safely, then join with the concat filter.
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    inputPaths.forEach((_, i) => {
      filterParts.push(
        `[${i}:v:0]scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,` +
          `pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2,` +
          `setsar=1,fps=${NORMALIZED_FPS}[v${i}]`
      );
      filterParts.push(
        `[${i}:a:0]aresample=48000,aformat=channel_layouts=stereo[a${i}]`
      );
      concatInputs.push(`[v${i}][a${i}]`);
    });

    const filterComplex =
      filterParts.join(";") +
      `;${concatInputs.join("")}concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`;

    const args: string[] = ["-y"];
    inputPaths.forEach((p) => {
      args.push("-i", p);
    });
    args.push(
      "-filter_complex",
      filterComplex,
      "-map",
      "[outv]",
      "-map",
      "[outa]",
      ...spec.videoCodec,
      ...spec.audioCodec,
      ...spec.containerArgs,
      ...videoQualityOverride([...spec.videoCodec, ...spec.audioCodec], quality),
      outputPath
    );

    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: `${uploads.length} video files`,
      sizeBytes: uploads.reduce((total, upload) => total + upload.file.size, 0),
      kind: "video",
      tool: "Video merger",
    });

    return await fileResponse(outputPath, {
      contentType: spec.contentType,
      downloadName: `merged-video.${spec.ext}`,
    });
  } catch (error) {
    // errorResponse keeps ffmpeg stderr and server temp paths server-side;
    // this route used to hand the client error.message verbatim.
    return errorResponse(error);
  } finally {
    await cleanupTempDir(workDir);
  }
}