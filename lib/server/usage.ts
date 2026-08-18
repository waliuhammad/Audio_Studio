import "server-only";

import { getSessionUser } from "@/lib/firebase/session";
import { recordProcessedFile } from "@/lib/firebase/firestore";

/**
 * Count one finished job against the signed-in user's stats.
 *
 * Two things this deliberately does NOT do:
 *
 * - Require a session. Every tool works signed-out, and a job that nobody owns
 *   simply is not counted rather than being rejected.
 * - Throw. The user already has their file by the time this runs; failing the
 *   whole request because a counter could not be incremented would turn a
 *   successful conversion into an error.
 *
 * `startedAt` is a Date.now() taken at the top of the handler, so the recorded
 * duration is real wall-clock processing time rather than a guess.
 */
export async function recordUsage(startedAt: number): Promise<void> {
    try {
        const user = await getSessionUser();

        if (!user) return;

        await recordProcessedFile(user.uid, (Date.now() - startedAt) / 1000);
    } catch (error) {
        console.error("Could not record usage:", error);
    }
}
