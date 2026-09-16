import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { SITE } from "@/lib/seo";
import type { Plan } from "@/lib/server/plan-limits";

/**
 * Lemon Squeezy integration — server only.
 *
 * Everything about a purchase that must be trusted (which plan a variant maps
 * to, the API key, the webhook secret) lives here. The browser never sees any
 * of it: checkouts are created server-side and the webhook is verified with a
 * signing secret, so a user cannot upgrade themselves by editing a request.
 *
 * The plan a user is on is decided ENTIRELY by the variant they bought, mapped
 * through the env below. That keeps prices, product names and even the number
 * of plans out of the code — change the mapping, not the logic.
 */

const API_BASE = "https://api.lemonsqueezy.com/v1";

export type BillingInterval = "monthly" | "yearly";

/* ===================================================== */
/* CONFIG                                                */
/* ===================================================== */

interface LemonConfig {
    apiKey: string;
    storeId: string;
    webhookSecret: string;
}

/**
 * Read and validate the server config.
 *
 * Throws a single clear error naming every missing value, rather than failing
 * later inside an API call with an opaque 401 from Lemon Squeezy.
 */
export function getLemonConfig(): LemonConfig {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    const missing: string[] = [];
    if (!apiKey) missing.push("LEMONSQUEEZY_API_KEY");
    if (!storeId) missing.push("LEMONSQUEEZY_STORE_ID");
    if (!webhookSecret) missing.push("LEMONSQUEEZY_WEBHOOK_SECRET");

    if (missing.length > 0) {
        throw new Error(
            `Lemon Squeezy is not configured. Missing: ${missing.join(", ")}.`
        );
    }

    return { apiKey: apiKey!, storeId: storeId!, webhookSecret: webhookSecret! };
}

/** True when billing is set up enough to create a checkout. */
export function isBillingConfigured(): boolean {
    return Boolean(
        process.env.LEMONSQUEEZY_API_KEY &&
        process.env.LEMONSQUEEZY_STORE_ID &&
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    );
}

/* ===================================================== */
/* VARIANT <-> PLAN MAPPING                              */
/* ===================================================== */

/**
 * Which env var holds the variant id for each paid plan and interval.
 *
 * Free is not sold, so it has no variant. A variant id that is not set simply
 * means "that price is not offered yet" — the checkout route reports it as
 * unavailable rather than crashing.
 */
const VARIANT_ENV: Record<
    Exclude<Plan, "free">,
    Record<BillingInterval, string | undefined>
> = {
    pro: {
        monthly: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY,
            yearly: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY,
    },
    business: {
        monthly: process.env.LEMONSQUEEZY_VARIANT_BUSINESS_MONTHLY,
            yearly: process.env.LEMONSQUEEZY_VARIANT_BUSINESS_YEARLY,
    },
};

/** The variant id to buy for a plan + interval, or null if not configured. */
export function variantIdFor(
    plan: Exclude<Plan, "free">,
    interval: BillingInterval
): string | null {
    const id = VARIANT_ENV[plan]?.[interval];

    return id && id.trim() ? id.trim() : null;
}

/**
 * The plan a purchased variant grants — the reverse of the map above.
 *
 * Called by the webhook with the variant id Lemon Squeezy reports (a number),
 * compared as a string. Returns null for a variant we don't recognise, so an
 * unrelated product in the same store can't silently upgrade anyone.
 */
export function planForVariant(variantId: string | number): Plan | null {
    const target = String(variantId).trim();

    for (const plan of ["pro", "business"] as const) {
        for (const interval of ["monthly", "yearly"] as const) {
            const id = VARIANT_ENV[plan]?.[interval];
            if (id && id.trim() === target) return plan;
        }
    }

    return null;
}

/* ===================================================== */
/* SUBSCRIPTION STATUS -> ACCESS                         */
/* ===================================================== */

