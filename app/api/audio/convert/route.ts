// app/api/audio/convert/route.ts
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
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const inputFileName = `input-${uniqueSuffix}${file.name ? `-${file.name}` : ""}`;
    inputPath = join(tmpdir(), inputFileName);

    const outputFileName = `output-${uniqueSuffix}.${format}`;
    outputPath = join(tmpdir(), outputFileName);

    await writeFile(inputPath, buffer);

    // Ensure ffmpeg is installed on your system / environment
    const ffmpegCommand = `ffmpeg -i "${inputPath}" "${outputPath}"`;
    await execAsync(ffmpegCommand);

    const outputBuffer = await import("fs/promises").then((fs) =>
      fs.readFile(outputPath)
    );

    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": `audio/${format}`,
        "Content-Disposition": `attachment; filename="converted.${format}"`,
      },
    });
  } catch (error) {
    console.error("Conversion error:", error);

    // Cleanup on error
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});

    const message = error instanceof Error ? error.message : "Conversion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}