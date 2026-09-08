import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { ensureUserProfile } from "@/lib/firebase/firestore";
import { SITE } from "@/lib/seo";
import {
    createCheckoutUrl,
    isBillingConfigured,
    variantIdFor,
    type BillingInterval,
} from "@/lib/server/lemon-squeezy";
import type { Plan } from "@/lib/server/plan-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/checkout?plan=pro|business&interval=monthly|yearly
 *
 * A redirect endpoint, so the pricing buttons can be plain links that work
 * even on the public home page where there is no account context:
 *
 *   - not signed in  -> /sign-up, carrying this checkout as ?next= so the
 *     purchase resumes automatically once they have an account.
 *   - signed in       -> a fresh Lemon Squeezy checkout for the chosen price.
 *
 * Everything that decides the price and the plan is validated here on the
 * server; the query string only names a plan and an interval, never a variant
 * or an amount.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    const planParam = searchParams.get("plan");
    const intervalParam = searchParams.get("interval") ?? "monthly";

    // Only the paid plans can be bought; anything else is a bad link.
    if (planParam !== "pro" && planParam !== "business") {
        return NextResponse.redirect(new URL("/#pricing", SITE.url));
    }

    const plan = planParam as Exclude<Plan, "free">;
    const interval: BillingInterval =
        intervalParam === "yearly" ? "yearly" : "monthly";

    const user = await getSessionUser();

    if (!user) {
        // Send them to sign up, then straight back here to finish buying.
        const signUp = new URL("/sign-up", SITE.url);
        signUp.searchParams.set(
            "next",
            `/api/billing/checkout?plan=${plan}&interval=${interval}`
        );

        return NextResponse.redirect(signUp);
    }

    if (!isBillingConfigured()) {
        const settings = new URL("/settings", SITE.url);
        settings.searchParams.set("billing", "unconfigured");

        return NextResponse.redirect(settings);
    }

    const variantId = variantIdFor(plan, interval);

    if (!variantId) {
        // The plan/interval combination has no variant id set in the env.
        const settings = new URL("/settings", SITE.url);
        settings.searchParams.set("billing", "unavailable");

        return NextResponse.redirect(settings);
    }

    try {
        const profile = await ensureUserProfile(user);

        const url = await createCheckoutUrl({
            variantId,
            email: profile.email || user.email,
            uid: user.uid,
            name: profile.name || user.name,
            // Back to settings after payment; the webhook has usually landed
            // by the time the page loads, so the new plan is already showing.
            redirectUrl: new URL(
                "/settings?billing=success",
                SITE.url
            ).toString(),
        });

        return NextResponse.redirect(url);
    } catch (error) {
        console.error("Could not start checkout:", error);

        const settings = new URL("/settings", SITE.url);
        settings.searchParams.set("billing", "error");

        return NextResponse.redirect(settings);
    }
}