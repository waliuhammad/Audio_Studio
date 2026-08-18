import { NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getItem } from "@/lib/firebase/firestore";
import { signedDownloadUrl } from "@/lib/firebase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — redirect to a short-lived signed URL for the stored file.
 *
 * Streaming the bytes back through this route would work, but it would put
 * every megabyte through the Node process. Redirecting hands the transfer to
 * Google's CDN while ownership is still checked here: the lookup is scoped to
 * users/{uid}, so an id belonging to someone else simply is not found.
 */
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => {
        const item = await getItem(user.uid, "library", params.id);

        if (!item) {
            return NextResponse.json({ error: "Not found." }, { status: 404 });
        }

        if (!item.storagePath) {
            return NextResponse.json(
                {
                    error:
                        "This entry has no stored file. It was saved before file storage was enabled.",
                },
                { status: 404 }
            );
        }

        const url = await signedDownloadUrl(item.storagePath, item.name);

        return NextResponse.redirect(url, 302);
    });
}
