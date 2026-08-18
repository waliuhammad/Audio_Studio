import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import {
    createItem,
    deleteItemRecord,
    getProfile,
    listLibrary,
    updateItem,
    type MediaKind,
} from "@/lib/firebase/firestore";
import {
    StorageNotConfiguredError,
    objectPathFor,
    uploadObject,
} from "@/lib/firebase/storage";
import { MAX_AUDIO_BYTES, MAX_VIDEO_BYTES } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — every library asset belonging to the signed-in user. */
export async function GET() {
    return withUser(async (user) => ({
        items: await listLibrary(user.uid),
    }));
}

function kindFor(contentType: string, fileName: string): MediaKind {
    if (contentType.startsWith("video/")) return "video";
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("audio/")) return "audio";

    // Blobs built in the browser sometimes arrive as application/octet-stream,
    // so fall back to the extension rather than mislabelling everything audio.
    return /\.(mp4|mov|mkv|webm|avi)$/i.test(fileName) ? "video" : "audio";
}

/**
 * POST — save a file to the library.
 *
 * The Firestore document is created FIRST so its id can name the storage
 * folder. If the upload then fails the row is removed again, because a library
 * entry pointing at a file that was never written is worse than no entry: it
 * looks saved and fails on download.
 */
export async function POST(request: NextRequest) {
    return withUser(async (user) => {
        const formData = await request.formData().catch(() => null);
        const file = formData?.get("file");

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { error: "No file was uploaded." },
                { status: 400 }
            );
        }

        const contentType = file.type || "application/octet-stream";
        const kind = kindFor(contentType, file.name);
        const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;

        if (file.size > limit) {
            return NextResponse.json(
                {
                    error: `That file is larger than the ${Math.round(
                        limit / (1024 * 1024)
                    )} MB limit.`,
                },
                { status: 413 }
            );
        }

        // Quota is checked before the write, not after — otherwise the first
        // over-limit upload still lands and only the next one is refused.
        const profile = await getProfile(user.uid);

        if (
            profile &&
            profile.storageUsedBytes + file.size > profile.storageLimitBytes
        ) {
            return NextResponse.json(
                {
                    error:
                        "That would put you over your storage limit. Delete something first, or upgrade.",
                },
                { status: 413 }
            );
        }

        const rawName = typeof formData?.get("name") === "string"
            ? (formData.get("name") as string)
            : file.name;

        const name = rawName.trim() || file.name || "Untitled";

        const meta =
            typeof formData?.get("meta") === "string"
                ? (formData.get("meta") as string)
                : undefined;

        const itemId = await createItem(user.uid, "library", {
            name,
            kind,
            sizeBytes: file.size,
            meta,
        });

        const storagePath = objectPathFor(user.uid, "library", itemId, name);

        try {
            await uploadObject(
                storagePath,
                Buffer.from(await file.arrayBuffer()),
                contentType
            );
        } catch (error) {
            await deleteItemRecord(user.uid, "library", itemId, file.size);

            if (error instanceof StorageNotConfiguredError) {
                return NextResponse.json({ error: error.message }, { status: 503 });
            }

            throw error;
        }

        await updateItem(user.uid, "library", itemId, { storagePath });

        return { id: itemId, name, kind, sizeBytes: file.size };
    });
}
