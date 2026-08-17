import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  VIDEO_EXTENSIONS,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  parseNumber,
  probeMedia,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Produce real waveform peak data.
 *
 * FFmpeg decodes the file to raw mono 16-bit PCM at a low sample rate, then
 * the samples are reduced to min/max pairs — one pair per requested bucket.
 * That is exactly what a waveform renderer needs, and it's small enough to
 * send as JSON (2000 buckets ≈ 30 KB).
 */

const PEAK_SAMPLE_RATE = 8000;
const DEFAULT_BUCKETS = 1000;
const MAX_BUCKETS = 4000;

interface ProbeShape {
  format?: { duration?: string };
}

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS],
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const buckets = Math.round(
      parseNumber(formData.get("buckets"), {
        min: 50,
        max: MAX_BUCKETS,
        fallback: DEFAULT_BUCKETS,
        label: "bucket count",
      })
    );

    tempDir = await createTempDir("waveform");

    const inputPath = await writeUpload(tempDir, upload);
    const pcmPath = path.join(tempDir, "audio.pcm");

    // Decode to headerless mono 16-bit little-endian PCM.
    await runFFmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(PEAK_SAMPLE_RATE),
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      pcmPath,
    ]);

    const raw = await fs.readFile(pcmPath);
    const samples = new Int16Array(
      raw.buffer,
      raw.byteOffset,
      Math.floor(raw.byteLength / 2)
    );

    const peaks: { min: number; max: number }[] = [];
    const samplesPerBucket = samples.length / buckets;

    for (let bucket = 0; bucket < buckets; bucket += 1) {
      const start = Math.floor(bucket * samplesPerBucket);
      const end = Math.min(
        samples.length,
        Math.floor((bucket + 1) * samplesPerBucket)
      );

      let min = 0;
      let max = 0;

      for (let index = start; index < end; index += 1) {
        // Normalise Int16 to -1..1
        const value = (samples[index] ?? 0) / 32768;
        if (value < min) min = value;
        if (value > max) max = value;
      }

      peaks.push({
        min: Math.round(min * 1000) / 1000,
        max: Math.round(max * 1000) / 1000,
      });
    }

    const probe = (await probeMedia(inputPath)) as ProbeShape;
    const duration = Number(probe.format?.duration);

    // Peak amplitude across the whole file, for a headroom readout.
    const peakAmplitude = peaks.reduce(
      (highest, peak) => Math.max(highest, Math.abs(peak.min), peak.max),
      0
    );

    return NextResponse.json({
      success: true,
      fileName: upload.file.name,
      durationSeconds: Number.isFinite(duration) ? duration : null,
      sampleRate: PEAK_SAMPLE_RATE,
      bucketCount: peaks.length,
      peakAmplitude: Math.round(peakAmplitude * 1000) / 1000,
      peakDbfs:
        peakAmplitude > 0
          ? Math.round(20 * Math.log10(peakAmplitude) * 10) / 10
          : null,
      peaks,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}