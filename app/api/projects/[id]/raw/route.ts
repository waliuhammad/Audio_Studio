import { NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getItem } from "@/lib/firebase/firestore";
import {
    downloadObject,
    isOwnedObjectPath,
    StorageNotConfiguredError,
} from "@/lib/firebase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — the raw bytes of a project's stored file, same-origin.
 *
 * Used by the editor to resume a draft: it needs the bytes in JavaScript to
 * decode via the Web Audio API, and /download's redirect to Google Storage
 * can be blocked by CORS. This streams the file through our own origin
 * instead, so the browser fetch always succeeds for an owner who is signed in.
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
                { error: "This draft has no saved file yet." },
                { status: 404 }
            );
        }

        // The document is the caller's, but the path inside it is still just
        // stored data — see the note in /api/library/[id]/download. This route
        // streams the bytes back directly, so an unchecked path would be a
        // straight read of another account's file.
        if (!isOwnedObjectPath(user.uid, item.storagePath)) {
            console.error(
                "Refused a project raw read: storagePath is outside the owner's prefix.",
                { uid: user.uid, itemId: params.id }
            );

            return NextResponse.json({ error: "Not found." }, { status: 404 });
        }

        try {
            const buffer = await downloadObject(item.storagePath);

            return new NextResponse(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    "Content-Type": "audio/wav",
                    "Content-Length": String(buffer.length),
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        } catch (error) {
            if (error instanceof StorageNotConfiguredError) {
                return NextResponse.json({ error: error.message }, { status: 503 });
            }

            throw error;
        }
    });
}
