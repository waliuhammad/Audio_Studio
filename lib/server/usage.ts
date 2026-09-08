import "server-only";

import { getSessionUser } from "@/lib/firebase/session";
import { createItem, recordProcessedFile } from "@/lib/firebase/firestore";
import type { MediaKind } from "@/lib/firebase/firestore";

/**
 * What a tool run should show up as in Recent projects.
 *
 * Optional because counting a job and listing it are separate concerns — a
 * route that has already answered can still count without filing a row.
 */
export interface ToolProject {
    /** The file the user handed the tool, as they named it. */
    fileName: string;
    /** Size of that file in bytes — what the storage card adds up. */
    sizeBytes: number;
    kind: MediaKind;
    /** Human label for the tool, e.g. "Normalize". */
    tool: string;
    durationSeconds?: number;
}

/**
 * Count one finished job against the signed-in user's stats, and file it.
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
 *
 * Passing `project` also records the run in Recent projects. Tool runs used to
 * be invisible there — only files opened in the editor were listed — so work
 * done through the quick tools left no trace and contributed nothing to the
 * storage figure, despite being the main way most files get processed.
 */
export async function recordUsage(
    startedAt: number,
    project?: ToolProject
): Promise<void> {
    try {
        const user = await getSessionUser();

        if (!user) return;

        await recordProcessedFile(user.uid, (Date.now() - startedAt) / 1000);

        if (!project) return;

        /*
         * Named for the file the user recognises, with the tool alongside it,
         * because the list shows the name and nothing else — putting the tool
         * only in `meta` would make several runs of the same file
         * indistinguishable.
         */
        await createItem(user.uid, "projects", {
            name: `${project.fileName} — ${project.tool}`,
            kind: project.kind,
            sizeBytes: project.sizeBytes,
            status: "done",
            durationSeconds: project.durationSeconds,
            meta: project.tool,
        });
    } catch (error) {
        console.error("Could not record usage:", error);
    }
}
