import { withUser } from "@/lib/firebase/route-helpers";
import { listProjects } from "@/lib/firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — every project belonging to the signed-in user. */
export async function GET() {
    return withUser(async (user) => ({
        projects: await listProjects(user.uid),
    }));
}