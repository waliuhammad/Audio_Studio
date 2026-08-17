import { NextRequest, NextResponse } from "next/server";
import {
  AUDIO_EXTENSIONS,
  MAX_VIDEO_BYTES,
  VIDEO_EXTENSIONS,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  probeMedia,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";

export const runtime = "nodejs";
export const maxDuration = 120;

/* ===================================================== */
/* FFPROBE SHAPES                                        */
/* ===================================================== */

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bit_rate?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  duration?: string;
}

interface ProbeFormat {
  format_name?: string;
  format_long_name?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  tags?: Record<string, string>;
}

interface ProbeResult {
  streams?: ProbeStream[];
  format?: ProbeFormat;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "30000/1001" -> 29.97 */
function parseFrameRate(value: string | undefined): number | null {
  if (!value) return null;

  const [numerator, denominator] = value.split("/");
  const top = Number(numerator);
  const bottom = Number(denominator ?? 1);

  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) {
    return null;
  }

  return Math.round((top / bottom) * 100) / 100;
}

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS],
      maxBytes: MAX_VIDEO_BYTES,
      label: "media file",
    });

    tempDir = await createTempDir("file-info");
    const inputPath = await writeUpload(tempDir, upload);

    const probe = (await probeMedia(inputPath)) as ProbeResult;

    const audioStream = probe.streams?.find(
      (stream) => stream.codec_type === "audio"
    );
    const videoStream = probe.streams?.find(
      (stream) => stream.codec_type === "video"
    );

    const tags = probe.format?.tags ?? {};

    return NextResponse.json({
      success: true,
      file: {
        name: upload.file.name,
        sizeBytes: upload.file.size,
        mimeType: upload.file.type || "application/octet-stream",
        lastModified: upload.file.lastModified,
      },
      container: {
        format: probe.format?.format_name ?? null,
        formatLong: probe.format?.format_long_name ?? null,
        durationSeconds: toNumber(probe.format?.duration),
        bitrateBps: toNumber(probe.format?.bit_rate),
      },
      audio: audioStream
        ? {
          codec: audioStream.codec_name ?? null,
          codecLong: audioStream.codec_long_name ?? null,
          sampleRateHz: toNumber(audioStream.sample_rate),
          channels: audioStream.channels ?? null,
          channelLayout: audioStream.channel_layout ?? null,
          bitrateBps: toNumber(audioStream.bit_rate),
        }
        : null,
      video: videoStream
        ? {
          codec: videoStream.codec_name ?? null,
          width: videoStream.width ?? null,
          height: videoStream.height ?? null,
          frameRate: parseFrameRate(videoStream.r_frame_rate),
          bitrateBps: toNumber(videoStream.bit_rate),
        }
        : null,
      // Only surface common, non-sensitive tags.
      metadata: {
        title: tags.title ?? null,
        artist: tags.artist ?? null,
        album: tags.album ?? null,
        date: tags.date ?? null,
        genre: tags.genre ?? null,
        encoder: tags.encoder ?? null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}