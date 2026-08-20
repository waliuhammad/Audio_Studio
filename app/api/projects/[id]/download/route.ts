import { NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getItem } from "@/lib/firebase/firestore";
import { signedDownloadUrl } from "@/lib/firebase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — redirect to a short-lived signed URL for a project's stored file.
 *
 * Mirrors /api/library/[id]/download. Used by the editor to pull a saved
 * draft's audio back down when resuming from Recent projects.
 */
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => {
        const item = await getItem(user.uid, "projects", params.id);

        if (!item) {
            return NextResponse.json({ error: "Not found." }, { status: 404 });
        }

        if (!item.storagePath) {
            return NextResponse.json(
                {
                    error:
                        "This draft has no saved file yet — nothing has been saved to it.",
                },
                { status: 404 }
            );
        }

        const url = await signedDownloadUrl(item.storagePath, item.name);

        return NextResponse.redirect(url, 302);
    });
}
