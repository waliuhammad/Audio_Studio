/**
 * Output quality, shared by every tool that offers the dropdown.
 *
 * The four levels are the ones the tool pages already show. They were sent to
 * the server as a form field and then ignored by every route — a user could
 * pick "High · 320kbps" and receive whatever the encoder happened to default
 * to. This module is what makes the choice mean something.
 *
 * The labels name bitrates because that is what people recognise, but the
 * level is what travels: audio maps it to a bitrate, video to a CRF, and
 * lossless formats ignore it entirely, which is correct rather than an
 * oversight — see LOSSLESS below.
 */

export const QUALITY_LEVELS = ["high", "medium", "standard", "low"] as const;

export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export const DEFAULT_QUALITY: QualityLevel = "high";

/** Accept a form value, falling back rather than failing the whole request. */
export function parseQuality(value: FormDataEntryValue | null): QualityLevel {
    const raw = typeof value === "string" ? value.toLowerCase().trim() : "";

    return (QUALITY_LEVELS as readonly string[]).includes(raw)
        ? (raw as QualityLevel)
        : DEFAULT_QUALITY;
}

/* ===================================================== */
/* AUDIO                                                 */
/* ===================================================== */

/** Bitrate per level, matching the labels the tool pages display. */
const AUDIO_BITRATE: Record<QualityLevel, string> = {
    high: "320k",
    medium: "192k",
    standard: "128k",
    low: "96k",
};

/**
 * Vorbis takes a quality scale rather than a bitrate, and honours it better
 * than a forced -b:a. Roughly equivalent to the bitrates above.
 */
const VORBIS_Q: Record<QualityLevel, string> = {
    high: "8",
    medium: "5",
    standard: "3",
    low: "1",
};

/**
 * Formats where the audio is stored exactly as it came in.
 *
 * A bitrate means nothing here — WAV is uncompressed PCM and FLAC is lossless,
 * so both already carry everything the source had. Forcing -b:a would either
 * be ignored or, worse, make FFmpeg re-encode for no gain. The dropdown stays
 * visible for these so the control does not appear and disappear as the format
 * changes; it simply has nothing to do.
 */
export const LOSSLESS_AUDIO = new Set(["wav", "flac"]);

export function audioBitrateFor(quality: QualityLevel): string {
    return AUDIO_BITRATE[quality];
}

/**
 * The encoder arguments for one audio format at one quality.
 *
 * Returns the codec too, so callers keep a single source of truth instead of
 * pairing their own codec choice with a bitrate from here.
 */
export function audioEncoderArgs(
    format: string,
    quality: QualityLevel
): string[] {
    const bitrate = AUDIO_BITRATE[quality];

    switch (format) {
        case "mp3":
            return ["-c:a", "libmp3lame", "-b:a", bitrate];

        case "aac":
            return ["-c:a", "aac", "-b:a", bitrate];

        case "m4a":
            return ["-c:a", "aac", "-b:a", bitrate, "-movflags", "+faststart"];

        case "ogg":
            return ["-c:a", "libvorbis", "-q:a", VORBIS_Q[quality]];

        case "opus":
            return ["-c:a", "libopus", "-b:a", bitrate];

        case "wav":
            return ["-c:a", "pcm_s16le"];

        case "flac":
            return ["-c:a", "flac"];

        default:
            // An unknown container still gets a sensible lossy encode rather
            // than whatever the muxer would have guessed.
            return ["-c:a", "aac", "-b:a", bitrate];
    }
}

/* ===================================================== */
/* VIDEO                                                 */
/* ===================================================== */

/**
 * Constant Rate Factor per level.
 *
 * Lower is better quality and a bigger file. 18 is near-transparent for H.264
 * and 32 is visibly soft but small — a usable spread rather than four values
 * that look different and are not.
 */
const VIDEO_CRF: Record<QualityLevel, string> = {
    high: "18",
    medium: "23",
    standard: "28",
    low: "32",
};

/** VP9 uses the same scale but sits a few points higher for the same look. */
const VP9_CRF: Record<QualityLevel, string> = {
    high: "24",
    medium: "31",
    standard: "36",
    low: "40",
};

export function videoCrfFor(quality: QualityLevel): string {
    return VIDEO_CRF[quality];
}

