import { NextRequest, NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const startTime = parseFloat(formData.get("startTime") as string) || 0;
    const endTime = parseFloat(formData.get("endTime") as string) || 0;

    if (!file) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    inputPath = path.join(tempDir, `input-${Date.now()}-${file.name}`);
    outputPath = path.join(tempDir, `output-${Date.now()}-${file.name}`);

    fs.writeFileSync(inputPath, buffer);

    return await new Promise<Response>((resolve) => {
      ffmpeg(inputPath!)
        // Frame-accurate output seeking & exact timestamps
        .outputOptions([
          `-ss ${startTime}`,
          `-to ${endTime}`,
          "-c:v libx264",
          "-c:a aac",
          "-strict experimental"
        ])
        .save(outputPath!)
        .on("end", () => {
          try {
            const outputBuffer = fs.readFileSync(outputPath!);

            // Cleanup temp files
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            resolve(
              new NextResponse(outputBuffer, {
                status: 200,
                headers: {
                  "Content-Type": file.type || "video/mp4",
                  "Content-Disposition": `attachment; filename="trimmed-${file.name}"`,
                },
              })
            );
          } catch (readErr) {
            resolve(
              NextResponse.json({ error: "Failed to read trimmed output file." }, { status: 500 })
            );
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg processing error:", err);
          
          // Cleanup temp files on error
          if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

          resolve(
            NextResponse.json({ error: "Video trimming failed: " + err.message }, { status: 500 })
          );
        });
    });
  } catch (error: any) {
    console.error("Server error:", error);
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}