/**
 * Audio Video Merger — the pure part of the route: request parsing and the
 * FFmpeg argument list. No Next.js and no I/O, so it can be run directly
 * against a local ffmpeg with generated files.
 *
 * The output is laid out on one timeline:
 *
 *   video track  the chosen segments of the uploaded video, end to end. Its
 *                length IS the output length.
 *   audio track  the chosen segments of the uploaded audio, end to end,
 *                starting `audioOffset` seconds in. Whatever runs past the end
 *                of the video is cut; where there is no audio, there is
 *                silence.
 *
 * "replace" uses only the audio track; "mix" lays it over the video's own
 * sound (silence when the video has none).
 *
 * Segment handling is shared with Video Mixture (lib/server/video-mixture.ts):
 * one input per segment (`-ss START -t LENGTH -i file`), each normalised and
 * then joined with concat — see that file for why this is the memory-safe
 * shape.
 */

import { videoEncoderArgs, type QualityLevel } from "./quality";
import {
    MIXTURE_LIMITS,
    MixtureInputError,
    fitSegmentEnd,
    outputSize,
    parseSegmentTimes,
    secs,
    segmentAudioFilter,
    segmentVideoFilter,
    silenceFilter,
    type MixSource,
} from "./video-mixture";

export const AV_MERGE_LIMITS = {
    /** Per track. */
    maxSegments: MIXTURE_LIMITS.maxSegments,
    /** Longest output, seconds — the video track's length. */
    maxTotal: MIXTURE_LIMITS.maxTotal,
    minSegment: MIXTURE_LIMITS.minSegment,
    fps: MIXTURE_LIMITS.fps,
} as const;

/**
 * Every format re-encodes, so every one honours the quality level:
 * libx264 / VP9 by CRF, mpeg4 (AVI) by -q:v. FLV carries H.264 + AAC — the
 * old Sorenson "flv" encoder ignored -crf entirely.
 */
export const AV_MERGE_FORMATS = {
    mp4: { ext: "mp4", contentType: "video/mp4", video: "libx264", audio: "aac", faststart: true },
    mov: { ext: "mov", contentType: "video/quicktime", video: "libx264", audio: "aac", faststart: true },
    mkv: { ext: "mkv", contentType: "video/x-matroska", video: "libx264", audio: "aac", faststart: false },
    webm: { ext: "webm", contentType: "video/webm", video: "libvpx-vp9", audio: "libopus", faststart: false },
    avi: { ext: "avi", contentType: "video/x-msvideo", video: "mpeg4", audio: "libmp3lame", faststart: false },
    flv: { ext: "flv", contentType: "video/x-flv", video: "libx264", audio: "aac", faststart: false },
} as const;

export type AvMergeFormat = keyof typeof AV_MERGE_FORMATS;
export type AvMergeMode = "replace" | "mix";

export function isAvMergeFormat(value: string): value is AvMergeFormat {
    return Object.prototype.hasOwnProperty.call(AV_MERGE_FORMATS, value);
}

/** A [start, end) window into one file, seconds. */
export interface TimeSegment {
    start: number;
    end: number;
}

export interface AudioSource {
    path: string;
    /** Seconds, or null when the container does not say. */
    duration: number | null;
}

type Track = "video" | "audio";

const capital = (track: Track) => (track === "video" ? "Video" : "Audio");

/**
 * Parse a `videoSegments` / `audioSegments` field. Absent or blank means
 * "the whole file" and returns null — that is what an older client sends.
 */
export function parseTrack(raw: unknown, track: Track): TimeSegment[] | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== "string") {
        throw new MixtureInputError(`The ${track} clips could not be read.`);
    }
    if (raw.trim() === "") return null;

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new MixtureInputError(`The ${track} clips could not be read.`);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new MixtureInputError(`Keep at least one clip on the ${track} track.`);
    }

    if (parsed.length > AV_MERGE_LIMITS.maxSegments) {
        throw new MixtureInputError(
            `The ${track} track can have at most ${AV_MERGE_LIMITS.maxSegments} clips.`
        );
    }

    return parsed.map((item, index) =>
        parseSegmentTimes(
            (item ?? {}) as Record<string, unknown>,
            `${capital(track)} clip ${index + 1}`,
            track
        )
    );
}

/** `audioOffset`: seconds ≥ 0; absent means 0. */
export function parseOffset(raw: unknown): number {
    if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) {
        return 0;
    }

    const value = typeof raw === "string" ? Number(raw) : NaN;

    if (!Number.isFinite(value) || value < 0) {
        throw new MixtureInputError("The audio start time is invalid.");
    }

    if (value > AV_MERGE_LIMITS.maxTotal) {
        throw new MixtureInputError("The audio starts after the end of the video.");
    }

    return value;
}

/**
 * Fit a track to its probed file: null (no field) becomes the whole file;
 * ends are clamped to the file's length.
 */
