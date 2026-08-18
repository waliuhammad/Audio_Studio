import { withUser } from "@/lib/firebase/route-helpers";
import { listLibrary } from "@/lib/firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — every library asset belonging to the signed-in user. */
export async function GET() {
    return withUser(async (user) => ({
        items: await listLibrary(user.uid),
    }));
}