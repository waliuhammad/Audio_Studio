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
// Requires ffmpeg to be available. This uses the "ffmpeg-static" package,
// which bundles a prebuilt ffmpeg binary for Windows/macOS/Linux so you
// don't need ffmpeg installed system-wide:
//
//   npm install ffmpeg-static
//
// This route must run on the Node.js runtime (not Edge) because it spawns
// a child process and touches the filesystem.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
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

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary not found. Run: npm install ffmpeg-static"));
      return;
    }

    const proc = spawn(ffmpegPath as string, args);
    let stderr = "";

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
      }
    });
  });
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await req.formData();

    const video = formData.get("video");
    const audio = formData.get("audio");
    const modeRaw = (formData.get("mode") as string | null) ?? "replace";
    const formatRaw = ((formData.get("format") as string | null) ?? "mp4").toLowerCase();

    if (!(video instanceof File) || !(audio instanceof File)) {
      return NextResponse.json(
        { error: "Both a video file and an audio file are required." },
        { status: 400 },
      );
    }

    if (modeRaw !== "replace" && modeRaw !== "mix") {
      return NextResponse.json(
        { error: 'Invalid mode. Use "replace" or "mix".' },
        { status: 400 },
      );
    }
    const mode: MergeMode = modeRaw;

    if (!isAllowedFormat(formatRaw)) {
      return NextResponse.json(
        {
          error: `Unsupported format "${formatRaw}". Choose one of: ${ALLOWED_FORMATS.join(", ")}.`,
        },
        { status: 400 },
      );
    }
    const format: OutputFormat = formatRaw;
    const quality = parseQuality(formData.get("quality"));

    tempDir = await mkdtemp(path.join(tmpdir(), "audio-video-merger-"));

    const videoExt = path.extname(video.name) || ".mp4";
    const audioExt = path.extname(audio.name) || ".mp3";
    const videoPath = path.join(tempDir, `input-video-${randomUUID()}${videoExt}`);
    const audioPath = path.join(tempDir, `input-audio-${randomUUID()}${audioExt}`);
    const outputPath = path.join(tempDir, `output-${randomUUID()}.${format}`);

    await writeFile(videoPath, Buffer.from(await video.arrayBuffer()));
    await writeFile(audioPath, Buffer.from(await audio.arrayBuffer()));

    await runFfmpeg(
      buildArgs(videoPath, audioPath, outputPath, mode, format, quality)
    );

    const output = await readFile(outputPath);

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": FORMAT_SETTINGS[format].contentType,
        "Content-Disposition": `attachment; filename="merged.${format}"`,
        "Content-Length": String(output.length),
      },
    });
  } catch (err) {
    console.error("[audio-video-merger] merge failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Merge failed." },
      { status: 500 },
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}