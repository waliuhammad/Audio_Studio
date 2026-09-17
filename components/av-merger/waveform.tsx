"use client";

/**
 * Audio waveforms for the Audio Video Merger.
 *
 * decodePeaks() decodes a file in the browser and boils it down to a small
 * array of peak levels (about 100 per second, never more than 60 000 in all).
 * Decoding happens in an OfflineAudioContext at a LOW sample rate: the browser
 * resamples while decoding, so a 20-minute stereo file costs ~40 MB of floats
 * instead of ~900 MB at 48 kHz. Nothing is kept but the peaks.
 *
 * <Waveform> draws any [start, end) window of those peaks as a single SVG path
 * of a few hundred bars, stretched to its box.
 */

import { useMemo } from "react";

export interface Peaks {
    /** Peak level per bucket, 0..1, normalised to the loudest bucket. */
    data: Float32Array;
    /** Buckets per second of audio. */
    perSecond: number;
    /** Decoded length, seconds. */
    duration: number;
}

/** Past this the waveform is skipped (the file can still be merged). */
export const MAX_WAVEFORM_SECONDS = 3 * 60 * 60;

const MAX_BUCKETS = 60000;

type OfflineCtor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext;

function offlineContext(sampleRate: number): OfflineAudioContext | null {
    const w = window as unknown as {
        OfflineAudioContext?: OfflineCtor;
        webkitOfflineAudioContext?: OfflineCtor;
    };
    const Ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;

    return Ctor ? new Ctor(1, 1, sampleRate) : null;
}

/** decodeAudioData, promise-shaped even where only the callback form exists. */
function decode(context: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
        const maybe = context.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;

        maybe?.then(resolve, reject);
    });
}

/**
 * Decode `file` and return its peaks. `expectedDuration` (from the media
 * element, when known) picks the decode sample rate. Throws when the browser
 * cannot decode the file or it is too long to draw.
 */
export async function decodePeaks(file: File, expectedDuration?: number): Promise<Peaks> {
    if (expectedDuration && expectedDuration > MAX_WAVEFORM_SECONDS) {
        throw new Error("too long");
    }

    // 3 kHz is the lowest rate browsers accept; still plenty for a picture.
    const sampleRate = !expectedDuration || expectedDuration > 20 * 60 ? 3000 : 8000;
    const context = offlineContext(sampleRate);

    if (!context) throw new Error("Web Audio is not available");

    const buffer = await decode(context, await file.arrayBuffer());
    const duration = buffer.duration;

    if (!(duration > 0)) throw new Error("empty");
    if (duration > MAX_WAVEFORM_SECONDS) throw new Error("too long");

    const buckets = Math.max(1, Math.min(MAX_BUCKETS, Math.ceil(duration * 100)));
    const perSecond = buckets / duration;
    const data = new Float32Array(buckets);
    const samplesPerBucket = buffer.length / buckets;

    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const channel = buffer.getChannelData(c);

        for (let b = 0; b < buckets; b++) {
            const from = Math.floor(b * samplesPerBucket);
            const to = Math.min(channel.length, Math.floor((b + 1) * samplesPerBucket));
            let peak = data[b] ?? 0;

            for (let i = from; i < to; i++) {
                const value = Math.abs(channel[i] ?? 0);

                if (value > peak) peak = value;
            }

            data[b] = peak;
        }
    }

    let loudest = 0;

    for (const value of data) if (value > loudest) loudest = value;

    if (loudest > 0) {
        const gain = 1 / Math.max(loudest, 0.02);

        for (let b = 0; b < buckets; b++) data[b] = Math.min(1, (data[b] ?? 0) * gain);
    }

    return { data, perSecond, duration };
}

/** The window's peaks reduced to `bars` values. */
export function slicePeaks(peaks: Peaks, start: number, end: number, bars: number): number[] {
    const out: number[] = [];
    const from = Math.max(0, start * peaks.perSecond);
    const to = Math.min(peaks.data.length, end * peaks.perSecond);
    const step = (to - from) / bars;

    if (!(step > 0)) return out;

    for (let i = 0; i < bars; i++) {
        const a = Math.floor(from + i * step);
        const b = Math.max(a + 1, Math.floor(from + (i + 1) * step));
        let peak = 0;

        for (let k = a; k < b && k < peaks.data.length; k++) {
            const value = peaks.data[k] ?? 0;

            if (value > peak) peak = value;
        }

        out.push(peak);
    }

    return out;
}

export function Waveform({
    peaks,
    start = 0,
    end,
    bars,
    className = "",
}: {
    peaks: Peaks;
    start?: number;
    end?: number;
    /** Bar count; default fits the window. */
    bars?: number;
    className?: string;
}) {
    const stop = end ?? peaks.duration;
    const count = Math.max(8, Math.min(400, Math.round(bars ?? 200)));

    const d = useMemo(() => {
        const values = slicePeaks(peaks, start, stop, count);

        return values
            .map((value, i) => {
                const h = Math.max(1.5, value * 96);

                return `M${i + 0.15} ${((100 - h) / 2).toFixed(2)}h0.7v${h.toFixed(2)}h-0.7z`;
            })
            .join("");
    }, [peaks, start, stop, count]);

    return (
        <svg
            data-waveform
            viewBox={`0 0 ${count} 100`}
            preserveAspectRatio="none"
            aria-hidden
            className={`block h-full w-full ${className}`}
        >
            <path d={d} fill="currentColor" />
        </svg>
    );
}
