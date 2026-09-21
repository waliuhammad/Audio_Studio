/**
 * Video Mixture — the pure part of the route: request parsing, validation of
 * the sequence against probed sources, and the FFmpeg argument list.
 *
 * Kept free of Next.js and of I/O so it can be exercised directly against a
 * local ffmpeg with generated clips.
 *
 * How the graph is built
 * ----------------------
 * Every SEGMENT gets its own input: `-ss START -t LENGTH -i source`. A source
 * used three times is therefore opened three times, which is deliberate. The
 * alternative — one input per source, fanned out with split/asplit — decodes
 * the whole file once and makes split queue every frame a later segment will
 * need while concat is still consuming an earlier one. For a clip reused from
 * early in a long file that is gigabytes of raw frames held in memory. Separate
 * inputs keep each decoder's queue bounded, and input seeking means nothing
 * before a segment's start is decoded at all.
 *
 * Each segment is then normalised to one size, frame rate, pixel format and
 * audio layout so the concat filter can join them.
 */

import { videoEncoderArgs, type QualityLevel } from "./quality";

export const MIXTURE_LIMITS = {
    maxSources: 10,
    /*
     * Each segment is its own decoder. A 50-segment 1080p test peaked around
     * 1.4 GB of memory on one job, which a small container can't spare with
     * other users running tools too.
     */
    maxSegments: 20,
    /** Shortest segment the server accepts, in seconds. */
    minSegment: 0.05,
    /*
     * Longest total output, in seconds. Every clip is re-encoded, and the job
     * is killed at FFMPEG_TIMEOUT_MS (5 minutes); ten minutes of 1080p output
     * is about what fits in that on a small server.
     */
    maxTotal: 10 * 60,
    fps: 30,
    /** The output's long and short sides are capped at these. */
    maxLongSide: 1920,
    maxShortSide: 1080,
} as const;

export const MIXTURE_FORMATS = {
    mp4: { ext: "mp4", contentType: "video/mp4", video: "libx264", audio: "aac", faststart: true },
    webm: { ext: "webm", contentType: "video/webm", video: "libvpx-vp9", audio: "libopus", faststart: false },
    mov: { ext: "mov", contentType: "video/quicktime", video: "libx264", audio: "aac", faststart: true },
    mkv: { ext: "mkv", contentType: "video/x-matroska", video: "libx264", audio: "aac", faststart: false },
} as const;

export type MixtureFormat = keyof typeof MIXTURE_FORMATS;

export function isMixtureFormat(value: string): value is MixtureFormat {
    return Object.prototype.hasOwnProperty.call(MIXTURE_FORMATS, value);
}

/** One piece of the output, in sequence order. */
export interface MixSegment {
    /** Index into the uploaded files. */
    source: number;
    start: number;
    end: number;
}

/** What the route learned about one uploaded file. */
export interface MixSource {
    path: string;
    /** Seconds, or null when the container does not say. */
    duration: number | null;
    hasAudio: boolean;
    /** Display size, after any rotation metadata is applied. */
    width: number;
    height: number;
}

/** A thrown message meant for the user. The route maps it to a 400. */
export class MixtureInputError extends Error {}

/**
 * Parse the `segments` form field. Shape and bounds only — whether the times
 * fit each source is checked once the sources are probed.
 */
export function parseSegments(raw: unknown, sourceCount: number): MixSegment[] {
    if (typeof raw !== "string" || raw.trim() === "") {
        throw new MixtureInputError("The clip sequence is missing.");
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new MixtureInputError("The clip sequence could not be read.");
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new MixtureInputError("Add at least one clip to the sequence.");
    }

    if (parsed.length > MIXTURE_LIMITS.maxSegments) {
        throw new MixtureInputError(
            `A sequence can have at most ${MIXTURE_LIMITS.maxSegments} clips.`
        );
    }

    return parsed.map((item, index) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        const source = entry.source;
        const label = `Clip ${index + 1}`;

        if (
            typeof source !== "number" ||
            !Number.isInteger(source) ||
            source < 0 ||
            source >= sourceCount
        ) {
            throw new MixtureInputError(`${label} refers to a video that was not uploaded.`);
        }

        return { source, ...parseSegmentTimes(entry, label, "video") };
    });
}

