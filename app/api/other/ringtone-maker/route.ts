import { NextRequest } from "next/server";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MediaError,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  parseChoice,
  parseNumber,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import path from "path";

export const runtime = "nodejs";

const FORMATS = ["mp3", "wav", "m4r"] as const;

type RingtoneFormat = (typeof FORMATS)[number];

const FORMAT_SETTINGS: Record<
    RingtoneFormat,
    { extension: string; mimeType: string; ffmpegArgs: string[] }
> = {
    wav: {
        extension: "wav",
        mimeType: "audio/wav",
        ffmpegArgs: ["-vn", "-c:a", "pcm_s16le", "-ar", "44100"],
    },
    m4r: {
        extension: "m4r",
        mimeType: "audio/mp4",
        /*
         * "-f ipod" is required, not cosmetic.
         *
         * FFmpeg picks a muxer from the output extension, and it has no entry
         * for .m4r — so writing ringtone.m4r failed outright with "Error
         * opening output file", meaning the iPhone option never produced a
         * file. An m4r IS an MP4/AAC file with a different suffix, so naming
         * the muxer explicitly is all that was missing.
         */
        ffmpegArgs: [
            "-vn",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            "-ar",
            "44100",
            "-b:a",
            "192k",
            "-f",
            "ipod",
        ],
    },
    mp3: {
        extension: "mp3",
        mimeType: "audio/mpeg",
        ffmpegArgs: ["-vn", "-c:a", "libmp3lame", "-q:a", "2", "-ar", "44100"],
    },
};

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

    const start = parseNumber(formData.get("startTime"), {
      min: 0,
      max: 24 * 60 * 60,
      label: "Start time",
    });

    const end = parseNumber(formData.get("endTime"), {
      min: 0,
      max: 24 * 60 * 60,
      label: "End time",
    });

    if (end <= start) {
      throw new MediaError(
        "End time must be greater than the start time."
      );
    }

    const duration = end - start;

    if (duration < 0.1) {
      throw new MediaError(
        "Please select at least 0.1 seconds for the ringtone."
      );
    }

    // Anything unrecognised falls back to mp3 rather than reaching FFmpeg.
    const format = parseChoice(formData.get("format"), FORMATS, "mp3");
    const settings = FORMAT_SETTINGS[format];

    tempDirectory = await createTempDir("ringtone-maker");

    const inputPath = await writeUpload(tempDirectory, upload);
    const outputPath = path.join(
      tempDirectory,
      `ringtone.${settings.extension}`
    );

    await runFFmpeg([
      "-y",
      "-ss",
      String(start),
      "-i",
      inputPath,
      "-t",
      String(duration),
      ...settings.ffmpegArgs,
      outputPath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: upload.file.name,
      sizeBytes: upload.file.size,
      kind: "audio",
      tool: "Ringtone maker",
    });

    return await fileResponse(outputPath, {
      contentType: settings.mimeType,
      downloadName: `${upload.baseName}-ringtone.${settings.extension}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDirectory);
  }
}