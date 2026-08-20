import { NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getItem } from "@/lib/firebase/firestore";
import { downloadObject, StorageNotConfiguredError } from "@/lib/firebase/storage";

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
