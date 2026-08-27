import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
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
    return withUser(async (user) => {
        const profile = await ensureUserProfile(user);

        const usage = await getUsageStatus(user.uid, profile.plan);

        /*
         * The client cannot read ENABLE_PLAN_TESTING — it is a server variable
         * with no NEXT_PUBLIC prefix, deliberately, so it cannot be flipped
         * from the browser. Reporting it here is what lets the UI decide
         * whether to render the plan switcher at all.
         */
        return {
            ...usage,
            testingEnabled: process.env.ENABLE_PLAN_TESTING === "true",
        };
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
