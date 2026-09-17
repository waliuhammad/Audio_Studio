// Route: POST /api/video/audio-video-merger
//
// Accepts multipart/form-data with:
//   video          File (required)
//   audio          File (required)
//   mode           "replace" | "mix"   (optional, default "replace")
//   format         "mp4" | "mov" | "mkv" | "webm" | "avi" | "flv"  (default "mp4")
//   quality        "high" | "medium" | "standard" | "low"          (default "high")
//   videoSegments  optional JSON [{ "start": s, "end": s }, ...] — the pieces of
//                  the video, in output order. Absent = the whole video.
//   audioSegments  optional JSON, same shape, over the audio file. Absent = the
//                  whole audio.
//   audioOffset    optional seconds ≥ 0 — where the audio starts on the output
//                  timeline. Absent = 0.
//
// The output is exactly as long as the video segments. Audio that runs past
// the end is cut; where there is no audio there is silence. "mix" lays the new
// audio over the video's own sound (silence if the video has none).
//
// Returns the merged file as a binary response with a Content-Disposition
// attachment header, or a JSON { error } body on failure.
//
// The argument building lives in lib/server/av-merge.ts. Every FFmpeg call
// goes through runFFmpeg() (argument array, no shell, timeout).

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
  probeMedia,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import { parseQuality } from "@/lib/server/quality";
import { MixtureInputError, readProbe } from "@/lib/server/video-mixture";
import {
  AV_MERGE_FORMATS,
  buildAvMergeArgs,
  fitTrack,
  isAvMergeFormat,
  parseOffset,
  parseTrack,
  readAudioProbe,
  trackLength,
  type AvMergeMode,
} from "@/lib/server/av-merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every segment is re-encoded; the FFmpeg job itself is capped at 5 minutes.
export const maxDuration = 300;

/** Turn the builder's user-facing errors into 400s. */
function userError<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof MixtureInputError) throw new MediaError(error.message);
    throw error;
  }
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
    const formatRaw = String(formData.get("format") || "mp4").trim().toLowerCase();

    if (modeRaw !== "replace" && modeRaw !== "mix") {
      throw new MediaError('Invalid mode. Use "replace" or "mix".');
    }
    const mode: AvMergeMode = modeRaw;

    if (!isAvMergeFormat(formatRaw)) {
      throw new MediaError(
        `Unsupported format. Choose one of: ${Object.keys(AV_MERGE_FORMATS).join(", ")}.`
      );
    }
    const format = formatRaw;
    const quality = parseQuality(formData.get("quality"));

    const requestedVideo = userError(() => parseTrack(formData.get("videoSegments"), "video"));
    const requestedAudio = userError(() => parseTrack(formData.get("audioSegments"), "audio"));
    const audioOffset = userError(() => parseOffset(formData.get("audioOffset")));

    tempDir = await createTempDir("audio-video-merger");

    const videoPath = await writeUpload(tempDir, video, "input-video");
    const audioPath = await writeUpload(tempDir, audio, "input-audio");

    const videoSource = readProbe(await probeMedia(videoPath), videoPath);
    if (!videoSource) {
      throw new MediaError(`"${video.file.name}" has no video track.`);
    }

    const audioSource = readAudioProbe(await probeMedia(audioPath), audioPath);
    if (!audioSource) {
      throw new MediaError(`"${audio.file.name}" has no audio track.`);
    }

    const videoSegments = userError(() =>
      fitTrack(requestedVideo, videoSource.duration, "video")
    );
    const audioSegments = userError(() =>
      fitTrack(requestedAudio, audioSource.duration, "audio")
    );

    const spec = AV_MERGE_FORMATS[format];
    const outputPath = path.join(tempDir, `output.${spec.ext}`);

    const args = userError(() =>
      buildAvMergeArgs({
        video: videoSource,
        audio: audioSource,
        videoSegments,
        audioSegments,
        audioOffset,
        mode,
        format,
        quality,
        outputPath,
      })
    );

    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: video.file.name,
      sizeBytes: video.file.size + audio.file.size,
      kind: "video",
      tool: "Audio video merger",
      durationSeconds: trackLength(videoSegments),
    });

    return await fileResponse(outputPath, {
      contentType: spec.contentType,
      downloadName: `merged.${spec.ext}`,
    });
  } catch (err) {
    // errorResponse keeps ffmpeg stderr and server temp paths server-side.
    return errorResponse(err);
  } finally {
    await cleanupTempDir(tempDir);
  }
}
