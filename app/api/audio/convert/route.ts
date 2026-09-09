import { NextRequest } from "next/server";
import path from "path";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  parseChoice,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { audioEncoderArgs, parseQuality } from "@/lib/server/quality";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const FORMATS = ["mp3", "wav", "aac", "flac", "ogg", "m4a"] as const;
type Format = (typeof FORMATS)[number];

/**
 * Encoder settings per format.
 *
 * Relying on FFmpeg to infer the codec from the file extension is fragile —
 * being explicit avoids silent failures (e.g. .m4a defaulting oddly).
 */
const ENCODERS: Record<Format, { contentType: string }> = {
  mp3: { contentType: "audio/mpeg" },
  wav: { contentType: "audio/wav" },
  aac: { contentType: "audio/aac" },
  flac: { contentType: "audio/flac" },
  ogg: { contentType: "audio/ogg" },
  m4a: { contentType: "audio/mp4" },
};

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

    const format = parseChoice(formData.get("format"), FORMATS, "mp3");
    const encoder = ENCODERS[format];

    /*
     * The page has always sent this and the route has always ignored it, so
     * "High · 320kbps" produced whatever the encoder defaulted to. The codec
     * and the bitrate now come from one place, keyed by both choices.
     */
    const quality = parseQuality(formData.get("quality"));

    tempDir = await createTempDir("audio-convert");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `converted.${format}`);

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      ...audioEncoderArgs(format, quality),
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Convert",
    });

    return await fileResponse(outputPath, {
      contentType: encoder.contentType,
      downloadName: `${upload.baseName}.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}