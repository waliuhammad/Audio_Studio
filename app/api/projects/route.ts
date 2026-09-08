import { NextRequest } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import {
    createItem,
    listProjects,
    recordProcessedFile,
} from "@/lib/firebase/firestore";

import { MAX_VIDEO_BYTES } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — every project belonging to the signed-in user. */
export async function GET() {
    return withUser(async (user) => ({
        projects: await listProjects(user.uid),
    }));
}

/**
 * POST — start a new draft project.
 *
 * Called the moment a file is opened in the editor, before anything has
 * actually been saved anywhere. The record exists purely so the project
 * shows up as "in progress" and can be found again — an empty draft with
 * sizeBytes 0 and no storagePath. "Save draft" (PATCH /api/projects/[id])
 * is what fills in a real file.
 */
export async function POST(request: NextRequest) {
    return withUser(async (user) => {
        const body = await request.json().catch(() => ({}));

        const name =
            typeof body?.name === "string" && body.name.trim()
                ? body.name.trim()
                : "Untitled project";

        /*
         * The size of the file the user opened.
         *
         * Previously hardcoded to 0, which meant the dashboard's storage card
         * summed a column of zeroes no matter how much had been worked on.
         * Clamped and capped so a client cannot inflate its own usage figure
         * by claiming an absurd number.
         */
        const rawSize = (body as Record<string, unknown>)?.sizeBytes;

        const sizeBytes =
            typeof rawSize === "number" && Number.isFinite(rawSize)
                ? Math.min(Math.max(0, Math.round(rawSize)), MAX_VIDEO_BYTES)
                : 0;

        const rawDuration = (body as Record<string, unknown>)?.durationSeconds;

        const durationSeconds =
            typeof rawDuration === "number" && Number.isFinite(rawDuration)
                ? Math.max(0, Math.round(rawDuration))
                : undefined;

        const id = await createItem(user.uid, "projects", {
            name,
            kind: "audio",
            sizeBytes,
            durationSeconds,
            status: "draft",
        });

        /*
         * Opening a file IS processing one, as far as the user is concerned —
         * they picked a file and the app did work with it. Counting only
         * server-side tool runs left "Files processed" stuck at zero for
         * anyone who works purely in the editor.
         */
        void recordProcessedFile(user.uid, 0).catch((error) => {
            console.error("Could not record the processed file:", error);
        });

        return { id, name, status: "draft" as const };
    });
}