// app/api/audio/normalize/route.ts
import { NextRequest } from "next/server";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  parseNumber,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tempDirectory: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    /*
     * Bounded to the range loudnorm accepts for integrated loudness.
     *
     * This value is interpolated into the filtergraph, so it must be a
     * number and nothing else. Passing the raw form string through would
     * let a value like "-14:TP=0,areverse" close the loudnorm options and
     * append filters of the caller's choosing — the arguments never reach
     * a shell, but FFmpeg still parses the filter chain itself.
     */
    const targetLevel = parseNumber(formData.get("targetLevel"), {
      min: -70,
      max: -5,
      fallback: -14,
      label: "Target level",
    });

    tempDirectory = await createTempDir("audio-normalize");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, "normalized.mp3");

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-af",
      `loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`,
      "-vn",
      "-ar",
      "44100",
      "-b:a",
      "192k",
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt);

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}_normalized.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}