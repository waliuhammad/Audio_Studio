import { NextRequest, NextResponse } from "next/server";
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
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 12;
const MAX_SEGMENTS = 40;

/** Upper bound on the whole rendered timeline, in seconds (2 hours). */
const MAX_TIMELINE_SECONDS = 2 * 60 * 60;

/** Per-clip volume range (0 = silent, 1 = original, 2 = +6 dB). Must match the frontend slider. */
const MAX_CLIP_VOLUME = 2;

/** Quality = bitrate. Must stay in sync with QUALITY_OPTIONS on the frontend. */
const BITRATES = ["96", "128", "160", "192", "256", "320"] as const;

/** Compression = sample rate + channel count. Must stay in sync with COMPRESSION_OPTIONS on the frontend. */
const COMPRESSION_LEVELS = ["low", "medium", "high", "max"] as const;
type CompressionLevel = (typeof COMPRESSION_LEVELS)[number];

type CompressionConfig = { sampleRate: number; channels: number };

const COMPRESSION_CONFIG: Record<CompressionLevel, CompressionConfig> = {
  low: { sampleRate: 44100, channels: 2 },
  medium: { sampleRate: 32000, channels: 2 },
  high: { sampleRate: 22050, channels: 1 },
  max: { sampleRate: 16000, channels: 1 },
};

/** Fixed set — the output format can never be an arbitrary client string. */
const FORMATS = ["mp3", "m4a", "aac", "ogg", "wav", "flac"] as const;
type Format = (typeof FORMATS)[number];

type FormatConfig = { codecArgs: string[]; lossy: boolean; contentType: string };

const FORMAT_CONFIG: Record<Format, FormatConfig> = {
  mp3: { codecArgs: ["-c:a", "libmp3lame"], lossy: true, contentType: "audio/mpeg" },
  m4a: { codecArgs: ["-c:a", "aac"], lossy: true, contentType: "audio/mp4" },
  aac: { codecArgs: ["-c:a", "aac"], lossy: true, contentType: "audio/aac" },
  ogg: { codecArgs: ["-c:a", "libvorbis"], lossy: true, contentType: "audio/ogg" },
  wav: { codecArgs: ["-c:a", "pcm_s16le"], lossy: false, contentType: "audio/wav" },
  flac: { codecArgs: ["-c:a", "flac"], lossy: false, contentType: "audio/flac" },
};

/**
 * Working format for every trim stage before they are mixed. Normalising
 * sample format, rate and layout up front means files that were uploaded at
 * different rates or channel counts can be layered together without amix
 * refusing the inputs. The final -ar / -ac applied after the mix is what the
 * user actually selected.
 */
const MIX_SAMPLE_RATE = 48000;
const MIX_FORMAT = `aformat=sample_fmts=fltp:sample_rates=${MIX_SAMPLE_RATE}:channel_layouts=stereo`;

/**
 * `offset` is seconds relative to the END of the previous segment on the
 * shared mix timeline (not an absolute position). 0 = right after the
 * previous segment ends, negative = starts before it ends (overlap/blend),
 * positive = a silent gap. The first segment's offset is relative to t=0.
 * This mirrors the timeline editor on the frontend exactly: the editor keeps
 * absolute positions and converts them to these offsets when exporting.
 *
 * `volume` is optional (defaults to 1) and scales just this clip.
 */
type SequenceSegment = {
  fileIndex: number;
  start: number;
  end: number;
  offset: number;
  volume: number;
};

type PlacedSegment = SequenceSegment & { delayMs: number; endsAt: number };

function parseSequence(raw: FormDataEntryValue | null, fileCount: number): SequenceSegment[] {
  if (typeof raw !== "string") {
    throw new Error("Missing sequence data.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Sequence data is not valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Sequence must contain at least one segment.");
  }
  if (parsed.length > MAX_SEGMENTS) {
    throw new Error(`Sequence can contain at most ${MAX_SEGMENTS} segments.`);
  }

  return parsed.map((entry, i) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as any).fileIndex !== "number" ||
      typeof (entry as any).start !== "number" ||
      typeof (entry as any).end !== "number" ||
      typeof (entry as any).offset !== "number"
    ) {
      throw new Error(`Segment ${i + 1} is malformed.`);
    }

    const { fileIndex, start, end, offset } = entry as Omit<SequenceSegment, "volume">;
    const rawVolume = (entry as any).volume;

    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= fileCount) {
      throw new Error(`Segment ${i + 1} references an unknown file.`);
    }
    if (!Number.isFinite(start) || start < 0) {
      throw new Error(`Segment ${i + 1} has an invalid start time.`);
    }
    if (!Number.isFinite(end) || end <= start) {
      throw new Error(`Segment ${i + 1} has an invalid end time.`);
    }
    if (!Number.isFinite(offset)) {
      throw new Error(`Segment ${i + 1} has an invalid offset.`);
    }

    // Optional. Older clients that don't send a volume keep working at 100%.
    let volume = 1;
    if (rawVolume !== undefined) {
      if (
        typeof rawVolume !== "number" ||
        !Number.isFinite(rawVolume) ||
        rawVolume < 0 ||
        rawVolume > MAX_CLIP_VOLUME
      ) {
        throw new Error(`Segment ${i + 1} has an invalid volume.`);
      }
      volume = rawVolume;
    }

    return { fileIndex, start, end, offset, volume };
  });
}

