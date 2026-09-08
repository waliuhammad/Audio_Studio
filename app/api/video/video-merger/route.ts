import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { ffmpegBinaryPath } from "@/lib/server/media";

export const runtime = "nodejs";

/* =========================================================
   CONFIG
========================================================= */

const MIN_VIDEOS = 2;
const MAX_VIDEOS = 5;
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB per file

/*
 * The local copy of this resolution carried an eslint-disable for
 * @typescript-eslint/no-var-requires, a rule this project does not configure —
 * and ESLint treats a disable for an unknown rule as an error, which is fatal
 * to `next build`. Rather than delete the comment, this now uses the resolver
 * every other route already shares, which additionally checks the resolved
 * path actually exists before trusting it and warns when falling back to PATH.
 */
const FFMPEG_PATH = ffmpegBinaryPath();

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

// Videos are normalized to this resolution/frame rate before concatenation
// so files with mismatched dimensions or codecs can still be joined.
const NORMALIZED_WIDTH = 1280;
const NORMALIZED_HEIGHT = 720;
const NORMALIZED_FPS = 30;

/* =========================================================
   HELPERS
========================================================= */

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args);

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(
        new Error(
          `Could not start ffmpeg (${err.message}). Make sure ffmpeg is installed or the "ffmpeg-static" package is added to the project.`
        )
      );
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
      }
    });
  });
}

async function cleanupDir(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // best effort cleanup — ignore errors
  }
}

/* =========================================================
   ROUTE HANDLER
========================================================= */

export async function POST(request: NextRequest) {
  let workDir: string | null = null;

  try {
    const formData = await request.formData();

    const files = formData
      .getAll("videos")
      .filter((entry): entry is File => entry instanceof File);

    const rawFormat = (formData.get("format") as string | null) || "mp4";
    const format = rawFormat.toLowerCase() as FormatKey;

    if (!(format in FORMAT_SPECS)) {
      return NextResponse.json(
        { error: `Unsupported output format: ${rawFormat}` },
        { status: 400 }
      );
    }

    if (files.length < MIN_VIDEOS || files.length > MAX_VIDEOS) {
      return NextResponse.json(
        {
          error: `Please provide between ${MIN_VIDEOS} and ${MAX_VIDEOS} videos to merge.`,
        },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `${file.name} exceeds the 500 MB per-file limit.` },
          { status: 400 }
        );
      }
    }

    // Stage uploads to a scratch directory
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-merger-"));

    const inputPaths: string[] = [];
    for (const [i, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const inputPath = path.join(workDir, `input-${i}${path.extname(file.name) || ""}`);
      await fs.writeFile(inputPath, buffer);
      inputPaths.push(inputPath);
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
        `[${i}:v:0]scale=${NORMALIZED_WIDTH}:${NORMALIZED_HEIGHT}:force_original_aspect_ratio=decrease,` +
          `pad=${NORMALIZED_WIDTH}:${NORMALIZED_HEIGHT}:(ow-iw)/2:(oh-ih)/2,` +
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
      outputPath
    );

    await runFfmpeg(args);

    const mergedBuffer = await fs.readFile(outputPath);

    return new NextResponse(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: {
        "Content-Type": spec.contentType,
        "Content-Disposition": `attachment; filename="merged-video.${spec.ext}"`,
      },
    });
  } catch (error) {
    console.error("Video merge failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not merge those videos. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    if (workDir) {
      await cleanupDir(workDir);
    }
  }
}