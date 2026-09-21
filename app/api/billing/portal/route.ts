import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { getProfile } from "@/lib/firebase/firestore";
import {
    billingReturnOrigin,
    fetchCustomerPortalUrl,
} from "@/lib/server/lemon-squeezy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/portal — send the user to their Lemon Squeezy portal.
 *
 * The portal is where a customer updates their card, downloads invoices or
 * cancels. Its URL is issued by Lemon Squeezy per subscription, so this route
 * is just an authenticated redirect — no secret ever reaches the browser.
 *
 * The URL is fetched fresh on every click. The one the webhook stored is
 * pre-signed and stops working after about a day, so for anyone whose last
 * billing event was more than a day ago the stored link is already dead.
 */
export async function GET(request: NextRequest) {
    const origin = billingReturnOrigin(request);
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.redirect(new URL("/sign-in", origin));
    }

    const profile = await getProfile(user.uid);

    const freshUrl = profile?.subscriptionId
        ? await fetchCustomerPortalUrl(profile.subscriptionId)
        : null;

    // Fall back to the stored URL if the API call failed — it may be within
    // its window, and a possibly-stale link beats no link at all.
    const portalUrl = freshUrl ?? profile?.customerPortalUrl;

    if (!portalUrl) {
        // No subscription yet (or the URL hasn't been stored) — nothing to
        // manage, so point them at the plans instead.
        const settings = new URL("/settings", origin);
        settings.searchParams.set("billing", "no-subscription");

        return NextResponse.redirect(settings);
    }

    return NextResponse.redirect(portalUrl);
}
