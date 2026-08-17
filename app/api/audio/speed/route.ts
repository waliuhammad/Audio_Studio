// app/api/audio/speed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  let tempInputPath = "";
  let tempOutputPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const speedVal = parseFloat((formData.get("speed") as string) || "1.0");

    if (!file) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    if (isNaN(speedVal) || speedVal <= 0) {
      return NextResponse.json({ error: "Invalid speed multiplier." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpDir = os.tmpdir();
    const uniqueId = Date.now() + "-" + Math.random().toString(36).substring(2, 9);
    
    tempInputPath = path.join(tmpDir, `input-speed-${uniqueId}${path.extname(file.name) || ".mp3"}`);
    tempOutputPath = path.join(tmpDir, `output-speed-${uniqueId}.mp3`);

    await fs.writeFile(tempInputPath, buffer);

    let filterString = `atempo=${speedVal}`;
    if (speedVal < 0.5) {
      filterString = `atempo=0.5,atempo=${speedVal / 0.5}`;
    } else if (speedVal > 2.0) {
      filterString = `atempo=2.0,atempo=${speedVal / 2.0}`;
    }

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", tempInputPath,
        "-filter:a", filterString,
        "-vn",
        "-ar", "44100",
        "-b:a", "192k",
        tempOutputPath,
      ]);

      let errorOutput = "";

      ffmpeg.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}: ${errorOutput}`));
        }
      });
    });

    const outputBuffer = await fs.readFile(tempOutputPath);

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          path.basename(file.name, path.extname(file.name))
        )}_${speedVal}x.mp3"`,
      },
    });
  } catch (err) {
    console.error("Audio speed change error:", err);
    const message = err instanceof Error ? err.message : "Internal server error during speed processing.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempInputPath) {
      await fs.unlink(tempInputPath).catch(() => {});
    }
    if (tempOutputPath) {
      await fs.unlink(tempOutputPath).catch(() => {});
    }
  }
}