import "server-only";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { ensureUserProfile } from "@/lib/firebase/firestore";
import { claimToolRun, type UsageStatus } from "./plan-limits";

/**
 * The gate every tool route passes through.
 *
 * Two jobs, in order: confirm there is a signed-in user, then claim one of
 * their runs for today. Both happen BEFORE any processing starts — checking
 * afterwards would mean the work was already done and paid for, which defeats
 * the point of a limit.
 *
 * A route returning a NextResponse from this has been refused and should
 * return it unchanged. Anything else carries the user and their remaining
 * allowance.
 */

export interface ToolAccess {
    uid: string;
    usage: UsageStatus;
}

export async function guardToolRun(): Promise<NextResponse | ToolAccess> {
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json(
            {
                error: "Sign in to use this tool.",
                code: "auth-required",
            },
            { status: 401 }
        );
    }

    // Reads the plan from Firestore rather than the session token: an upgrade
    // takes effect immediately instead of waiting for the cookie to be
    // reminted, which can be days.
    const profile = await ensureUserProfile(user);

    const claim = await claimToolRun(user.uid, profile.plan);

    if (!claim.allowed) {
        return NextResponse.json(
            {
                error: `You've used all ${claim.limit} of today's ${claim.plan} plan runs. The count resets at midnight UTC.`,
                code: "daily-limit-reached",
                used: claim.used,
                limit: claim.limit,
                plan: claim.plan,
            },
            { status: 429 }
        );
    }

    return { uid: user.uid, usage: claim };
}

/** Narrowing helper so routes can read as a straight early return. */
export function isRefused(
    result: NextResponse | ToolAccess
): result is NextResponse {
    return result instanceof NextResponse;
}
