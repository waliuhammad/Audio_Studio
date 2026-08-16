// app/api/video/video-to-audio/route.ts
import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  let inputPath = "";
  let outputPath = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const format = (formData.get("format") as string) || "mp3";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueId = Date.now() + "-" + Math.random().toString(36).substring(2, 9);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    
    inputPath = join(tmpdir(), `input-${uniqueId}-${originalName}`);
    outputPath = join(tmpdir(), `output-${uniqueId}.${format}`);

    await writeFile(inputPath, buffer);

    // Run FFmpeg to extract audio
    // Ensure ffmpeg is installed on your server environment (e.g., via apt-get install ffmpeg)
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -vn -acodec ${
      format === "mp3"
        ? "libmp3lame"
        : format === "aac"
        ? "aac"
        : format === "ogg"
        ? "libvorbis"
        : format === "flac"
        ? "flac"
        : "copy"
    } "${outputPath}"`;

    await execAsync(ffmpegCommand);

    const outputBuffer = await import("fs/promises").then((fs) =>
      fs.readFile(outputPath)
    );

    // Cleanup temp input and output files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    const contentTypeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      aac: "audio/aac",
      ogg: "audio/ogg",
      flac: "audio/flac",
    };

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[format] || "audio/mpeg",
        "Content-Disposition": `attachment; filename="extracted-audio.${format}"`,
      },
    });
  } catch (error) {
    console.error("FFmpeg extraction error:", error);

    // Attempt cleanup on failure
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});

    return NextResponse.json(
      { error: "Failed to process video and extract audio." },
      { status: 500 }
    );
  }
}