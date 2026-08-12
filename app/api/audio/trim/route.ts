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
  ".ogg",
  ".aac",
  ".flac",
  ".webm",
  ".mpeg",
  ".mpga",
];

function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return ALLOWED_EXTENSIONS.some((extension) =>
    name.endsWith(extension)
  );
}

function runFFmpeg(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
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
        console.error("FFmpeg:", errorText);

        reject(
          new Error(
            "FFmpeg failed to trim the audio."
          )
        );
      }
    });
  });
}

export async function POST(request: NextRequest) {
  let tempDirectory: string | null = null;

  try {
    const formData = await request.formData();

    const fileValue = formData.get("file");
    const startValue = formData.get("start");
    const endValue = formData.get("end");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          error: "Please upload an audio file.",
        },
        {
          status: 400,
        }
      );
    }

    const file = fileValue;

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        {
          error:
            "Unsupported format. Please upload MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, or MPEG.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error: "The uploaded file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Maximum file size is 100 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const start = Number(startValue);
    const end = Number(endValue);

    if (!Number.isFinite(start)) {
      return NextResponse.json(
        {
          error: "Invalid start time.",
        },
        {
          status: 400,
        }
      );
    }

    if (!Number.isFinite(end)) {
      return NextResponse.json(
        {
          error: "Invalid end time.",
        },
        {
          status: 400,
        }
      );
    }

    if (start < 0) {
      return NextResponse.json(
        {
          error:
            "Start time cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        {
          error:
            "End time must be greater than start time.",
        },
        {
          status: 400,
        }
      );
    }

    const duration = end - start;

    if (duration < 0.1) {
      return NextResponse.json(
        {
          error:
            "Please select at least 0.1 seconds.",
        },
        {
          status: 400,
        }
      );
    }

    tempDirectory = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "audio-trimmer-"
      )
    );

    const extension =
      path.extname(file.name).toLowerCase() ||
      ".audio";

    const inputPath = path.join(
      tempDirectory,
      `input${extension}`
    );

    const outputPath = path.join(
      tempDirectory,
      "trimmed.mp3"
    );

    const arrayBuffer =
      await file.arrayBuffer();

    await fs.writeFile(
      inputPath,
      Buffer.from(arrayBuffer)
    );

    await runFFmpeg(
      inputPath,
      outputPath,
      start,
      duration
    );

    const outputBuffer =
      await fs.readFile(outputPath);

    if (outputBuffer.length === 0) {
      throw new Error(
        "The trimmed audio file is empty."
      );
    }

    const originalName = path.parse(
      file.name
    ).name;

    const safeName =
      originalName
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 80) || "audio";

    const filename =
      `${safeName}-trimmed.mp3`;

    return new NextResponse(
      new Uint8Array(outputBuffer),
      {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition":
            `attachment; filename="${filename}"`,
          "Content-Length":
            outputBuffer.length.toString(),
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Audio trimmer error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to trim audio.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (tempDirectory) {
      try {
        await fs.rm(
          tempDirectory,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (error) {
        console.error(
          "Temporary cleanup error:",
          error
        );
      }
    }
  }
}