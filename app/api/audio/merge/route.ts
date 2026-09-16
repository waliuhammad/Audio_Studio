import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MediaError,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  runFFmpeg,
  validateUpload,
  writeUpload,
  type ValidatedUpload,
} from "@/lib/server/media";
import { audioQualityOverride, parseQuality } from "@/lib/server/quality";

/*
 * Every FFmpeg call goes through runFFmpeg().
 *
 * This route used to promisify execFile and spawn the binary itself, which is
 * why it kept missing changes made centrally — most recently the switch to a
 * bundled binary, which left merge as the only tool still reporting "FFmpeg is
 * not installed" in production while every other tool worked.
 *
 * Going through the shared helper means binary resolution, the processing
 * timeout and the argument-array safety are inherited rather than
 * reimplemented, and the next change lands here automatically. It also means
 * FFmpeg's stderr is logged server-side and never reaches the client.
 */
async function assertFFmpeg(): Promise<void> {
  try {
    await runFFmpeg(["-version"]);
  } catch {
    throw new MediaError(
      "FFmpeg is not installed or is not available on the server.",
      500
    );
  }
}

/*
 * Output formats offered by the page's Format dropdown.
 * `mimeType` drives the Content-Type header; `extension` drives both the
 * intermediate/final filenames and the default download name.
 */
const AUDIO_FORMATS = {
  // No "-q:a 2" here on purpose: libmp3lame prefers a qscale over a bitrate
  // when it is given both, so the "-b:a" that audioQualityOverride appends was
  // silently ignored and every Quality level produced the same MP3. Leaving the
  // codec bare lets the user's choice decide.
  mp3: { extension: "mp3", mimeType: "audio/mpeg", args: ["-c:a", "libmp3lame"] },
  wav: { extension: "wav", mimeType: "audio/wav", args: ["-c:a", "pcm_s16le"] },
  m4a: { extension: "m4a", mimeType: "audio/mp4", args: ["-c:a", "aac", "-b:a", "192k"] },
  ogg: { extension: "ogg", mimeType: "audio/ogg", args: ["-c:a", "libvorbis", "-q:a", "5"] },
  flac: { extension: "flac", mimeType: "audio/flac", args: ["-c:a", "flac"] },
  opus: { extension: "opus", mimeType: "audio/opus", args: ["-c:a", "libopus", "-b:a", "128k"] },
} as const;

type AudioFormat = keyof typeof AUDIO_FORMATS;

const AUDIO_FORMAT_KEYS = Object.keys(AUDIO_FORMATS) as AudioFormat[];

/**
 * How many files one merge may carry.
 *
 * The page enforces the same ceiling, so hitting this here means either a
 * hand-rolled request or a page that drifted — both worth a clear 400 rather
 * than a temp directory full of 100 MB uploads.
 */
const MIN_FILES = 2;
const MAX_FILES = 10;

/**
 * An unknown format is a bad request, not a server fault — it used to throw a
 * plain Error and surface as a 500.
 */
function parseFormat(raw: FormDataEntryValue | null): AudioFormat {
  if (typeof raw !== "string" || !raw.trim()) {
    return "mp3";
  }

  const normalized = raw.trim().toLowerCase();

  if ((AUDIO_FORMAT_KEYS as string[]).includes(normalized)) {
    return normalized as AudioFormat;
  }

  throw new MediaError(
    `Unsupported output format. Choose one of: ${AUDIO_FORMAT_KEYS.join(", ")}.`
  );
}

/**
 * One trim boundary, in seconds.
 *
 * Empty, missing, or 0 for `end` means "play to the end of the file", which is
 * what the page sends when the user has not moved the end handle. Anything
 * else must be a real, finite, non-negative number — silently treating "abc"
 * or "-5" as 0 (which is what parseFloat did) turned a typo into a different
 * file than the one the user asked for.
 */
