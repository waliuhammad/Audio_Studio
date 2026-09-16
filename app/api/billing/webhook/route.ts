import { NextRequest, NextResponse } from "next/server";
import {
    decideSubscriptionUpdate,
    planForVariant,
    verifyWebhookSignature,
    type LemonWebhookBody,
} from "@/lib/server/lemon-squeezy";
import { getProfile, updateSubscription } from "@/lib/firebase/firestore";

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
 *
 * WHICH events matter is not decided here by name any more: every
 * subscription event carries the same snapshot of the subscription, so the
 * status on that snapshot decides the plan (see decideSubscriptionUpdate).
 * Going by event name alone meant a `subscription_updated` that happened to
 * arrive after `expired` restored the paid plan for good.
 */

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

    const dataType = typeof body.data?.type === "string" ? body.data.type : null;
    const isSubscription = dataType === "subscriptions";

    const status = typeof attributes.status === "string" ? attributes.status : null;
    const renewsAt = attributes.renews_at ?? null;
    const endsAt = attributes.ends_at ?? null;
    const updatedAt =
        typeof attributes.updated_at === "string" ? attributes.updated_at : null;
    const customerId =
        typeof attributes.customer_id === "number"
            ? String(attributes.customer_id)
            : null;
    const objectId = typeof body.data?.id === "string" ? body.data.id : null;
    const portalUrl = attributes.urls?.customer_portal ?? null;

    let profile;

    try {
        profile = await getProfile(uid);
    } catch (error) {
        console.error("Could not read the account for a webhook:", error);

        // Deciding without the stored state could re-apply an old event, so
        // let Lemon Squeezy retry instead of guessing.
        return NextResponse.json(
            { error: "Could not read the account." },
            { status: 500 }
        );
    }

    // The account is gone (deleted). Writing here would resurrect it as an
    // orphan document nobody can sign in to, so acknowledge and stop. Every
    // real purchase goes through our checkout, which creates the profile
    // before the checkout exists, so a missing document is never a race.
    if (!profile) {
        return NextResponse.json({ received: true, note: "no account" });
    }

    const decision = decideSubscriptionUpdate({
        dataType,
        eventName,
        status,
        variantPlan:
            typeof attributes.variant_id === "number"
                ? planForVariant(attributes.variant_id)
                : null,
        endsAt,
        subscriptionId: objectId,
        updatedAt,
        stored: {
            subscriptionId: profile.subscriptionId ?? null,
            lastEventAt: profile.subscriptionEventAt ?? null,
        },
    });

    // An event we don't act on (test pings, order_created, a stale retry) is a
    // success, not a failure — returning non-2xx makes Lemon Squeezy retry it
    // forever.
    if (decision.action === "ignore") {
        return NextResponse.json({
            received: true,
            event: eventName,
            ignored: decision.reason,
        });
    }

    const nextPlan = decision.plan;

    try {
        await updateSubscription(uid, {
            plan: nextPlan,
            subscriptionStatus: status ?? (nextPlan === "free" ? "expired" : null),
            // Only subscription events carry a subscription id; an order's
            // `data.id` is an order id and writing it here would break the
            // portal and cancellation calls that look this value up.
            subscriptionId: isSubscription ? objectId : undefined,
            subscriptionRenewsAt: isSubscription ? renewsAt : undefined,
            subscriptionEndsAt: isSubscription ? endsAt : undefined,
            lemonSqueezyCustomerId: customerId,
            // Keep the last known portal URL; a downgrade event may not carry
            // one, so don't overwrite a good URL with null.
            customerPortalUrl: portalUrl ?? undefined,
            // The watermark that makes a late redelivery harmless. Written in
            // the SAME update as the plan, so the two can never disagree.
            subscriptionEventAt: updatedAt ?? undefined,
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