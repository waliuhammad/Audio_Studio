import { NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getSessionUser } from "@/lib/firebase/session";
import { ensureUserProfile } from "@/lib/firebase/firestore";
import { getUsageStatus } from "@/lib/server/plan-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — how many tool runs are left today.
 *
 * Read-only: it never claims a run. The dashboard reads this on load, and
 * looking at a page must not spend someone's allowance.
 */
export async function GET() {
    const user = await getSessionUser();

    /*
     * Anonymous callers get an answer rather than a 401.
     *
     * The usage meter is rendered from layouts that also serve signed-out
     * visitors, and an error response there is indistinguishable from a
     * failure. signedIn false says plainly that there is nothing to report,
     * without the caller having to treat a 401 as a normal outcome.
     */
    if (!user) {
        return NextResponse.json({ signedIn: false });
    }

    return withUser(async (sessionUser) => {
        const profile = await ensureUserProfile(sessionUser);

        const usage = await getUsageStatus(sessionUser.uid, profile.plan);

        return { ...usage, signedIn: true };
    });
}
