/**
 * Pure helpers for a clip sequence: an ordered list of pieces, each a
 * [start, end) window into some source. Nothing here knows about video, React
 * or the page — the Video Mixture page uses them today, and any other tool that
 * lays clips end to end (the Audio Video Merger, the Audio Mixture) can too.
 */

export interface SequenceClip {
    id: string;
    /** In-point inside the source, seconds. */
    start: number;
    /** Out-point inside the source, seconds. */
    end: number;
}

export const clipLength = (clip: SequenceClip): number =>
    Math.max(0, clip.end - clip.start);

/** Where each clip begins in the sequence, in seconds. */
export function clipOffsets(clips: readonly SequenceClip[]): number[] {
    const offsets: number[] = [];
    let at = 0;

    for (const clip of clips) {
        offsets.push(at);
        at += clipLength(clip);
    }

    return offsets;
}

export function sequenceLength(clips: readonly SequenceClip[]): number {
    return clips.reduce((total, clip) => total + clipLength(clip), 0);
}

/**
 * The clip playing at sequence time `time`, and how far into it. A time exactly
 * on a boundary belongs to the clip that starts there; the very end belongs to
 * the last clip. Null for an empty sequence.
 */
export function locateInSequence(
    clips: readonly SequenceClip[],
    time: number
): { index: number; offset: number } | null {
    const lastClip = clips[clips.length - 1];

    if (!lastClip) return null;

    let at = 0;

    for (const [index, clip] of clips.entries()) {
        const length = clipLength(clip);

        if (time < at + length) {
            return { index, offset: Math.max(0, time - at) };
        }

        at += length;
    }

    return { index: clips.length - 1, offset: clipLength(lastClip) };
}

/**
 * Split the clip under `time` into two. Returns null when there is nothing to
 * split there — on a boundary, or where either half would be shorter than
 * `minLength`.
 */
export function splitSequenceAt<T extends SequenceClip>(
    clips: readonly T[],
    time: number,
    newId: string,
    minLength: number
): { clips: T[]; leftIndex: number } | null {
    const hit = locateInSequence(clips, time);

    if (!hit) return null;

    const clip = clips[hit.index];

    if (!clip) return null;

    const cut = clip.start + hit.offset;

    if (cut - clip.start < minLength || clip.end - cut < minLength) return null;

    const left: T = { ...clip, end: cut };
    const right: T = { ...clip, id: newId, start: cut };
    const next = [...clips];

    next.splice(hit.index, 1, left, right);

    return { clips: next, leftIndex: hit.index };
}

/** Move one item so it ends up at index `to` of the resulting list. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    if (from < 0 || from >= list.length) return [...list];

    const next = [...list];
    const [item] = next.splice(from, 1) as [T];

    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);

    return next;
}

/** m:ss.s — tenths matter when trimming. */
export function formatClock(seconds: number, tenths = true): string {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;

    const minutes = Math.floor(seconds / 60);
    const rest = seconds - minutes * 60;
    const whole = Math.floor(rest);
    const text = tenths
        ? `${whole < 10 ? "0" : ""}${(Math.floor(rest * 10) / 10).toFixed(1)}`
        : `${whole < 10 ? "0" : ""}${whole}`;

    return `${minutes}:${text}`;
}
