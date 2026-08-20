import { NextRequest } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { createItem, listProjects } from "@/lib/firebase/firestore";

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

        const id = await createItem(user.uid, "projects", {
            name,
            kind: "audio",
            sizeBytes: 0,
            status: "draft",
        });

        return { id, name, status: "draft" as const };
    });
}