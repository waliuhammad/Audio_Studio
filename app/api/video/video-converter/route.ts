import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  let inputPath = "";
  let outputPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const startTime = formData.get("startTime") as string || "0";
    const endTime = formData.get("endTime") as string;
    const format = (formData.get("format") as string || "mp4").toLowerCase();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const inputExt = file.name.split(".").pop() || "mp4";
    inputPath = join(tmpdir(), `input-${uniqueSuffix}.${inputExt}`);
    outputPath = join(tmpdir(), `output-${uniqueSuffix}.${format}`);

    await writeFile(inputPath, buffer);

    // Build FFmpeg command with trimming and format conversion
    let ffmpegCmd = `ffmpeg -y -ss ${startTime}`;
    if (endTime) {
      const duration = parseFloat(endTime) - parseFloat(startTime);
      if (duration > 0) {
        ffmpegCmd += ` -t ${duration}`;
      }
    }
    ffmpegCmd += ` -i "${inputPath}"`;

    // Format-specific encoding flags
    if (format === "gif") {
      ffmpegCmd += ` -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0`;
    } else if (format === "webm") {
      ffmpegCmd += ` -c:v libvpx-vp9 -c:a libopus`;
    } else if (format === "mp4") {
      ffmpegCmd += ` -c:v libx264 -c:a aac`;
    } else if (format === "mov") {
      ffmpegCmd += ` -c:v libx264 -c:a aac`;
    } else if (format === "mkv") {
      ffmpegCmd += ` -c:v libx264 -c:a aac`;
    } else if (format === "avi") {
      ffmpegCmd += ` -c:v mpeg4 -c:a libmp3lame`;
    }

    ffmpegCmd += ` "${outputPath}"`;

    await execAsync(ffmpegCmd);

    const outputBuffer = await readFile(outputPath);

    // Correct MIME type mapping
    let contentType = "video/mp4";
    if (format === "webm") contentType = "video/webm";
    else if (format === "mov") contentType = "video/quicktime";
    else if (format === "mkv") contentType = "video/x-matroska";
    else if (format === "avi") contentType = "video/x-msvideo";
    else if (format === "gif") contentType = "image/gif";

    // Cleanup temporary files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="converted-${uniqueSuffix}.${format}"`,
      },
    });
  } catch (error: any) {
    console.error("FFmpeg conversion error:", error);
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});
    return NextResponse.json({ error: error.message || "Conversion failed" }, { status: 500 });
  }
}