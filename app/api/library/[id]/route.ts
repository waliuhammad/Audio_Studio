import { withUser } from "@/lib/firebase/route-helpers";
import { moveToTrash } from "@/lib/firebase/firestore";

export const runtime = "nodejs";

/** DELETE — move a library item to trash (recoverable). */
export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    return withUser(async (user) => {
        const moved = await moveToTrash(user.uid, "library", params.id);

        return { success: moved };
    });
}