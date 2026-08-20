import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import {
    getItem,
    getProfile,
    moveToTrash,
    saveProjectFile,
} from "@/lib/firebase/firestore";
import {
    StorageNotConfiguredError,
    objectPathFor,
    uploadObject,
} from "@/lib/firebase/storage";
import { MAX_AUDIO_BYTES } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — one project's metadata, used by the editor to resume a draft. */
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => {
        const item = await getItem(user.uid, "projects", params.id);

        if (!item) {
            return NextResponse.json({ error: "Not found." }, { status: 404 });
        }

        return { project: item };
    });
}

/**
 * DELETE — move a project to trash.
 *
 * This is NOT a permanent delete. The item lands in users/{uid}/trash and
 * can be restored. Permanent removal is /api/trash/[id] DELETE.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => {
        // moveToTrash scopes the lookup to users/{uid}/..., so a user can never
        // reach another user's document by guessing an id.
        const moved = await moveToTrash(user.uid, "projects", params.id);

        return { success: moved };
    });
}

/**
 * PATCH — save the current state of a draft to storage.
 *
 * The project document already exists (created when the file was opened in
 * the editor), so this only ever overwrites — the same storagePath every
 * time — rather than piling up a new object per save.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => {
        const formData = await request.formData().catch(() => null);
        const file = formData?.get("file");

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { error: "No file was provided." },
                { status: 400 }
            );
        }

        if (file.size > MAX_AUDIO_BYTES) {
            return NextResponse.json(
                {
                    error: `That file is larger than the ${Math.round(
                        MAX_AUDIO_BYTES / (1024 * 1024)
                    )} MB limit.`,
                },
                { status: 413 }
            );
        }

        // Conservative check — ignores the size this draft may already be
        // charged for, so it can occasionally block a same-size re-save near
        // the limit. That is a better failure than letting the count drift.
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

        const fileName =
            typeof formData?.get("name") === "string"
                ? (formData.get("name") as string)
                : file.name;

        const durationSeconds = (() => {
            const raw = formData?.get("durationSeconds");
            const parsed = typeof raw === "string" ? Number(raw) : NaN;
            return Number.isFinite(parsed) ? parsed : undefined;
        })();

        const storagePath = objectPathFor(
            user.uid,
            "projects",
            params.id,
            fileName
        );

        try {
            await uploadObject(
                storagePath,
                Buffer.from(await file.arrayBuffer()),
                file.type || "audio/wav"
            );
        } catch (error) {
            if (error instanceof StorageNotConfiguredError) {
                return NextResponse.json({ error: error.message }, { status: 503 });
            }

            throw error;
        }

        const saved = await saveProjectFile(user.uid, params.id, {
            sizeBytes: file.size,
            storagePath,
            durationSeconds,
        });

        if (!saved) {
            return NextResponse.json(
                { error: "That project no longer exists." },
                { status: 404 }
            );
        }

        return { success: true };
    });
}