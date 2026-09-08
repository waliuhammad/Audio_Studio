import { NextRequest, NextResponse } from "next/server";
import {
    planForVariant,
    verifyWebhookSignature,
    type LemonWebhookBody,
} from "@/lib/server/lemon-squeezy";
import { updateSubscription } from "@/lib/firebase/firestore";
import type { Plan } from "@/lib/server/plan-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook — Lemon Squeezy events.
 *
 * This is the ONLY thing that changes a user's plan. The client cannot; the
 * Firestore rules forbid it. So the trust rests entirely on the signature
 * check below — an unsigned or wrongly-signed request is rejected before a
 * single byte of it is believed.
 *
 * The body is read as RAW TEXT and verified before parsing. Parsing and
 * re-serialising first would change the bytes and break every signature.
 */

/**
 * Events that end paid access outright.
 *
 * `expired` is the natural end of a cancelled subscription — the user kept
 * access until the period they paid for ran out, and now it has. `paused`
 * and a refund both stop payment immediately, so access stops with them.
 */
const DOWNGRADE_EVENTS = new Set([
    "subscription_expired",
    "subscription_paused",
    "order_refunded",
]);

/**
 * Events that (re)grant paid access.
 *
 * `cancelled` is deliberately here: a cancelled Lemon Squeezy subscription is
 * still ACTIVE until its end date, and still carries its paid variant. Mapping
 * that variant to its plan is what keeps the user on Pro until the period ends
 * — the later `expired` event is what finally drops them to Free.
 */
const GRANT_EVENTS = new Set([
    "subscription_created",
    "subscription_updated",
    "subscription_resumed",
    "subscription_unpaused",
    "subscription_payment_success",
    "subscription_cancelled",
]);

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    let valid = false;

    try {
        valid = verifyWebhookSignature(rawBody, signature);
    } catch (error) {
        // Thrown only when the webhook secret itself is missing.
        console.error("Webhook verification could not run:", error);

        return NextResponse.json(
            { error: "Billing is not configured." },
            { status: 500 }
        );
    }

    if (!valid) {
        return NextResponse.json(
            { error: "Invalid signature." },
            { status: 401 }
        );
    }

    let body: LemonWebhookBody;

    try {
        body = JSON.parse(rawBody) as LemonWebhookBody;
    } catch {
        return NextResponse.json({ error: "Bad payload." }, { status: 400 });
    }

    const eventName = body.meta?.event_name;
    const uid = body.meta?.custom_data?.uid;
    const attributes = body.data?.attributes ?? {};

    // Without a uid there is no account to update. This only happens for
    // purchases not started through our checkout (which always attaches one),
    // so acknowledge and move on rather than retrying forever.
    if (!uid || typeof uid !== "string") {
        return NextResponse.json({ received: true, note: "no uid" });
    }

    const status = typeof attributes.status === "string" ? attributes.status : null;
    const renewsAt = attributes.renews_at ?? null;
    const endsAt = attributes.ends_at ?? null;
    const customerId =
        typeof attributes.customer_id === "number"
            ? String(attributes.customer_id)
            : null;
    const subscriptionId =
        typeof body.data?.id === "string" ? body.data.id : null;
    const portalUrl = attributes.urls?.customer_portal ?? null;

    let nextPlan: Plan | null = null;

    if (DOWNGRADE_EVENTS.has(eventName)) {
        nextPlan = "free";
    } else if (GRANT_EVENTS.has(eventName)) {
        // The plan is decided by the variant that was bought, never by the
        // event. An unrecognised variant grants nothing.
        nextPlan =
            typeof attributes.variant_id === "number"
                ? planForVariant(attributes.variant_id)
                : null;
    }

    // An event we don't act on (test pings, order_created, etc.) is a success,
    // not a failure — returning non-2xx makes Lemon Squeezy retry it forever.
    if (nextPlan === null) {
        return NextResponse.json({ received: true, event: eventName });
    }

    try {
        await updateSubscription(uid, {
            plan: nextPlan,
            subscriptionStatus: nextPlan === "free" ? status ?? "expired" : status,
            subscriptionId,
            subscriptionRenewsAt: renewsAt,
            subscriptionEndsAt: endsAt,
            lemonSqueezyCustomerId: customerId,
            // Keep the last known portal URL; a downgrade event may not carry
            // one, so don't overwrite a good URL with null.
            customerPortalUrl: portalUrl ?? undefined,
        });
    } catch (error) {
        console.error("Could not apply subscription update:", error);

        // A real failure here SHOULD be retried, so return 500.
        return NextResponse.json(
            { error: "Could not update the account." },
            { status: 500 }
        );
    }

    return NextResponse.json({ received: true, event: eventName, plan: nextPlan });
}