export function fitTrack(
    segments: readonly TimeSegment[] | null,
    duration: number | null,
    track: Track
): TimeSegment[] {
    if (segments === null) {
        if (duration === null) {
            throw new MixtureInputError(`Could not read how long the ${track} file is.`);
        }

        return [{ start: 0, end: duration }];
    }

    return segments.map((segment, index) => ({
        start: segment.start,
        end: fitSegmentEnd(segment, duration, `${capital(track)} clip ${index + 1}`, track),
    }));
}

export const trackLength = (segments: readonly TimeSegment[]) =>
    segments.reduce((total, segment) => total + (segment.end - segment.start), 0);

/**
 * The part of the audio track that lands inside the output: segments that
 * start after the end are dropped and the last one kept is shortened, so
 * nothing past the end is decoded.
 */
export function audibleSegments(
    segments: readonly TimeSegment[],
    offset: number,
    total: number
): TimeSegment[] {
    const room = total - offset;
    const kept: TimeSegment[] = [];
    let at = 0;

    for (const segment of segments) {
        if (room - at < 0.02) break;

        const length = Math.min(segment.end - segment.start, room - at);

        kept.push({ start: segment.start, end: segment.start + length });
        at += length;
    }

    return kept;
}

/** What the route learned about the audio upload; null = no audio stream. */
export function readAudioProbe(probe: unknown, path: string): AudioSource | null {
    const data = (probe ?? {}) as {
        format?: { duration?: string };
        streams?: Array<{ codec_type?: string; duration?: string }>;
    };
    const stream = (data.streams ?? []).find((s) => s.codec_type === "audio");

    if (!stream) return null;

    const duration = Number(data.format?.duration ?? stream.duration);

    return { path, duration: Number.isFinite(duration) && duration > 0 ? duration : null };
}

export function buildAvMergeArgs(options: {
    video: MixSource;
    audio: AudioSource;
    videoSegments: readonly TimeSegment[];
    audioSegments: readonly TimeSegment[];
    audioOffset: number;
    mode: AvMergeMode;
    format: AvMergeFormat;
    quality: QualityLevel;
    outputPath: string;
}): string[] {
    const { video, audio, videoSegments, audioOffset, mode, format, quality, outputPath } = options;
    const spec = AV_MERGE_FORMATS[format];
    const total = trackLength(videoSegments);

    if (videoSegments.length === 0 || total <= 0) {
        throw new MixtureInputError("Keep at least one clip on the video track.");
    }

    if (total > AV_MERGE_LIMITS.maxTotal) {
        throw new MixtureInputError(
            `The finished video can be at most ${AV_MERGE_LIMITS.maxTotal / 60} minutes long.`
        );
    }

    const size = outputSize(video.width, video.height);
    const args: string[] = ["-y", "-hide_banner", "-nostdin"];
    const filters: string[] = [];
    const joined: string[] = [];
    const mix = mode === "mix";

    videoSegments.forEach((segment, k) => {
        const length = segment.end - segment.start;

        args.push("-ss", secs(segment.start), "-t", secs(length), "-i", video.path);
        filters.push(segmentVideoFilter(k, length, size, AV_MERGE_LIMITS.fps));

        if (mix) {
            // The video's own sound, or silence where it has none.
            filters.push(segmentAudioFilter(k, length, video.hasAudio, `va${k}`));
            joined.push(`[v${k}][va${k}]`);
        } else {
            joined.push(`[v${k}]`);
        }
    });

    filters.push(
        `${joined.join("")}concat=n=${videoSegments.length}:v=1:a=${mix ? 1 : 0}[v]${mix ? "[va]" : ""}`
    );

    // The new audio track, placed on the output timeline.
    const audible = audibleSegments(options.audioSegments, audioOffset, total);
    const first = videoSegments.length;

    if (audible.length > 0) {
        const parts: string[] = [];

        audible.forEach((segment, j) => {
            const length = segment.end - segment.start;

            args.push("-ss", secs(segment.start), "-t", secs(length), "-i", audio.path);
            filters.push(segmentAudioFilter(first + j, length, true, `b${j}`));
            parts.push(`[b${j}]`);
        });

        const delayMs = Math.round(audioOffset * 1000);

        filters.push(
            `${parts.join("")}concat=n=${audible.length}:v=0:a=1,` +
                (delayMs > 0 ? `adelay=delays=${delayMs}|${delayMs},` : "") +
                `apad,atrim=duration=${secs(total)}[na]`
        );
    } else {
        filters.push(silenceFilter(total, "na"));
    }

    if (mix) {
        filters.push("[va][na]amix=inputs=2:duration=first:normalize=0[a]");
    }

    args.push(
        "-filter_complex",
        filters.join(";"),
        "-map",
        "[v]",
        "-map",
        mix ? "[a]" : "[na]",
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
