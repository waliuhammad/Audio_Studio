import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { getProfile } from "@/lib/firebase/firestore";
import { SITE } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/portal — send the user to their Lemon Squeezy portal.
 *
 * The portal is where a customer updates their card, downloads invoices or
 * cancels. Its URL is issued by Lemon Squeezy per subscription and stored on
 * the user document by the webhook, so this route is just an authenticated
 * redirect — no secret ever reaches the browser.
 */
export async function GET() {
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.redirect(new URL("/sign-in", SITE.url));
    }

    const profile = await getProfile(user.uid);
    const portalUrl = profile?.customerPortalUrl;

    if (!portalUrl) {
        // No subscription yet (or the URL hasn't been stored) — nothing to
        // manage, so point them at the plans instead.
        const settings = new URL("/settings", SITE.url);
        settings.searchParams.set("billing", "no-subscription");

        return NextResponse.redirect(settings);
    }

    return NextResponse.redirect(portalUrl);
}