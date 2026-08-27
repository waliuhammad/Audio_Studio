/**
 * Core Web Audio helpers shared by the editor and the client-side tools.
 * Everything here is browser-only — never import it from a server component.
 */

export interface Peak {
    min: number;
    max: number;
}

export interface TimeRange {
    start: number;
    end: number;
}

type WebkitWindow = Window & {
    webkitAudioContext?: typeof AudioContext;
};

let sharedContext: AudioContext | null = null;

/**
 * A single shared AudioContext. Browsers cap how many can exist, so the
 * editor reuses one instance for the whole session.
 */
export function getAudioContext(): AudioContext {
    if (typeof window === "undefined") {
        throw new Error("AudioContext is not available during server rendering.");
    }

    if (!sharedContext || sharedContext.state === "closed") {
        const Ctor =
            window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;

        if (!Ctor) {
            throw new Error("The Web Audio API is not supported in this browser.");
        }

        sharedContext = new Ctor();
    }

    return sharedContext;
}

/** Browsers suspend audio until a user gesture — call this from click handlers. */
export function resumeAudioContext(): void {
    try {
        const ctx = getAudioContext();
        if (ctx.state === "suspended") {
            void ctx.resume();
        }
    } catch {
        /* no-op: surfaced elsewhere as a decode error */
    }
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();

    // slice(0) hands decodeAudioData its own copy — some browsers detach the original.
    return ctx.decodeAudioData(arrayBuffer.slice(0));
}

/** Create an empty buffer matching an existing buffer's channel count / rate. */
export function createMatchingBuffer(
    source: AudioBuffer,
    frameCount: number
): AudioBuffer {
    const ctx = getAudioContext();

    return ctx.createBuffer(
        source.numberOfChannels,
        Math.max(1, Math.floor(frameCount)),
        source.sampleRate
    );
}

export function getChannels(buffer: AudioBuffer): Float32Array[] {
    const channels: Float32Array[] = [];

    for (let index = 0; index < buffer.numberOfChannels; index += 1) {
        channels.push(buffer.getChannelData(index));
    }

    return channels;
}

/**
 * Reduce a buffer to `bucketCount` min/max pairs for waveform drawing.
 * One bucket per horizontal pixel keeps rendering cheap at any zoom level.
 */
export function computePeaks(buffer: AudioBuffer, bucketCount: number): Peak[] {
    const peaks: Peak[] = [];
    const frameCount = buffer.length;

    if (bucketCount <= 0 || frameCount === 0) {
        return peaks;
    }

    const channels = getChannels(buffer);
    const framesPerBucket = frameCount / bucketCount;

    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
        const start = Math.floor(bucket * framesPerBucket);
        const end = Math.min(frameCount, Math.floor((bucket + 1) * framesPerBucket));

        let min = 0;
        let max = 0;

        for (let frame = start; frame < end; frame += 1) {
            for (const channel of channels) {
                const value = channel[frame] ?? 0;
                if (value < min) min = value;
                if (value > max) max = value;
            }
        }

        peaks.push({ min, max });
    }

    return peaks;
}

/** Highest absolute sample value across every channel. */
export function getPeakAmplitude(buffer: AudioBuffer): number {
    let peak = 0;

    for (const channel of getChannels(buffer)) {
        for (let frame = 0; frame < channel.length; frame += 1) {
            const value = Math.abs(channel[frame] ?? 0);
            if (value > peak) peak = value;
        }
    }

    return peak;
}

function writeAscii(view: DataView, offset: number, text: string): void {
    for (let index = 0; index < text.length; index += 1) {
        view.setUint8(offset + index, text.charCodeAt(index));
    }
}

/** Encode an AudioBuffer as a 16-bit PCM WAV blob (lossless, no dependencies). */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
    const channelCount = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = channelCount * bytesPerSample;
    const frameCount = buffer.length;
    const dataSize = frameCount * blockAlign;

    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 8 * bytesPerSample, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);

    const channels = getChannels(buffer);
    let offset = 44;

    for (let frame = 0; frame < frameCount; frame += 1) {
        for (let channel = 0; channel < channelCount; channel += 1) {
            const raw = channels[channel]?.[frame] ?? 0;
            const clamped = Math.max(-1, Math.min(1, raw));
            const value = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

            view.setInt16(offset, value, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
}

/** "03:07" or "03:07.482" */
export function formatTime(seconds: number, withMilliseconds = false): string {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;

    const minutes = Math.floor(safe / 60);
    const wholeSeconds = Math.floor(safe % 60);

    const base = `${String(minutes).padStart(2, "0")}:${String(
        wholeSeconds
    ).padStart(2, "0")}`;

    if (!withMilliseconds) {
        return base;
    }

    const milliseconds = Math.floor((safe % 1) * 1000);

    return `${base}.${String(milliseconds).padStart(3, "0")}`;
}

/**
 * Parses a user-typed time value into seconds. Accepts "mm:ss", "mm:ss.mmm",
 * or a plain number of seconds ("7", "7.5"). Returns null when the text
 * can't be parsed, so callers can leave the field untouched on bad input.
 */
export function parseTimeInput(value: string): number | null {
    const cleaned = value.trim();
    if (!cleaned) return null;

    if (cleaned.includes(":")) {
        const parts = cleaned.split(":");
        if (parts.length !== 2) return null;

        const minutes = Number(parts[0]);
        const seconds = Number(parts[1]);

        if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
        if (minutes < 0 || seconds < 0 || seconds >= 60) return null;

        return minutes * 60 + seconds;
    }

    const seconds = Number(cleaned);
    if (!Number.isFinite(seconds) || seconds < 0) return null;

    return seconds;
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024))
    );

    const value = bytes / 1024 ** exponent;

    return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent] ?? "B"
        }`;
}

export function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Give the browser time to start the download before revoking the URL.
    // Some browsers may take longer to begin the download, so use a 5s delay.
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}