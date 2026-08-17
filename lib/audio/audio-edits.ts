/**
 * Pure, non-destructive AudioBuffer transforms.
 * Every function returns a NEW buffer so the editor's undo stack stays valid.
 */

import {
    clamp,
    createMatchingBuffer,
    getChannels,
    getPeakAmplitude,
} from "./audio-utils";

function secondsToFrames(buffer: AudioBuffer, seconds: number): number {
    return Math.round(clamp(seconds, 0, buffer.duration) * buffer.sampleRate);
}

/** Keep only the audio between `start` and `end` (seconds). */
export function trimToRange(
    buffer: AudioBuffer,
    start: number,
    end: number
): AudioBuffer {
    const startFrame = secondsToFrames(buffer, Math.min(start, end));
    const endFrame = secondsToFrames(buffer, Math.max(start, end));
    const length = Math.max(1, endFrame - startFrame);

    const output = createMatchingBuffer(buffer, length);
    const sourceChannels = getChannels(buffer);

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const source = sourceChannels[channel];
        if (!source) continue;

        output
            .getChannelData(channel)
            .set(source.subarray(startFrame, startFrame + length));
    }

    return output;
}

/** Remove the audio between `start` and `end`, closing the gap. */
export function deleteRange(
    buffer: AudioBuffer,
    start: number,
    end: number
): AudioBuffer {
    const startFrame = secondsToFrames(buffer, Math.min(start, end));
    const endFrame = secondsToFrames(buffer, Math.max(start, end));
    const removed = endFrame - startFrame;
    const length = Math.max(1, buffer.length - removed);

    const output = createMatchingBuffer(buffer, length);
    const sourceChannels = getChannels(buffer);

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const source = sourceChannels[channel];
        if (!source) continue;

        const target = output.getChannelData(channel);

        target.set(source.subarray(0, startFrame), 0);
        target.set(source.subarray(endFrame), startFrame);
    }

    return output;
}

/** Duplicate a buffer so callers can mutate safely. */
export function cloneBuffer(buffer: AudioBuffer): AudioBuffer {
    const output = createMatchingBuffer(buffer, buffer.length);
    const sourceChannels = getChannels(buffer);

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const source = sourceChannels[channel];
        if (!source) continue;

        output.getChannelData(channel).set(source);
    }

    return output;
}

/** Multiply amplitude by `gain` (1 = unchanged). Clipped to [-1, 1]. */
export function applyGain(buffer: AudioBuffer, gain: number): AudioBuffer {
    const output = cloneBuffer(buffer);

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const data = output.getChannelData(channel);

        for (let frame = 0; frame < data.length; frame += 1) {
            data[frame] = clamp((data[frame] ?? 0) * gain, -1, 1);
        }
    }

    return output;
}

/** Convert a decibel change into a linear gain multiplier. */
export function decibelsToGain(decibels: number): number {
    return 10 ** (decibels / 20);
}

/** Ramp volume up across a range (equal-power curve). */
export function applyFadeIn(
    buffer: AudioBuffer,
    start: number,
    end: number
): AudioBuffer {
    return applyFade(buffer, start, end, "in");
}

/** Ramp volume down across a range (equal-power curve). */
export function applyFadeOut(
    buffer: AudioBuffer,
    start: number,
    end: number
): AudioBuffer {
    return applyFade(buffer, start, end, "out");
}

function applyFade(
    buffer: AudioBuffer,
    start: number,
    end: number,
    direction: "in" | "out"
): AudioBuffer {
    const output = cloneBuffer(buffer);

    const startFrame = secondsToFrames(buffer, Math.min(start, end));
    const endFrame = secondsToFrames(buffer, Math.max(start, end));
    const span = endFrame - startFrame;

    if (span <= 0) {
        return output;
    }

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const data = output.getChannelData(channel);

        for (let frame = startFrame; frame < endFrame; frame += 1) {
            const progress = (frame - startFrame) / span;
            const ratio = direction === "in" ? progress : 1 - progress;

            // Equal-power curve sounds smoother than a straight line.
            data[frame] = (data[frame] ?? 0) * Math.sin((ratio * Math.PI) / 2);
        }
    }

    return output;
}

/** Scale the whole buffer so its loudest peak sits at `targetPeak`. */
export function normalize(buffer: AudioBuffer, targetPeak = 0.98): AudioBuffer {
    const peak = getPeakAmplitude(buffer);

    if (peak <= 0.00001) {
        return cloneBuffer(buffer);
    }

    return applyGain(buffer, targetPeak / peak);
}

/** Reverse the whole buffer, or just the given range. */
export function reverse(
    buffer: AudioBuffer,
    start?: number,
    end?: number
): AudioBuffer {
    const output = cloneBuffer(buffer);

    const startFrame =
        start === undefined ? 0 : secondsToFrames(buffer, Math.min(start, end ?? 0));
    const endFrame =
        end === undefined
            ? buffer.length
            : secondsToFrames(buffer, Math.max(start ?? 0, end));

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const data = output.getChannelData(channel);

        let head = startFrame;
        let tail = endFrame - 1;

        while (head < tail) {
            const temp = data[head] ?? 0;
            data[head] = data[tail] ?? 0;
            data[tail] = temp;

            head += 1;
            tail -= 1;
        }
    }

    return output;
}

/** Insert silence at `position` (seconds). */
export function insertSilence(
    buffer: AudioBuffer,
    position: number,
    seconds: number
): AudioBuffer {
    const insertFrames = Math.max(0, Math.round(seconds * buffer.sampleRate));

    if (insertFrames === 0) {
        return cloneBuffer(buffer);
    }

    const positionFrame = secondsToFrames(buffer, position);
    const output = createMatchingBuffer(buffer, buffer.length + insertFrames);
    const sourceChannels = getChannels(buffer);

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
        const source = sourceChannels[channel];
        if (!source) continue;

        const target = output.getChannelData(channel);

        target.set(source.subarray(0, positionFrame), 0);
        target.set(source.subarray(positionFrame), positionFrame + insertFrames);
    }

    return output;
}

/**
 * Resample to change playback speed.
 * Note: this shifts pitch too (like tape speed). The FFmpeg backend route
 * handles tempo-only changes when we wire up server-side processing.
 */
export async function changeSpeed(
    buffer: AudioBuffer,
    rate: number
): Promise<AudioBuffer> {
    const safeRate = clamp(rate, 0.25, 4);

    if (Math.abs(safeRate - 1) < 0.001) {
        return cloneBuffer(buffer);
    }

    const frameCount = Math.max(1, Math.ceil(buffer.length / safeRate));

    const offline = new OfflineAudioContext(
        buffer.numberOfChannels,
        frameCount,
        buffer.sampleRate
    );

    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = safeRate;
    source.connect(offline.destination);
    source.start();

    return offline.startRendering();
}