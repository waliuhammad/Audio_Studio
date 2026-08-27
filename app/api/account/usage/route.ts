import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getSessionUser } from "@/lib/firebase/session";
import { ensureUserProfile, updateUserPlan } from "@/lib/firebase/firestore";
import { getUsageStatus, type Plan } from "@/lib/server/plan-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — how many tool runs are left today.
 *
 * Read-only: it never claims a run. The dashboard reads this on load, and
 * looking at a page must not spend someone's allowance.
 */
export async function GET() {
    /*
     * ENABLE_PLAN_TESTING has no NEXT_PUBLIC prefix on purpose, so the browser
     * can neither read nor forge it. Reporting it here is what lets the UI
     * decide whether to show the plan switcher at all.
     */
    const testingEnabled = process.env.ENABLE_PLAN_TESTING === "true";

    const user = await getSessionUser();

    /*
     * Anonymous callers get an answer rather than a 401.
     *
     * The switcher is mounted on every page including the marketing pages,
     * where nobody is signed in yet — answering with an error meant it simply
     * vanished there, which reads as the feature being broken rather than as
     * "sign in first". There is no usage to report without an account, so the
     * numbers are omitted and the flag stands alone.
     */
    if (!user) {
        return NextResponse.json({ signedIn: false, testingEnabled });
    }

    return withUser(async (sessionUser) => {
        const profile = await ensureUserProfile(sessionUser);

        const usage = await getUsageStatus(sessionUser.uid, profile.plan);

        return { ...usage, signedIn: true, testingEnabled };
    });
}

const PLANS: Plan[] = ["free", "pro", "studio"];

/**
 * PATCH — switch the current user's plan, for testing.
 *
 * Changing a plan is normally something billing does, not the account holder.
 * This exists so the three tiers can be checked against real limits without a
 * payment provider, and it is deliberately limited to the CALLER's own account:
 * it can never touch anyone else's.
 *
 * ENABLE_PLAN_TESTING must be set. Without it the endpoint refuses, so
 * shipping this to production without meaning to cannot hand users a free
 * upgrade — the switch has to be thrown deliberately.
 */
export async function PATCH(request: NextRequest) {
    return withUser(async (user) => {
        if (process.env.ENABLE_PLAN_TESTING !== "true") {
            return NextResponse.json(
                { error: "Plan switching is disabled." },
                { status: 403 }
            );
        }

        const body = (await request.json().catch(() => null)) as {
            plan?: unknown;
        } | null;

        const plan = typeof body?.plan === "string" ? body.plan : "";

        if (!PLANS.includes(plan as Plan)) {
            return NextResponse.json(
                { error: `Plan must be one of: ${PLANS.join(", ")}.` },
                { status: 400 }
            );
        }

        await updateUserPlan(user.uid, plan as Plan);

        return getUsageStatus(user.uid, plan as Plan);
    });
}
