import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".m4r",
  ".aac",
  ".ogg",
  ".flac",
  ".webm",
  ".mpeg",
  ".mpga",
];

function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function getOutputFormat(format: string) {
  const normalizedFormat = format?.toLowerCase() || "mp3";

  if (normalizedFormat === "wav") {
    return {
      extension: "wav",
      mimeType: "audio/wav",
      ffmpegArgs: ["-vn", "-c:a", "pcm_s16le", "-ar", "44100"],
    };
  }

  if (normalizedFormat === "m4r") {
    return {
      extension: "m4r",
      mimeType: "audio/mp4",
      ffmpegArgs: [
        "-vn",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        "-ar",
        "44100",
        "-b:a",
        "192k",
      ],
    };
  }

  return {
    extension: "mp3",
    mimeType: "audio/mpeg",
    ffmpegArgs: ["-vn", "-c:a", "libmp3lame", "-q:a", "2", "-ar", "44100"],
  };
}

function runFFmpeg(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
  format: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { ffmpegArgs } = getOutputFormat(format);

    const args = [
      "-y",
      "-ss",
      String(start),
      "-i",
      inputPath,
      "-t",
      String(duration),
      ...ffmpegArgs,
      outputPath,
    ];

    const process = spawn("ffmpeg", args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let errorText = "";

    if (process.stderr) {
      process.stderr.on("data", (data) => {
        errorText += data.toString();
      });
    }

    process.on("error", (error) => {
      reject(
        new Error(
          `FFmpeg could not start. Make sure FFmpeg is installed and available in PATH. ${error.message}`
        )
      );
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error("Ringtone FFmpeg error:", errorText);
        reject(new Error("FFmpeg failed to generate the ringtone."));
      }
    });
  });
}

export async function POST(req: NextRequest) {
  let tempDirectory: string | null = null;

  try {
    const formData = await req.formData();
    const fileValue = formData.get("file");
    const startValue = formData.get("startTime");
    const endValue = formData.get("endTime");
    const formatValue = formData.get("format");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Please upload an audio file first." },
        { status: 400 }
      );
    }

    const file = fileValue;

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        {
          error:
            "Unsupported format. Please upload MP3, WAV, M4A, M4R, OGG, AAC, FLAC, WEBM, or MPEG.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The selected file is too large. Maximum size is 100 MB." },
        { status: 400 }
      );
    }

    const start = Number(startValue);
    const end = Number(endValue);
    const format = typeof formatValue === "string" ? formatValue : "mp3";

    if (!Number.isFinite(start)) {
      return NextResponse.json({ error: "Invalid start time." }, { status: 400 });
    }

    if (!Number.isFinite(end)) {
      return NextResponse.json({ error: "Invalid end time." }, { status: 400 });
    }

    if (start < 0) {
      return NextResponse.json({ error: "Start time cannot be negative." }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be greater than the start time." },
        { status: 400 }
      );
    }

    const duration = end - start;

    if (duration < 0.1) {
      return NextResponse.json(
        { error: "Please select at least 0.1 seconds for the ringtone." },
        { status: 400 }
      );
    }

    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ringtone-maker-"));
    const inputExtension = path.extname(file.name).toLowerCase() || ".audio";
    const inputPath = path.join(tempDirectory, `input${inputExtension}`);
    const outputFormat = getOutputFormat(format);
    const outputPath = path.join(
      tempDirectory,
      `ringtone.${outputFormat.extension}`
    );

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    await runFFmpeg(inputPath, outputPath, start, duration, format);

    const outputBuffer = await fs.readFile(outputPath);

    if (outputBuffer.length === 0) {
      throw new Error("The generated ringtone is empty.");
    }

    const originalName = path.parse(file.name).name;
    const safeName = originalName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "ringtone";
    const outputName = `${safeName}-ringtone.${outputFormat.extension}`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": outputFormat.mimeType,
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Content-Length": outputBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Ringtone generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create the ringtone.",
      },
      { status: 500 }
    );
  } finally {
    if (tempDirectory) {
      try {
        await fs.rm(tempDirectory, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Temporary ringtone cleanup error:", cleanupError);
      }
    }
  }
}