/**
 * Video encoder arguments for a codec family at one quality.
 *
 * `codec` is the video encoder the caller already chose for the container, so
 * this only decides how hard it works — the container's codec choice stays
 * where it was.
 */
export function videoEncoderArgs(
    videoCodec: string,
    audioCodec: string,
    quality: QualityLevel
): string[] {
    const audio = [audioCodec === "copy" ? "-c:a" : "-c:a", audioCodec];
    const audioBitrate =
        audioCodec === "copy" || audioCodec === "flac"
            ? []
            : ["-b:a", AUDIO_BITRATE[quality]];

    switch (videoCodec) {
        case "libx264":
            return [
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", VIDEO_CRF[quality],
                ...audio,
                ...audioBitrate,
            ];

        case "libvpx-vp9":
            // -b:v 0 is what puts VP9 into constant-quality mode; without it
            // the CRF is treated as a ceiling and the bitrate wins.
            return [
                "-c:v", "libvpx-vp9",
                "-crf", VP9_CRF[quality],
                "-b:v", "0",
                ...audio,
                ...audioBitrate,
            ];

        case "mpeg4":
            // mpeg4 has no CRF; -q:v is its scale, 2 (best) to 31 (worst).
            return [
                "-c:v", "mpeg4",
                "-q:v", { high: "2", medium: "5", standard: "8", low: "12" }[quality],
                ...audio,
                ...audioBitrate,
            ];

        default:
            return ["-c:v", videoCodec, ...audio, ...audioBitrate];
    }
}

/* ===================================================== */
/* OVERRIDES                                             */
/* ===================================================== */

/**
 * Quality flags to APPEND after a route's own encoder arguments.
 *
 * The tool routes each keep a format table carrying flags this module has no
 * business knowing about — "-f ipod" for m4a in one place, "-movflags
 * +faststart" in another. Rewriting those tables to run through
 * audioEncoderArgs() would have thrown that detail away, so instead this
 * appends: FFmpeg takes the LAST occurrence of an option, so a trailing
 * "-b:a 320k" overrides the table's hardcoded "-b:a 192k" and leaves every
 * other flag standing.
 *
 * `format` is the container key ("mp3", "ogg", ...), which those tables also
 * expose as `ext`.
 */
export function audioQualityOverride(
    format: string,
    quality: QualityLevel
): string[] {
    // Nothing to override: both already carry the whole signal.
    if (LOSSLESS_AUDIO.has(format)) return [];

    // Vorbis is on a quality scale, not a bitrate; forcing -b:a would fight it.
    if (format === "ogg") return ["-q:a", VORBIS_Q[quality]];

    return ["-b:a", AUDIO_BITRATE[quality]];
}

/**
 * Quality flags to APPEND after a route's own VIDEO encoder arguments.
 *
 * Takes the route's existing args and reads the codec out of them rather than
 * being told: the four video routes each keep their own format table, and the
 * codec for a given container is already decided there. Detecting it here means
 * this works whatever shape that table takes, and cannot disagree with it.
 *
 * As with audio, FFmpeg honours the last occurrence, so appending "-crf 18"
 * overrides a table's hardcoded "-crf 20" without disturbing the rest.
 */
export function videoQualityOverride(
    codecArgs: readonly string[],
    quality: QualityLevel
): string[] {
    const has = (value: string) => codecArgs.includes(value);

    // Stream copy means no re-encode, so there is nothing to set.
    const copiesVideo =
        codecArgs.some((arg, i) => arg === "-c:v" && codecArgs[i + 1] === "copy");
    const copiesAudio =
        codecArgs.some((arg, i) => arg === "-c:a" && codecArgs[i + 1] === "copy");

    const audio = copiesAudio ? [] : ["-b:a", AUDIO_BITRATE[quality]];

    if (copiesVideo) return audio;

    if (has("libvpx-vp9")) {
        // -b:v 0 is what puts VP9 in constant-quality mode; without it the CRF
        // acts as a ceiling and the bitrate decides the result instead.
        return ["-crf", VP9_CRF[quality], "-b:v", "0", ...audio];
    }

    if (has("mpeg4")) {
        const QV: Record<QualityLevel, string> =
            { high: "2", medium: "5", standard: "8", low: "12" };

        return ["-q:v", QV[quality], ...audio];
    }

    // libx264 and anything else CRF-capable.
    return ["-crf", VIDEO_CRF[quality], ...audio];
}