/**
 * What each Lemon Squeezy subscription status means for paid access.
 *
 * The variant alone is NOT enough to decide a plan: an expired subscription
 * still reports the paid variant it was bought with, so trusting the variant
 * by itself hands a paid plan back to someone who stopped paying.
 *
 * `past_due` keeps access on purpose — Lemon Squeezy is still retrying the
 * card, and cutting a paying customer off mid-dunning over a bank decline is
 * worse than a few days of grace. `unpaid` is where that retrying gave up, so
 * that one does end access.
 *
 * A status that is missing or not listed here is treated as no access: an
 * unknown value is far more likely to be a new "stopped paying" state than a
 * new "keep paying them" one.
 */
const STATUS_ACCESS: Record<string, "grant" | "grant-until-ends" | "revoke"> = {
    active: "grant",
    on_trial: "grant",
    past_due: "grant",
    cancelled: "grant-until-ends",
    expired: "revoke",
    paused: "revoke",
    unpaid: "revoke",
};

/**
 * Does this subscription state still entitle the user to their paid plan?
 *
 * `cancelled` is the subtle one: the user has turned off renewal but has
 * already paid for the current period, so they keep access until `ends_at`.
 * A missing or unparseable `ends_at` on a cancelled subscription is treated as
 * already ended — failing closed, since the alternative is free Pro forever.
 */
export function subscriptionGrantsAccess(
    status: string | null | undefined,
    endsAt: string | null | undefined,
    now: Date = new Date()
): boolean {
    const rule = status ? STATUS_ACCESS[status] : undefined;

    if (rule === "grant") return true;

    if (rule === "grant-until-ends") {
        const ends = endsAt ? Date.parse(endsAt) : NaN;

        return Number.isFinite(ends) && ends > now.getTime();
    }

    return false;
}

/**
 * Does a subscription in this state still exist at Lemon Squeezy, such that
 * cancelling it would actually stop future charges?
 *
 * `cancelled` and `expired` are already done — asking Lemon Squeezy to cancel
 * them again would just fail and block an account deletion for no reason.
 */
export function subscriptionIsCancellable(
    status: string | null | undefined
): boolean {
    return (
        status === "active" ||
        status === "on_trial" ||
        status === "past_due" ||
        status === "unpaid" ||
        status === "paused"
    );
}

/* ===================================================== */
/* WEBHOOK DECISION                                      */
/* ===================================================== */

export type SubscriptionDecision =
    | { action: "ignore"; reason: string }
    | { action: "apply"; plan: Plan };

export interface SubscriptionDecisionInput {
    /** `data.type`. Only "subscriptions" carries a subscription status. */
    dataType: string | null;
    eventName: string;
    /** `attributes.status`. */
    status: string | null;
    /** The plan the purchased variant maps to, or null if we don't sell it. */
    variantPlan: Plan | null;
    /** `attributes.ends_at`. */
    endsAt: string | null;
    /** `data.id` — a subscription id only when `dataType` is "subscriptions". */
    subscriptionId: string | null;
    /** `attributes.updated_at`: where this event sits on Lemon Squeezy's clock. */
    updatedAt: string | null;
    /** What we already applied for this user. */
    stored: { subscriptionId: string | null; lastEventAt: string | null };
    now?: Date;
}

/** True when `incoming` is strictly older than `stored` (both ISO strings). */
function isStale(
    incoming: string | null,
    stored: string | null,
    now: Date
): boolean {
    if (!incoming || !stored) return false;

    const a = Date.parse(incoming);
    const b = Date.parse(stored);

    // Anything we can't parse is treated as not stale — better to re-apply a
    // state we already have than to silently drop a real change.
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

    // A watermark in the future is not something Lemon Squeezy can produce, so
    // it is either clock skew or a value that reached the document some other
    // way. Trusting it would drop EVERY future event — including the one that
    // ends the subscription — so it is discarded instead. (The Firestore rules
    // should also list subscriptionEventAt as a field clients may not write.)
    if (b > now.getTime() + 5 * 60 * 1000) return false;

    return a < b;
}

