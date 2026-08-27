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

/**
 * Pitch shifting WITHOUT changing duration.
 *
 * The technique: resample the audio so the pitch moves (asetrate), then
 * correct the resulting speed change back to 1x (atempo). The two cancel
 * out in duration but not in pitch.
 *
 *   ratio = 2^(semitones/12)
 *   asetrate = sampleRate * ratio   → pitch AND speed change
 *   atempo   = 1 / ratio            → speed corrected, pitch kept
 *
 * atempo only accepts 0.5–2.0 per instance, so larger corrections are
 * chained. ±12 semitones needs a ratio of 2, which is exactly at the limit.
 */

const MIN_SEMITONES = -12;
const MAX_SEMITONES = 12;

/** Decompose a tempo factor into a chain of legal atempo values. */
function buildAtempoChain(factor: number): string[] {
  const steps: string[] = [];
  let remaining = factor;

  // Peel off 2.0 / 0.5 chunks until what's left is in range.
  while (remaining > 2.0) {
    steps.push("atempo=2.0");
    remaining /= 2.0;
  }

  while (remaining < 0.5) {
    steps.push("atempo=0.5");
    remaining /= 0.5;
  }

  if (Math.abs(remaining - 1) > 0.0001) {
    steps.push(`atempo=${remaining.toFixed(6)}`);
  }

  return steps;
}

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

    const semitones = parseNumber(formData.get("semitones"), {
      min: MIN_SEMITONES,
      max: MAX_SEMITONES,
      fallback: 0,
      label: "semitones",
    });

    tempDir = await createTempDir("audio-pitch");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, "pitched.mp3");

    // Work at a fixed rate so asetrate maths is predictable.
    const baseRate = 44100;
    const ratio = Math.pow(2, semitones / 12);

    const filters = [
      `asetrate=${Math.round(baseRate * ratio)}`,
      ...buildAtempoChain(1 / ratio),
      `aresample=${baseRate}`,
    ];

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-af",
      filters.join(","),
      "-vn",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputPath,
    ]);

    const label = semitones >= 0 ? `+${semitones}` : `${semitones}`;

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt);

    return await fileResponse(outputPath, {
      contentType: "audio/mpeg",
      downloadName: `${upload.baseName}-pitch${label}st.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}