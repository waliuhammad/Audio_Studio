// app/api/audio/fade/route.ts
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
import path from "path";

export const runtime = "nodejs";

/** Longest fade we will apply, in seconds. */
const MAX_FADE_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  let tempDirectory: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const fadeIn = parseNumber(formData.get("fadeIn"), {
      min: 0,
      max: MAX_FADE_SECONDS,
      fallback: 0,
      label: "Fade in",
    });

    const fadeOut = parseNumber(formData.get("fadeOut"), {
      min: 0,
      max: MAX_FADE_SECONDS,
      fallback: 0,
      label: "Fade out",
    });

    const totalDuration = parseNumber(formData.get("duration"), {
      min: 0,
      max: 24 * 60 * 60,
      fallback: 0,
      label: "Duration",
    });

    /*
     * Filter values are built from numbers this route parsed itself, never
     * from raw form strings — an unchecked value here would be appended to
     * the filtergraph and could rewrite the whole chain.
     */
    const filterParts: string[] = [];

    if (fadeIn > 0) {
      filterParts.push(`afade=t=in:st=0:d=${fadeIn}`);
    }

    if (fadeOut > 0) {
      const startTime =
        totalDuration > fadeOut ? totalDuration - fadeOut : 0;

      filterParts.push(`afade=t=out:st=${startTime}:d=${fadeOut}`);
    }

    const filterString =
      filterParts.length > 0 ? filterParts.join(",") : "anull";

    tempDirectory = await createTempDir("audio-fade");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, "faded.mp3");

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-af",
      filterString,
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
      downloadName: `${upload.baseName}_fade.mp3`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}