import { withUser } from "@/lib/firebase/route-helpers";
import { moveToTrash } from "@/lib/firebase/firestore";

export const runtime = "nodejs";

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