/**
 * Decide what a webhook event should do to a user's plan. Pure, so the whole
 * table below can be tested without Firestore or Lemon Squeezy.
 *
 * Three things have to be true before a plan is written:
 *
 *  1. The event is not older than the last one we applied. Lemon Squeezy does
 *     not guarantee delivery order and retries for days, so a late
 *     `subscription_updated` can otherwise arrive after `expired` and hand the
 *     paid plan back forever.
 *  2. The status — not just the variant — still entitles the user to the plan.
 *  3. A downgrade actually belongs to the subscription we granted from. A user
 *     with two subscriptions must not be dropped to free because the old one
 *     expired. Grants from another subscription id are allowed (that is what
 *     buying a replacement looks like) and carry the new id with them.
 */
export function decideSubscriptionUpdate(
    input: SubscriptionDecisionInput
): SubscriptionDecision {
    const now = input.now ?? new Date();

    // Applied to order events too: both timestamps are wall-clock times from
    // Lemon Squeezy, so "which happened last" is still meaningful across them.
    if (isStale(input.updatedAt, input.stored.lastEventAt, now)) {
        return { action: "ignore", reason: "older than the last applied event" };
    }

    let plan: Plan;

    if (input.dataType === "subscriptions") {
        if (subscriptionGrantsAccess(input.status, input.endsAt, now)) {
            // An unrecognised variant grants nothing — an unrelated product in
            // the same store must not be able to upgrade anyone.
            if (!input.variantPlan) {
                return { action: "ignore", reason: "unknown variant" };
            }

            plan = input.variantPlan;
        } else {
            plan = "free";
        }
    } else if (input.eventName === "order_refunded") {
        // A refund is an ORDER, not a subscription: `data.id` is an order id,
        // so the subscription-id guard below cannot apply to it. Money went
        // back, so access stops.
        plan = "free";
    } else {
        return { action: "ignore", reason: "event not handled" };
    }

    if (
        plan === "free" &&
        input.dataType === "subscriptions" &&
        input.stored.subscriptionId &&
        input.subscriptionId &&
        input.stored.subscriptionId !== input.subscriptionId
    ) {
        return {
            action: "ignore",
            reason: "downgrade from a different subscription",
        };
    }

    return { action: "apply", plan };
}

/* ===================================================== */
/* RETURN ORIGIN                                         */
/* ===================================================== */

/**
 * The host to send a billing redirect back to.
 *
 * SITE.url is resolved from RAILWAY_PUBLIC_DOMAIN, which is NOT necessarily
 * the hostname the user is actually browsing. Sending someone back there after
 * paying lands them on a host where their session cookie does not exist, so
 * they get bounced to sign-in and think the payment failed. Coming back to the
 * host the request arrived on keeps the session intact.
 *
 * The real fix is still to set NEXT_PUBLIC_SITE_URL to one canonical host, so
 * that every link, canonical tag and redirect agrees.
 */
export function billingReturnOrigin(request: NextRequest): string {
    const origin = request.nextUrl.origin;

    return origin && origin.startsWith("http") ? origin : SITE.url;
}

/* ===================================================== */
/* CHECKOUT                                              */
/* ===================================================== */

/**
 * Create a hosted checkout and return its URL.
 *
 * The user's Firebase uid rides along in `custom` so the webhook can map the
 * eventual purchase back to the right account — it comes back untouched under
 * `meta.custom_data`. Email is prefilled so the person doesn't retype it, and
 * `redirect_url` sends them back into the app once they've paid.
 */
export async function createCheckoutUrl(input: {
    variantId: string;
    email: string;
    uid: string;
    name?: string;
    redirectUrl: string;
}): Promise<string> {
    const { apiKey, storeId } = getLemonConfig();

    const response = await fetch(`${API_BASE}/checkouts`, {
        method: "POST",
        headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            data: {
                type: "checkouts",
                attributes: {
                    checkout_data: {
                        email: input.email,
                        name: input.name || undefined,
                        // Keys here are echoed back verbatim by the webhook.
                        custom: { uid: input.uid },
                    },
                    product_options: {
                        redirect_url: input.redirectUrl,
                    },
                },
                relationships: {
                    store: {
                        data: { type: "stores", id: String(storeId) },
                    },
                    variant: {
                        data: { type: "variants", id: String(input.variantId) },
                    },
                },
            },
        }),
        // Never cache a checkout — each is single-use and user-specific.
        cache: "no-store",
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
            `Lemon Squeezy checkout failed (HTTP ${response.status}). ${detail}`
        );
    }

    const json = (await response.json()) as {
        data?: { attributes?: { url?: string } };
    };

    const url = json.data?.attributes?.url;

    if (!url) {
        throw new Error("Lemon Squeezy did not return a checkout URL.");
    }

    return url;
}

