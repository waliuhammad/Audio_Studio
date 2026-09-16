import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { ensureUserProfile } from "@/lib/firebase/firestore";
import {
    billingReturnOrigin,
    createCheckoutUrl,
    isBillingConfigured,
    subscriptionGrantsAccess,
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
 *
 * Every redirect below is built against the origin THIS request arrived on
 * rather than SITE.url — see billingReturnOrigin for why.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const origin = billingReturnOrigin(request);

    const planParam = searchParams.get("plan");
    const intervalParam = searchParams.get("interval") ?? "monthly";

    // Only the paid plans can be bought; anything else is a bad link.
    if (planParam !== "pro" && planParam !== "business") {
        return NextResponse.redirect(new URL("/#pricing", origin));
    }

    const plan = planParam as Exclude<Plan, "free">;
    const interval: BillingInterval =
        intervalParam === "yearly" ? "yearly" : "monthly";

    const user = await getSessionUser();

    if (!user) {
        // Send them to sign up, then straight back here to finish buying.
        const signUp = new URL("/sign-up", origin);
        signUp.searchParams.set(
            "next",
            `/api/billing/checkout?plan=${plan}&interval=${interval}`
        );

        return NextResponse.redirect(signUp);
    }

    if (!isBillingConfigured()) {
        const settings = new URL("/settings", origin);
        settings.searchParams.set("billing", "unconfigured");

        return NextResponse.redirect(settings);
    }

    const variantId = variantIdFor(plan, interval);

    if (!variantId) {
        // The plan/interval combination has no variant id set in the env.
        const settings = new URL("/settings", origin);
        settings.searchParams.set("billing", "unavailable");

        return NextResponse.redirect(settings);
    }

    try {
        const profile = await ensureUserProfile(user);

        /*
         * Never open a second checkout for someone who is already paying.
         *
         * A Pro user clicking "Choose Business" would otherwise end up with
         * TWO live subscriptions and two charges a month, with only the last
         * webhook deciding which plan they appear to be on.
         *
         * The portal is where they can cancel or change what they have. The
         * proper upgrade path is Lemon Squeezy's subscription-update API
         * (PATCH /v1/subscriptions/{id} with the new variant id), which swaps
         * the plan on the existing subscription and prorates it; that is a
         * bigger change than this fix and is deliberately left for a later
         * pass.
         */
        if (
            profile.plan !== "free" &&
            subscriptionGrantsAccess(
                profile.subscriptionStatus,
                profile.subscriptionEndsAt
            )
        ) {
            return NextResponse.redirect(new URL("/api/billing/portal", origin));
        }

        const url = await createCheckoutUrl({
            variantId,
            email: profile.email || user.email,
            uid: user.uid,
            name: profile.name || user.name,
            // Back to settings after payment; the webhook has usually landed
            // by the time the page loads, so the new plan is already showing.
            redirectUrl: new URL("/settings?billing=success", origin).toString(),
        });

        return NextResponse.redirect(url);
    } catch (error) {
        console.error("Could not start checkout:", error);

        const settings = new URL("/settings", origin);
        settings.searchParams.set("billing", "error");

        return NextResponse.redirect(settings);
    }
}
