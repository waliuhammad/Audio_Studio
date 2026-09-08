import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
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