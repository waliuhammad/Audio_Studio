// app/api/audio/fade/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { recordUsage } from "@/lib/server/usage";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  let tempInputPath = "";
  let tempOutputPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fadeIn = parseFloat((formData.get("fadeIn") as string) || "0");
    const fadeOut = parseFloat((formData.get("fadeOut") as string) || "0");
    const totalDuration = parseFloat((formData.get("duration") as string) || "0");

    if (!file) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpDir = os.tmpdir();
    const uniqueId = Date.now() + "-" + Math.random().toString(36).substring(2, 9);
    
    tempInputPath = path.join(tmpDir, `input-fade-${uniqueId}${path.extname(file.name) || ".mp3"}`);
    tempOutputPath = path.join(tmpDir, `output-fade-${uniqueId}.mp3`);

    await fs.writeFile(tempInputPath, buffer);

    let filterParts: string[] = [];
    if (fadeIn > 0) {
      filterParts.push(`afade=t=in:st=0:d=${fadeIn}`);
    }
    if (fadeOut > 0 && totalDuration > fadeOut) {
      const startTime = Math.max(0, totalDuration - fadeOut);
      filterParts.push(`afade=t=out:st=${startTime}:d=${fadeOut}`);
    } else if (fadeOut > 0) {
      filterParts.push(`afade=t=out:st=0:d=${fadeOut}`);
    }

    const filterString = filterParts.length > 0 ? filterParts.join(",") : "anull";

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", tempInputPath,
        "-af", filterString,
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

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt);

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          path.basename(file.name, path.extname(file.name))
        )}_fade.mp3"`,
      },
    });
  } catch (err) {
    console.error("Audio fade error:", err);
    const message = err instanceof Error ? err.message : "Internal server error during fade processing.";
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