/* ===================================================== */
/* SUBSCRIPTION API                                      */
/* ===================================================== */

/**
 * The CURRENT customer portal URL for a subscription.
 *
 * Lemon Squeezy's portal links are pre-signed and expire after about a day,
 * so the one the webhook stored is usually dead by the time someone clicks
 * "Manage billing". Fetching it at click time is the only way to hand out a
 * link that works.
 *
 * Returns null on any failure so the caller can fall back to the stored URL —
 * a stale link that might still work beats a dead end.
 */
export async function fetchCustomerPortalUrl(
    subscriptionId: string
): Promise<string | null> {
    try {
        const { apiKey } = getLemonConfig();

        const response = await fetch(
            `${API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`,
            {
                headers: {
                    Accept: "application/vnd.api+json",
                    Authorization: `Bearer ${apiKey}`,
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            console.error(
                `Lemon Squeezy subscription fetch failed (HTTP ${response.status}).`
            );

            return null;
        }

        const json = (await response.json()) as {
            data?: { attributes?: LemonSubscriptionAttributes };
        };

        return json.data?.attributes?.urls?.customer_portal ?? null;
    } catch (error) {
        console.error("Could not fetch the customer portal URL:", error);

        return null;
    }
}

/**
 * Cancel a subscription. Throws if Lemon Squeezy did not accept it, because
 * the only caller (account deletion) must NOT proceed on a failed cancel —
 * that would leave a customer being charged for an account they deleted.
 *
 * This is Lemon Squeezy's "cancel at period end": the subscription moves to
 * `cancelled` and runs until `ends_at`. It is not a refund, and this code
 * deliberately does not attempt one.
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
    const { apiKey } = getLemonConfig();

    const response = await fetch(
        `${API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`,
        {
            method: "DELETE",
            headers: {
                Accept: "application/vnd.api+json",
                Authorization: `Bearer ${apiKey}`,
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const detail = await response.text().catch(() => "");

        throw new Error(
            `Lemon Squeezy cancellation failed (HTTP ${response.status}). ${detail}`
        );
    }
}

/* ===================================================== */
/* WEBHOOK SIGNATURE                                     */
/* ===================================================== */

/**
 * Verify the X-Signature header against the raw request body.
 *
 * Lemon Squeezy signs the EXACT bytes of the body with the webhook secret
 * (HMAC-SHA256, hex). The body must be read as raw text and passed here
 * unparsed — re-serialising the JSON would change the bytes and every
 * signature would fail. timingSafeEqual avoids leaking the secret through
 * response timing.
 */
export function verifyWebhookSignature(
    rawBody: string,
    signature: string | null
): boolean {
    if (!signature) return false;

    const { webhookSecret } = getLemonConfig();

    const expected = createHmac("sha256", webhookSecret)
        .update(rawBody, "utf8")
        .digest("hex");

    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");

    if (a.length !== b.length) return false;

    return timingSafeEqual(a, b);
}

/* ===================================================== */
/* WEBHOOK PAYLOAD SHAPES (minimal)                      */
/* ===================================================== */

export interface LemonWebhookMeta {
    event_name: string;
    custom_data?: { uid?: string } | null;
}

export interface LemonSubscriptionAttributes {
    store_id?: number;
    customer_id?: number;
    variant_id?: number;
    status?: string;
    renews_at?: string | null;
    ends_at?: string | null;
    /** When Lemon Squeezy last changed this record — used to order events. */
    updated_at?: string | null;
    urls?: {
        customer_portal?: string;
        update_payment_method?: string;
    } | null;
}

export interface LemonWebhookBody {
    meta: LemonWebhookMeta;
    data?: {
        id?: string;
        type?: string;
        attributes?: LemonSubscriptionAttributes;
    };
}