/**
 * The start/end of one parsed JSON segment, validated. `label` names the
 * segment in messages ("Clip 2") and `noun` its source ("video", "audio").
 */
export function parseSegmentTimes(
    entry: Record<string, unknown>,
    label: string,
    noun: string
): { start: number; end: number } {
    const { start, end } = entry;

    if (
        typeof start !== "number" ||
        typeof end !== "number" ||
        !Number.isFinite(start) ||
        !Number.isFinite(end)
    ) {
        throw new MixtureInputError(`${label} has an invalid start or end time.`);
    }

    if (start < 0) {
        throw new MixtureInputError(`${label} starts before the beginning of its ${noun}.`);
    }

    if (end <= start + MIXTURE_LIMITS.minSegment) {
        throw new MixtureInputError(`${label} is too short.`);
    }

    return { start, end };
}

/**
 * Clamp a segment's end to its source's probed length (null = unknown), and
 * reject one that starts past the end.
 */
export function fitSegmentEnd(
    segment: { start: number; end: number },
    duration: number | null,
    label: string,
    noun: string
): number {
    if (duration === null) return segment.end;

    if (segment.start >= duration - MIXTURE_LIMITS.minSegment) {
        throw new MixtureInputError(`${label} starts after the end of its ${noun}.`);
    }

    return Math.min(segment.end, duration);
}

/**
 * Fit each segment to its probed source: clamp the end to the source's length
 * and reject one that starts past it. Also enforces the total-length cap.
 */
export function fitSegments(
    segments: readonly MixSegment[],
    sources: readonly MixSource[]
): MixSegment[] {
    let total = 0;

    const fitted = segments.map((segment, index) => {
        const source = sources[segment.source];

        if (!source) {
            throw new MixtureInputError(`Clip ${index + 1} refers to a video that was not uploaded.`);
        }

        const end = fitSegmentEnd(segment, source.duration, `Clip ${index + 1}`, "video");

        total += end - segment.start;

        return { ...segment, end };
    });

    if (total > MIXTURE_LIMITS.maxTotal) {
        throw new MixtureInputError(
            `The finished video can be at most ${MIXTURE_LIMITS.maxTotal / 60} minutes long.`
        );
    }

    return fitted;
}

const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2);

/**
 * Output frame size: the first segment's source, capped so the long side is at
 * most 1920 and the short side at most 1080 (so a portrait phone clip stays
 * 1080x1920 rather than shrinking to fit a landscape box), rounded to even.
 */
export function outputSize(width: number, height: number): { width: number; height: number } {
    if (!(width > 0) || !(height > 0)) return { width: 1280, height: 720 };

    const landscape = width >= height;
    const capW = landscape ? MIXTURE_LIMITS.maxLongSide : MIXTURE_LIMITS.maxShortSide;
    const capH = landscape ? MIXTURE_LIMITS.maxShortSide : MIXTURE_LIMITS.maxLongSide;
    const scale = Math.min(1, capW / width, capH / height);

    return { width: even(width * scale), height: even(height * scale) };
}

/*
 * The sizes the page offers as "Quality". The first clip's orientation picks
 * landscape or portrait; every clip is scaled and padded into that box.
 */
export const MIXTURE_RESOLUTIONS: Record<string, { long: number; short: number }> = {
    "720p": { long: 1280, short: 720 },
    "480p": { long: 854, short: 480 },
    "360p": { long: 640, short: 360 },
};

/** A chosen resolution's frame, oriented like the first clip. */
export function resolutionSize(
    width: number,
    height: number,
    resolution: string
): { width: number; height: number } | null {
    const box = MIXTURE_RESOLUTIONS[resolution];

    if (!box) return null;

    const portrait = height > width;

    return portrait
        ? { width: box.short, height: box.long }
        : { width: box.long, height: box.short };
}

/** Seconds as a plain decimal FFmpeg accepts — never exponent notation. */
export const secs = (value: number) => value.toFixed(3);

/**
 * Input `k`'s video, `length` seconds from its (input-seeked) start, as
 * W x H at `fps` in yuv420p, labelled [v<k>] (or `out`).
 */
