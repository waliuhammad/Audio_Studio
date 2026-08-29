import { NextRequest } from "next/server";
import path from "path";
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

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    // Bounded: an unbounded multiplier could produce a destructive gain value.
    const volume = parseNumber(formData.get("volume"), {
      min: 0,
      max: 4,
      fallback: 1,
      label: "volume",
    });

    tempDir = await createTempDir("audio-player");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, "processed.mp3");

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-filter:a",
      `volume=${volume}`,
      "-vn",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Audio player",
    });

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}-vol${volume}.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}