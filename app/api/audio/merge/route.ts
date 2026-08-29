import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import { runFFmpeg } from "@/lib/server/media";

/*
 * Resolved once, not hardcoded to "ffmpeg".
 *
 * This route spawns FFmpeg itself instead of going through runFFmpeg(), so it
 * missed the binary resolution the rest of the app uses and looked for ffmpeg
 * on PATH. There is none in the deployed image — the binary ships as an npm
 * dependency — so merge was the one tool still answering "FFmpeg is not
 * installed" in production while every other tool worked.
 */
/*
 * Every FFmpeg call goes through runFFmpeg().
 *
 * This route used to promisify execFile and spawn the binary itself, which is
 * why it kept missing changes made centrally — most recently the switch to a
 * bundled binary, which left merge as the only tool still reporting "FFmpeg is
 * not installed" in production while every other tool worked.
 *
 * Going through the shared helper means binary resolution, the processing
 * timeout and the argument-array safety are inherited rather than
 * reimplemented, and the next change lands here automatically.
 */
async function checkFFmpeg(): Promise<boolean> {
  try {
    await runFFmpeg(["-version"]);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tmpDir: string | null = null;

  try {
    const hasFFmpeg = await checkFFmpeg();
    if (!hasFFmpeg) {
      return NextResponse.json(
        { error: "FFmpeg is not installed or is not available on the server." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const startTimes = formData.getAll("startTimes") as string[];
    const endTimes = formData.getAll("endTimes") as string[];

    if (!files || files.length < 2) {
      return NextResponse.json(
        { error: "At least 2 audio files are required for merging." },
        { status: 400 }
      );
    }

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "audio-merge-"));
    const trimmedFilePaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const ext = path.extname(file.name) || ".mp3";
      const inputPath = path.join(tmpDir, `input_${i}${ext}`);
      const trimmedPath = path.join(tmpDir, `trimmed_${i}.mp3`);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(inputPath, buffer);

      const rawStartTime = startTimes[i];
      const rawEndTime = endTimes[i];

      const startTime = rawStartTime ? parseFloat(rawStartTime) : 0;
      const endTime = rawEndTime ? parseFloat(rawEndTime) : 0;
      const duration = endTime > startTime ? endTime - startTime : 0;

      // Trim each file individually using FFmpeg before merging
      const ffmpegArgs = ["-y", "-ss", startTime.toString()];
      if (duration > 0) {
        ffmpegArgs.push("-t", duration.toString());
      }
      ffmpegArgs.push("-i", inputPath, "-c:a", "libmp3lame", "-q:a", "2", trimmedPath);

      await runFFmpeg(ffmpegArgs);
      trimmedFilePaths.push(trimmedPath);
    }

    // Create FFmpeg concat demuxer file list for the trimmed files
    const listContent = trimmedFilePaths
      .map((p) => `file '${p.replace(/\\/g, "/")}'`)
      .join("\n");
    
    const listFilePath = path.join(tmpDir, "list.txt");
    await fs.writeFile(listFilePath, listContent, "utf8");

    const outputFilePath = path.join(tmpDir, "output.mp3");

    // Run FFmpeg concatenation on the trimmed audio segments
    await runFFmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFilePath,
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputFilePath,
    ]);

    const outputBuffer = await fs.readFile(outputFilePath);
    const uint8Array = new Uint8Array(outputBuffer);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: `${files.length} audio files`,
      sizeBytes: files.reduce((total, file) => total + file.size, 0),
      kind: "audio",
      tool: "Merge",
    });

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="audio-merged.mp3"',
      },
    });
  } catch (error: any) {
    console.error("Audio merger error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process audio merging and trimming." },
      { status: 500 }
    );
  } finally {
    if (tmpDir) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Failed to clean up temporary directory:", cleanupError);
      }
    }
  }
}