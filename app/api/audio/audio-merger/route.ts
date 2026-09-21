import { NextRequest } from "next/server";
import path from "path";

import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MediaError,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  probeMedia,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import { audioQualityOverride, parseQuality } from "@/lib/server/quality";

export const runtime = "nodejs";

// Must stay in sync with FORMAT_OPTIONS in the page component.
const ALLOWED_OUTPUT_FORMATS = ["mp3", "wav", "m4a", "aac", "flac", "ogg"] as const;
type OutputFormat = (typeof ALLOWED_OUTPUT_FORMATS)[number];

const CONTENT_TYPES: Record<OutputFormat, string> = {
  mp3: "audio/mpeg", 
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

// Codec/container flags per output format. m4a and aac both encode with the
// AAC codec; aac additionally needs an explicit ADTS bitstream since it has
// no container of its own.
const CODEC_ARGS: Record<OutputFormat, string[]> = {
  mp3: ["-c:a", "libmp3lame", "-q:a", "2"],
  wav: ["-c:a", "pcm_s16le"],
  m4a: ["-c:a", "aac", "-b:a", "192k"],
  aac: ["-c:a", "aac", "-b:a", "192k", "-f", "adts"],
  flac: ["-c:a", "flac"],
  ogg: ["-c:a", "libvorbis", "-q:a", "5"],
};

function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && (ALLOWED_OUTPUT_FORMATS as readonly string[]).includes(value);
}

function clampVolume(raw: FormDataEntryValue | null, fallback: number): number {
  const parsed = typeof raw === "string" ? parseFloat(raw) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(3, Math.max(0, parsed));
}

/** Container duration in seconds, or null when ffprobe could not find one. */
function containerSeconds(probe: unknown): number | null {
  const format = (probe as { format?: { duration?: unknown } } | null)?.format;
  const parsed = Number(format?.duration);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let workDir: string | null = null;

  try {
    const formData = await request.formData();

    const voice = validateUpload(formData.get("voiceFile"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "voice track",
    });

    const music = validateUpload(formData.get("musicFile"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "music track",
    });

    const formatRaw = formData.get("format");
    const format: OutputFormat = isOutputFormat(formatRaw) ? formatRaw : "mp3";
    const quality = parseQuality(formData.get("quality"));

    const voiceVolume = clampVolume(formData.get("voiceVolume"), 1);
    const musicVolume = clampVolume(formData.get("musicVolume"), 0.6);
    const syncMode = formData.get("syncMode") === "trim" ? "trim" : "loop";

    workDir = await createTempDir("audio-merger");

    const voicePath = await writeUpload(workDir, voice, "voice");
    const musicPath = await writeUpload(workDir, music, "music");
    const outputPath = path.join(workDir, `merged.${format}`);

    if (syncMode === "loop") {
      /*
       * -stream_loop -1 on an input with no decodable audio never produces a
       * frame and never reaches end-of-file, so amix waits forever: a
       * header-only WAV as the music track hung the request until the client
       * gave up, with ffmpeg still burning a core. Probing first turns that
       * into an immediate 400 — and only the loop path needs it, because
       * "trim" stops at the shorter input and terminates either way.
       */
      const seconds = containerSeconds(await probeMedia(musicPath));

      if (seconds === null || seconds <= 0) {
        throw new MediaError(
          "That music track has no playable audio, so it cannot be looped. Try a different file."
        );
      }
    }

    // amix duration=first + an infinite loop on the music input means the
    // mix runs exactly as long as the voice track, repeating the music to
    // fill it. duration=shortest (no loop) stops at whichever track is
    // shorter instead.
    const filterGraph =
      `[0:a]volume=${voiceVolume}[voice];` +
      `[1:a]volume=${musicVolume}[music];` +
      `[voice][music]amix=inputs=2:duration=${syncMode === "loop" ? "first" : "shortest"}:dropout_transition=2[aout]`;

    const args = ["-y", "-i", voicePath];

    if (syncMode === "loop") {
      args.push("-stream_loop", "-1");
    }

    args.push(
      "-i",
      musicPath,
      "-filter_complex",
      filterGraph,
      "-map",
      "[aout]",
      ...CODEC_ARGS[format],
      ...audioQualityOverride(format, quality),
      outputPath
    );

    // runFFmpeg resolves the bundled binary, passes an argument ARRAY (no
    // shell) and kills the job at FFMPEG_TIMEOUT_MS. Spawning ffmpeg-static
    // here directly, as this route used to, skipped all three.
    await runFFmpeg(args);

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt, {
      fileName: voice.file.name,
      sizeBytes: voice.file.size + music.file.size,
      kind: "audio",
      tool: "Background audio merger",
    });

    return await fileResponse(outputPath, {
      contentType: CONTENT_TYPES[format],
      downloadName: `merged.${format}`,
    });
  } catch (error) {
    // errorResponse keeps ffmpeg stderr and server temp paths server-side.
    return errorResponse(error);
  } finally {
    await cleanupTempDir(workDir);
  }
}
