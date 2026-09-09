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
import { audioQualityOverride, parseQuality } from "@/lib/server/quality";

export const runtime = "nodejs";
export const maxDuration = 300;

// Must stay in sync with FORMAT_OPTIONS in the client page.
type OutputFormat = "mp3" | "wav" | "m4a" | "aac" | "flac" | "ogg";
const ALLOWED_OUTPUT_FORMATS: OutputFormat[] = ["mp3", "wav", "m4a", "aac", "flac", "ogg"];

// Per-format ffmpeg encoding args and the content-type to serve the result
// with. Kept as a lookup table so adding a format later is a one-line change
// instead of another branch scattered through the handler.
const FORMAT_CONFIG: Record<
  OutputFormat,
  { args: string[]; contentType: string }
> = {
  mp3: {
    args: ["-c:a", "libmp3lame", "-q:a", "2"],
    contentType: "audio/mpeg",
  },
  wav: {
    args: ["-c:a", "pcm_s16le"],
    contentType: "audio/wav",
  },
  m4a: {
    args: ["-c:a", "aac", "-b:a", "192k", "-f", "ipod"],
    contentType: "audio/mp4",
  },
  aac: {
    args: ["-c:a", "aac", "-b:a", "192k", "-f", "adts"],
    contentType: "audio/aac",
  },
  flac: {
    args: ["-c:a", "flac"],
    contentType: "audio/flac",
  },
  ogg: {
    args: ["-c:a", "libvorbis", "-q:a", "5"],
    contentType: "audio/ogg",
  },
};

function parseFormat(value: FormDataEntryValue | null): OutputFormat {
  const candidate = typeof value === "string" ? value.toLowerCase() : "";
  return (ALLOWED_OUTPUT_FORMATS as string[]).includes(candidate)
    ? (candidate as OutputFormat)
    : "mp3";
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

    // Bounded: an unbounded multiplier could produce a destructive gain value.
    const volume = parseNumber(formData.get("volume"), {
      min: 0,
      max: 4,
      fallback: 1,
      label: "volume",
    });

    const format = parseFormat(formData.get("format"));
    const quality = parseQuality(formData.get("quality"));
    const { args: codecArgs, contentType } = FORMAT_CONFIG[format];

    tempDir = await createTempDir("audio-player");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `processed.${format}`);

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-filter:a",
      `volume=${volume}`,
      "-vn",
      ...codecArgs,
      ...audioQualityOverride(format, quality),
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
      contentType,
      downloadName: `${upload.baseName}-vol${volume}.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}