function parseTimeField(
  raw: string | undefined,
  label: string,
  fileLabel: string
): number {
  if (raw === undefined || raw.trim() === "") return 0;

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new MediaError(`"${fileLabel}" has an invalid ${label} time.`);
  }

  if (value < 0) {
    throw new MediaError(`"${fileLabel}" has a negative ${label} time.`);
  }

  return value;
}

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tmpDir: string | null = null;

  try {
    await assertFFmpeg();

    const formData = await request.formData();
    const uploads = formData.getAll("files");
    const startTimes = formData.getAll("startTimes");
    const endTimes = formData.getAll("endTimes");
    const format = parseFormat(formData.get("format"));
    const quality = parseQuality(formData.get("quality"));
    const { extension, mimeType, args: codecArgs } = AUDIO_FORMATS[format];

    if (uploads.length < MIN_FILES) {
      throw new MediaError(
        `At least ${MIN_FILES} audio files are required for merging.`
      );
    }

    if (uploads.length > MAX_FILES) {
      throw new MediaError(
        `You can merge up to ${MAX_FILES} audio files at once. You sent ${uploads.length}.`
      );
    }

    // Validate every upload BEFORE writing anything to disk: extension,
    // emptiness and the 100 MB ceiling, the same checks every other audio
    // route applies. The file's own name goes into the message so a user with
    // ten files knows which one to fix.
    const validated: ValidatedUpload[] = uploads.map((upload, index) => {
      const label =
        upload instanceof File && upload.name ? upload.name : `File ${index + 1}`;

      try {
        return validateUpload(upload, {
          allowed: AUDIO_EXTENSIONS,
          maxBytes: MAX_AUDIO_BYTES,
          label: "audio file",
        });
      } catch (error) {
        if (error instanceof MediaError) {
          throw new MediaError(`"${label}": ${error.message}`, error.status);
        }

        throw error;
      }
    });

    // A partial list means the client and the server disagree about which
    // time belongs to which file — never guess.
    if (startTimes.length > 0 && startTimes.length !== uploads.length) {
      throw new MediaError("Start times do not match the files sent.");
    }

    if (endTimes.length > 0 && endTimes.length !== uploads.length) {
      throw new MediaError("End times do not match the files sent.");
    }

    const asString = (value: FormDataEntryValue | undefined) =>
      typeof value === "string" ? value : undefined;

    tmpDir = await createTempDir("audio-merge");
    const trimmedFilePaths: string[] = [];

    for (let i = 0; i < validated.length; i++) {
      const upload = validated[i]!;
      const fileLabel = upload.file.name || `File ${i + 1}`;

      const inputPath = await writeUpload(tmpDir, upload, `input_${i}`);
      // Trim to a lossless intermediate (WAV) regardless of the requested
      // output format, so picking a different format later doesn't stack a
      // second lossy re-encode on top of the trim.
      const trimmedPath = path.join(tmpDir, `trimmed_${i}.wav`);

      const startTime = parseTimeField(asString(startTimes[i]), "start", fileLabel);
      const endTime = parseTimeField(asString(endTimes[i]), "end", fileLabel);

      // 0 is the "to the end of the file" sentinel; any other end must come
      // after the start. Previously an end at or before the start silently
      // kept the whole remainder of the file.
      if (endTime > 0 && endTime <= startTime) {
        throw new MediaError(
          `"${fileLabel}" must end after it starts.`
        );
      }

      const duration = endTime > startTime ? endTime - startTime : 0;

      // Trim each file individually using FFmpeg before merging.
      const ffmpegArgs = ["-y", "-ss", startTime.toString()];
      if (duration > 0) {
        ffmpegArgs.push("-t", duration.toString());
      }
      ffmpegArgs.push("-i", inputPath, "-c:a", "pcm_s16le", trimmedPath);

      await runFFmpeg(ffmpegArgs);
      trimmedFilePaths.push(trimmedPath);
    }

    // Create FFmpeg concat demuxer file list for the trimmed files. The paths
    // are ours (mkdtemp + a fixed name), never the uploaded filename, so there
    // is nothing here for a crafted name to break out of.
    const listContent = trimmedFilePaths
      .map((p) => `file '${p.replace(/\\/g, "/")}'`)
      .join("\n");

    const listFilePath = path.join(tmpDir, "list.txt");
    await fs.writeFile(listFilePath, listContent, "utf8");

    const outputFilePath = path.join(tmpDir, `output.${extension}`);

    // Run FFmpeg concatenation on the trimmed audio segments, encoding
    // straight to the requested output format.
    await runFFmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFilePath,
      ...codecArgs,
      ...audioQualityOverride(format, quality),
      outputFilePath,
    ]);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: `${validated.length} audio files`,
      sizeBytes: validated.reduce((total, upload) => total + upload.file.size, 0),
      kind: "audio",
      tool: "Merge",
    });

    return await fileResponse(outputFilePath, {
      contentType: mimeType,
      downloadName: `audio-merged.${extension}`,
    });
  } catch (error) {
    // Everything — including FFmpeg failures — goes through errorResponse, so
    // raw stderr and stack traces stay on the server.
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tmpDir);
  }
}
