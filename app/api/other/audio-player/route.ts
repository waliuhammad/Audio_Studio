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
    const volume = formData.get("volume") as string || "1";

    if (!file) {
      return NextResponse.json({ error: "No audio file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const inputExt = file.name.split(".").pop() || "mp3";
    inputPath = join(tmpdir(), `input-audio-${uniqueSuffix}.${inputExt}`);
    outputPath = join(tmpdir(), `output-audio-${uniqueSuffix}.mp3`);

    await writeFile(inputPath, buffer);

    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -filter:a "volume=${volume}" -c:a libmp3lame -q:a 2 "${outputPath}"`;

    await execAsync(ffmpegCmd);

    const outputBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="processed-${uniqueSuffix}.mp3"`,
      },
    });
  } catch (error: any) {
    console.error("FFmpeg audio processing error:", error);
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});
    return NextResponse.json({ error: error.message || "Audio processing failed" }, { status: 500 });
  }
}