/**
 * Chains each segment off the end of the one before it, exactly like the
 * frontend does when it exports, and converts the resulting absolute
 * start time into a millisecond delay for ffmpeg's `adelay`.
 */
function placeSegments(segments: SequenceSegment[]): PlacedSegment[] {
  let prevEnd = 0;
  return segments.map((seg) => {
    const duration = seg.end - seg.start;
    const startTime = Math.max(0, prevEnd + seg.offset);
    const endsAt = startTime + duration;
    prevEnd = endsAt;
    return { ...seg, delayMs: Math.round(startTime * 1000), endsAt };
  });
}

/** Trims numbers to a fixed precision so they never reach ffmpeg in exponential notation. */
function sec(value: number): string {
  return value.toFixed(6);
}

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const fileEntries = formData.getAll("files");
    if (fileEntries.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one audio file." },
        { status: 400 }
      );
    }
    if (fileEntries.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload at most ${MAX_FILES} files.` },
        { status: 400 }
      );
    }

    const uploads = fileEntries.map((entry) =>
      validateUpload(entry, {
        allowed: AUDIO_EXTENSIONS,
        maxBytes: MAX_AUDIO_BYTES,
        label: "audio file",
      })
    );

    const segments = parseSequence(formData.get("sequence"), uploads.length);
    const placed = placeSegments(segments);

    const timelineLength = placed.reduce((max, seg) => Math.max(max, seg.endsAt), 0);
    if (timelineLength > MAX_TIMELINE_SECONDS) {
      return NextResponse.json(
        { error: "The mix timeline is longer than the 2 hour limit." },
        { status: 400 }
      );
    }

    const bitrate = parseChoice(formData.get("bitrate"), BITRATES, "128");
    const format = parseChoice(formData.get("format"), FORMATS, "mp3") as Format;
    const compressionLevel = parseChoice(
      formData.get("compression"),
      COMPRESSION_LEVELS,
      "low"
    ) as CompressionLevel;

    const config = FORMAT_CONFIG[format];
    const { sampleRate, channels } = COMPRESSION_CONFIG[compressionLevel];

    tempDir = await createTempDir("audio-mixture");

    // Write each unique uploaded file once; segments reference it by index.
    const inputPaths = await Promise.all(
      uploads.map((upload, i) =>
        writeUpload(tempDir!, upload, `input_${i}${path.extname(upload.file.name) || ""}`)
      )
    );

    const outputPath = path.join(tempDir, `mixture.${format}`);

    const inputArgs = inputPaths.flatMap((p) => ["-i", p]);

    // One atrim + aformat + volume + adelay stage per segment, placing it at
    // its computed position on the shared timeline, then a single amix stage
    // layers all of them together. Segments with overlapping delays actually
    // blend (true mixing); segments placed back-to-back just play in
    // sequence. Referencing the same fileIndex more than once naturally
    // repeats that clip.
    const trimStages = placed
      .map(
        (seg, i) =>
          `[${seg.fileIndex}:a]atrim=start=${sec(seg.start)}:end=${sec(seg.end)},` +
          `asetpts=PTS-STARTPTS,${MIX_FORMAT},` +
          `volume=${seg.volume.toFixed(3)},` +
          `adelay=${seg.delayMs}:all=1[s${i}]`
      )
      .join(";");

    const mixInputs = placed.map((_, i) => `[s${i}]`).join("");

    /*
     * normalize=0 is important: amix's default divides every input by the
     * number of inputs, so a 10-clip sequence would come out at a tenth of
     * its original level even though the clips never overlap. With it off,
     * clips keep their own level and only genuine overlaps sum. alimiter
     * then catches the clipping that summing overlaps can cause, instead of
     * letting the mix distort.
     */
    const mixStage =
      `${mixInputs}amix=inputs=${placed.length}:duration=longest:` +
      `dropout_transition=0:normalize=0,alimiter=limit=0.95[outa]`;

    const filterComplex = `${trimStages};${mixStage}`;

    const args = [
      "-y",
      "-nostdin",
      ...inputArgs,
      "-filter_complex",
      filterComplex,
      "-map",
      "[outa]",
      "-vn",
      "-map_metadata",
      "-1",
      ...config.codecArgs,
    ];

    // Bitrate (Quality) only applies to lossy codecs.
    if (config.lossy) {
      args.push("-b:a", `${bitrate}k`);
    }

    // Compression (sample rate / channels) always applies.
    args.push("-ar", `${sampleRate}`, "-ac", `${channels}`, outputPath);

    await runFFmpeg(args);

    const totalInputBytes = uploads.reduce((sum, u) => sum + u.file.size, 0);

    await recordUsage(startedAt, {
      fileName: `mixture-${uploads.length}-files`,
      sizeBytes: totalInputBytes,
      kind: "audio",
      tool: "Mixture",
    });

    return await fileResponse(outputPath, {
      contentType: config.contentType,
      downloadName: `audio-mixture.${format}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}