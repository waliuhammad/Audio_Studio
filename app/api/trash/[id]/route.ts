import { withUser } from "@/lib/firebase/route-helpers";
import { deleteForever, restoreFromTrash } from "@/lib/firebase/firestore";

export const runtime = "nodejs";

/**
 * PATCH — restore an item to wherever it came from.
 *
 * The trash document stores an `origin` field, so a restored item returns
 * to projects or library correctly rather than always landing in one.
 */
export async function PATCH(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => ({
        success: await restoreFromTrash(user.uid, params.id),
    }));
}

/** DELETE — permanent and irreversible. Frees the storage quota too. */
export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => ({
        success: await deleteForever(user.uid, params.id),
    }));
}