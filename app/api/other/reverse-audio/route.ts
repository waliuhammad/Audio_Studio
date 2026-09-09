// app/api/other/reverse-audio/route.ts
import { NextRequest } from "next/server";
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
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import path from "path";
import { audioQualityOverride, parseQuality } from "@/lib/server/quality";

export const runtime = "nodejs";

/**
 * Reverse an audio file.
 *
 * The page did this in the browser with the Web Audio API and wrote a WAV by
 * hand — which was fine for WAV, and wrong for everything else: it offered six
 * formats and produced WAV bytes for all of them, so choosing MP3 downloaded a
 * .mp3 file containing a WAV. Any player reading the extension rather than
 * sniffing the contents would fail on it.
 *
 * Doing it here means the chosen format is the format that comes out, and the
 * quality setting works the same way it does in every other tool.
 */

/** Fixed set — the output format can never be an arbitrary client string. */
const FORMATS = ["mp3", "m4a", "aac", "ogg", "wav", "flac"] as const;
type Format = (typeof FORMATS)[number];

const FORMAT_CONFIG: Record<Format, { codecArgs: string[]; contentType: string }> = {
  mp3: { codecArgs: ["-c:a", "libmp3lame"], contentType: "audio/mpeg" },
  m4a: { codecArgs: ["-c:a", "aac", "-f", "ipod"], contentType: "audio/mp4" },
  aac: { codecArgs: ["-c:a", "aac", "-f", "adts"], contentType: "audio/aac" },
  ogg: { codecArgs: ["-c:a", "libvorbis"], contentType: "audio/ogg" },
  wav: { codecArgs: ["-c:a", "pcm_s16le"], contentType: "audio/wav" },
  flac: { codecArgs: ["-c:a", "flac"], contentType: "audio/flac" },
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  const access = await guardToolRun();

  if (isRefused(access)) return access;

  let tempDirectory: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const format = parseChoice(formData.get("format"), FORMATS, "wav") as Format;
    const quality = parseQuality(formData.get("quality"));
    const config = FORMAT_CONFIG[format];

    tempDirectory = await createTempDir("audio-reverse");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(tempDirectory, `reversed.${format}`);

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      // areverse buffers the whole stream, which is why this is bounded by the
      // same upload limit as every other audio tool.
      "-af",
      "areverse",
      "-vn",
      ...config.codecArgs,
      ...audioQualityOverride(format, quality),
      outputPath,
    ]);

    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Reverse",
    });

    return await fileResponse(outputPath, {
      contentType: config.contentType,
      downloadName: `reversed.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}
