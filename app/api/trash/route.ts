import { withUser } from "@/lib/firebase/route-helpers";
import { emptyTrash, listTrash } from "@/lib/firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — everything currently in the trash. */
export async function GET() {
    return withUser(async (user) => ({
        items: await listTrash(user.uid),
    }));
}

/**
 * DELETE — empty the trash permanently.
 *
 * emptyTrash() chunks its batches at 450 operations because Firestore
 * hard-caps a batch at 500.
 */
export async function DELETE() {
    return withUser(async (user) => ({
        deleted: await emptyTrash(user.uid),
    }));
}