export function segmentVideoFilter(
    k: number,
    length: number,
    size: { width: number; height: number },
    fps: number,
    out = `v${k}`
): string {
    const { width: W, height: H } = size;

    return (
        `[${k}:v:0]trim=duration=${secs(length)},setpts=PTS-STARTPTS,` +
        `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
        `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p[${out}]`
    );
}

/**
 * Input `k`'s first audio stream as exactly `length` seconds of 48 kHz stereo,
 * padded if the stream runs short — or that much silence when the input has
 * no audio. Labelled [a<k>] (or `out`).
 */
export function segmentAudioFilter(
    k: number,
    length: number,
    hasAudio: boolean,
    out = `a${k}`
): string {
    return hasAudio
        ? `[${k}:a:0]atrim=duration=${secs(length)},asetpts=PTS-STARTPTS,` +
              `aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
              `apad,atrim=duration=${secs(length)}[${out}]`
        : silenceFilter(length, out);
}

/** `length` seconds of 48 kHz stereo silence, labelled [out]. */
export function silenceFilter(length: number, out: string): string {
    return (
        `anullsrc=r=48000:cl=stereo,atrim=duration=${secs(length)},` +
        `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[${out}]`
    );
}

export function buildMixtureArgs(options: {
    sources: readonly MixSource[];
    segments: readonly MixSegment[];
    format: MixtureFormat;
    quality: QualityLevel;
    /** "720p" / "480p" / "360p"; absent keeps the first clip's own size. */
    resolution?: string;
    outputPath: string;
}): string[] {
    const { sources, segments, format, quality, resolution, outputPath } = options;
    const spec = MIXTURE_FORMATS[format];
    const first = segments[0] ? sources[segments[0].source] : undefined;

    if (!first) throw new MixtureInputError("Add at least one clip to the sequence.");

    const { width: W, height: H } =
        (resolution ? resolutionSize(first.width, first.height, resolution) : null) ??
        outputSize(first.width, first.height);
    const fps = MIXTURE_LIMITS.fps;

    const args: string[] = ["-y", "-hide_banner", "-nostdin"];
    const filters: string[] = [];
    const concatInputs: string[] = [];

    segments.forEach((segment, k) => {
        const source = sources[segment.source];
        const length = segment.end - segment.start;

        if (!source) {
            throw new MixtureInputError(`Clip ${k + 1} refers to a video that was not uploaded.`);
        }

        args.push("-ss", secs(segment.start), "-t", secs(length), "-i", source.path);

        filters.push(segmentVideoFilter(k, length, { width: W, height: H }, fps));
        filters.push(segmentAudioFilter(k, length, source.hasAudio));

        concatInputs.push(`[v${k}][a${k}]`);
    });

    filters.push(`${concatInputs.join("")}concat=n=${segments.length}:v=1:a=1[v][a]`);

    args.push(
        "-filter_complex",
        filters.join(";"),
        "-map",
        "[v]",
        "-map",
        "[a]",
        ...videoEncoderArgs(spec.video, spec.audio, quality),
        "-pix_fmt",
        "yuv420p",
        "-ac",
        "2",
        "-ar",
        "48000"
    );

    if (spec.faststart) args.push("-movflags", "+faststart");

    args.push(outputPath);

    return args;
}

/**
 * Pull what the builder needs out of ffprobe's JSON. Returns null when the file
 * has no video stream.
 */
export function readProbe(
    probe: unknown,
    path: string
): MixSource | null {
    const data = (probe ?? {}) as {
        format?: { duration?: string };
        streams?: Array<{
            codec_type?: string;
            width?: number;
            height?: number;
            duration?: string;
            tags?: { rotate?: string };
            side_data_list?: Array<{ rotation?: number }>;
        }>;
    };

    const streams = data.streams ?? [];
    const video = streams.find((stream) => stream.codec_type === "video");

    if (!video) return null;

    const rotation = Number(
        video.side_data_list?.find((entry) => typeof entry.rotation === "number")?.rotation ??
            video.tags?.rotate ??
            0
    );
    const sideways = Math.abs(rotation) % 180 === 90;
    const width = Number(video.width) || 0;
    const height = Number(video.height) || 0;

    const parsedDuration = Number(data.format?.duration ?? video.duration);

    return {
        path,
        duration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null,
        hasAudio: streams.some((stream) => stream.codec_type === "audio"),
        width: sideways ? height : width,
        height: sideways ? width : height,
    };
}
