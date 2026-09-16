// Route: POST /api/video/audio-video-merger
//
// Accepts multipart/form-data with:
//   video   - File  (required)
//   audio   - File  (required)
//   mode    - "replace" | "mix"   (optional, default "replace")
//   format  - "mp4" | "mov" | "mkv" | "webm" | "avi" | "flv"  (optional, default "mp4")
//
// Returns the merged file as a binary response with a Content-Disposition
// attachment header, or a JSON { error } body on failure.
//
// Requires ffmpeg to be available. Every call goes through runFFmpeg() from
// lib/server/media, which resolves the bundled binary (or PATH), passes an
// argument array rather than a shell string, and enforces a timeout.
//
// This route must run on the Node.js runtime (not Edge) because it spawns
// a child process and touches the filesystem.

import path from "node:path";
import { NextRequest } from "next/server";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
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
import {
  parseQuality,
  videoQualityOverride,
  type QualityLevel,
} from "@/lib/server/quality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Merging is CPU/time-bound, not edge-friendly. If you deploy to a
// serverless host (e.g. Vercel), raise this to whatever your plan allows,
// and check that host's request-body size limit for large video uploads —
// you may need to self-host this route or move to a signed-upload flow for
// big files.
export const maxDuration = 120;

type MergeMode = "replace" | "mix";

const ALLOWED_FORMATS = ["mp4", "mov", "mkv", "webm", "avi", "flv"] as const;
type OutputFormat = (typeof ALLOWED_FORMATS)[number];

const FORMAT_SETTINGS: Record<
  OutputFormat,
  { contentType: string; codecArgs: string[] }
> = {
  mp4: {
    contentType: "video/mp4",
    codecArgs: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k"],
  },
  mov: {
    contentType: "video/quicktime",
    codecArgs: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k"],
  },
  mkv: {
    contentType: "video/x-matroska",
    codecArgs: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k"],
  },
  webm: {
    contentType: "video/webm",
    codecArgs: ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-c:a", "libopus", "-b:a", "160k"],
  },
  avi: {
    contentType: "video/x-msvideo",
    codecArgs: ["-c:v", "mpeg4", "-qscale:v", "4", "-c:a", "libmp3lame", "-b:a", "192k"],
  },
  flv: {
    contentType: "video/x-flv",
    codecArgs: ["-c:v", "flv", "-c:a", "aac", "-b:a", "160k"],
  },
};

function isAllowedFormat(value: string): value is OutputFormat {
  return (ALLOWED_FORMATS as readonly string[]).includes(value);
}

function buildArgs(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  mode: MergeMode,
  format: OutputFormat,
  quality: QualityLevel,
): string[] {
  const base = FORMAT_SETTINGS[format].codecArgs;

  // Appended once here so both the mix and replace branches below get it.
  const codecArgs = [...base, ...videoQualityOverride(base, quality)];

  if (mode === "mix") {
    // Blend the video's own audio track with the new audio track.
    // Requires the video to actually have an audio stream — if it's
    // silent/video-only, use "replace" mode instead.
    return [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-filter_complex",
      "[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2[aout]",
      "-map", "0:v:0",
      "-map", "[aout]",
      ...codecArgs,
      "-shortest",
      outputPath,
    ];
  }

  // "replace" — keep the video's picture, swap in the new audio track.
  return [
    "-y",
    "-i", videoPath,
    "-i", audioPath,
    "-map", "0:v:0",
    "-map", "1:a:0",
    ...codecArgs,
    "-shortest",
    outputPath,
  ];
}

export async function POST(req: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tempDir: string | null = null;

  try {
    const formData = await req.formData();

    const video = validateUpload(formData.get("video"), {
      allowed: VIDEO_EXTENSIONS,
      maxBytes: MAX_VIDEO_BYTES,
      label: "video file",
    });

    const audio = validateUpload(formData.get("audio"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const modeRaw = (formData.get("mode") as string | null) ?? "replace";
    const formatRaw = ((formData.get("format") as string | null) ?? "mp4").toLowerCase();

    if (modeRaw !== "replace" && modeRaw !== "mix") {
      throw new MediaError('Invalid mode. Use "replace" or "mix".');
    }
    const mode: MergeMode = modeRaw;

    if (!isAllowedFormat(formatRaw)) {
      throw new MediaError(
        `Unsupported format. Choose one of: ${ALLOWED_FORMATS.join(", ")}.`
      );
    }
    const format: OutputFormat = formatRaw;
    const quality = parseQuality(formData.get("quality"));

    tempDir = await createTempDir("audio-video-merger");

    const videoPath = await writeUpload(tempDir, video, "input-video");
    const audioPath = await writeUpload(tempDir, audio, "input-audio");
    const outputPath = path.join(tempDir, `output.${format}`);

    await runFFmpeg(
      buildArgs(videoPath, audioPath, outputPath, mode, format, quality)
    );

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: video.file.name,
      sizeBytes: video.file.size + audio.file.size,
      kind: "video",
      tool: "Audio video merger",
    });

    return await fileResponse(outputPath, {
      contentType: FORMAT_SETTINGS[format].contentType,
      downloadName: `merged.${format}`,
    });
  } catch (err) {
    // errorResponse keeps ffmpeg stderr and server temp paths server-side;
    // this route used to hand the client err.message verbatim.
    return errorResponse(err);
  } finally {
    await cleanupTempDir(tempDir);
  }
}