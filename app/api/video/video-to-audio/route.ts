import { NextRequest } from "next/server";
import path from "path";
import {
  MAX_VIDEO_BYTES,
  VIDEO_EXTENSIONS,
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

export const runtime = "nodejs";
export const maxDuration = 300;

const FORMATS = ["mp3", "wav", "aac", "flac", "ogg"] as const;
type Format = (typeof FORMATS)[number];

const ENCODERS: Record<Format, { args: string[]; contentType: string }> = {
  mp3: { args: ["-c:a", "libmp3lame", "-q:a", "2"], contentType: "audio/mpeg" },
  wav: { args: ["-c:a", "pcm_s16le"], contentType: "audio/wav" },
  aac: { args: ["-c:a", "aac", "-b:a", "192k"], contentType: "audio/aac" },
  flac: { args: ["-c:a", "flac"], contentType: "audio/flac" },
  ogg: { args: ["-c:a", "libvorbis", "-q:a", "5"], contentType: "audio/ogg" },
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
      allowed: VIDEO_EXTENSIONS,
      maxBytes: MAX_VIDEO_BYTES,
      label: "video file",
    });

    const format = parseChoice(formData.get("format"), FORMATS, "mp3");
    const encoder = ENCODERS[format];

    tempDir = await createTempDir("video-to-audio");

    const inputPath = await writeUpload(tempDir, upload);
    const outputPath = path.join(tempDir, `extracted.${format}`);

    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      ...encoder.args,
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Video to audio",
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