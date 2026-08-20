"use client";

/**
 * Record a processed file in the user's dashboard.
 *
 * Metadata only — the file itself is never uploaded. That keeps the privacy
 * promise ("your file never leaves this device" for client-side tools, and
 * "deleted the moment it's returned" for server-side ones) while still giving
 * people a history of what they worked on.
 *
 * Deliberately never throws. A failed history write must not break a tool that
 * already produced the user's file — losing a dashboard row is a minor
 * annoyance, losing their download is not.
 */

export type RecordKind = "audio" | "video" | "image";

export interface RecordProjectInput {
    /** Output file name, e.g. "podcast-trimmed.mp3". */
    name: string;
    kind?: RecordKind;
    /** Size of the OUTPUT in bytes, for display only. */
    sizeBytes?: number;
    durationSeconds?: number;
    /** Short label shown under the name, e.g. "Trimmed · 128 kbps". */
    meta?: string;
}

/** Guess the media kind from a file name when the caller doesn't say. */
export function kindFromName(fileName: string): RecordKind {
    const lower = fileName.toLowerCase();

    if (/\.(mp4|mov|mkv|webm|avi|m4v)$/.test(lower)) return "video";
    if (/\.(png|jpe?g|gif|webp|avif)$/.test(lower)) return "image";

    return "audio";
}

export async function recordProject(
    input: RecordProjectInput
): Promise<boolean> {
    try {
        const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: input.name,
                kind: input.kind ?? kindFromName(input.name),
                sizeBytes: input.sizeBytes ?? 0,
                durationSeconds: input.durationSeconds,
                meta: input.meta,
                status: "done",
            }),
        });

        // 401 simply means nobody is signed in. Tools work without an account,
        // so that is expected and not worth logging as an error.
        if (response.status === 401) return false;

        return response.ok;
    } catch {
        // Offline, blocked, or the route is unavailable. Silent by design.
        return false;
    }
}