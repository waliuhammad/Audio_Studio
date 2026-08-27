import "server-only";

import { getRemoteConfig } from "firebase-admin/remote-config";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp, getAdminDb } from "@/lib/firebase/admin";
import type { UserProfile } from "@/lib/firebase/firestore";

/**
 * How many tools a plan may run per day, and how many are left today.
 *
 * The numbers live in Firebase Remote Config so they can be changed without a
 * deploy — raise the free tier for a launch, drop it if costs spike, all from
 * the console.
 */

export type Plan = UserProfile["plan"];

/**
 * Used when Remote Config is unreachable.
 *
 * Deliberately the same values as the console, so a fetch failure changes
 * nothing a user can notice rather than silently handing out a different
 * allowance.
 */
const FALLBACK_LIMITS: Record<Plan, number> = {
    free: 10,
    pro: 25,
    studio: 100,
};

/**
 * Which Remote Config keys belong to which plan.
 *
 * The console has Weekly/Monthly/Yearly variants of each — those name the
 * BILLING CYCLE, not the limit window; the allowance is per day either way, so
 * any of the three is a valid source and they are expected to agree.
 *
 * "Business" is the console's name for what the codebase calls "studio", and
 * one key is spelled Monthly_business_plan_all in lower case while its
 * siblings are capitalised. Matching case-insensitively on the tier word
 * rather than on exact keys means neither of those has to be corrected by hand
 * to make this work.
 */
const PLAN_KEYWORDS: Record<Plan, string> = {
    free: "free",
    pro: "pro",
    studio: "business",
};

/** Remote Config is a network call — do not make it per request. */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface LimitCache {
    limits: Record<Plan, number>;
    fetchedAt: number;
}

const globalForLimits = globalThis as typeof globalThis & {
    __audioStudioLimits?: LimitCache;
};

function parsePlanLimits(
    parameters: Record<string, { defaultValue?: unknown }>
): Record<Plan, number> {
    const limits = { ...FALLBACK_LIMITS };

    for (const plan of Object.keys(PLAN_KEYWORDS) as Plan[]) {
        const keyword = PLAN_KEYWORDS[plan];

        for (const [key, value] of Object.entries(parameters)) {
            const lower = key.toLowerCase();

            if (!lower.includes(keyword) || !lower.includes("plan")) continue;

            // "pro" is a substring of nothing here, but guard anyway: a key for
            // another tier must not be read as this one.
            if (plan === "pro" && lower.includes("business")) continue;

            const raw = value?.defaultValue;
            const text =
                raw && typeof raw === "object" && "value" in raw
                    ? String((raw as { value: unknown }).value)
                    : "";

            const parsed = Number.parseInt(text, 10);

            if (Number.isFinite(parsed) && parsed >= 0) {
                limits[plan] = parsed;
                break;
            }
        }
    }

    return limits;
}

export async function getPlanLimits(): Promise<Record<Plan, number>> {
    const cached = globalForLimits.__audioStudioLimits;

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.limits;
    }

    try {
        const template = await getRemoteConfig(getAdminApp()).getTemplate();

        const limits = parsePlanLimits(
            (template.parameters ?? {}) as Record<string, { defaultValue?: unknown }>
        );

        globalForLimits.__audioStudioLimits = { limits, fetchedAt: Date.now() };

        return limits;
    } catch (error) {
        console.error("Could not read Remote Config limits:", error);

        // Cache the fallback briefly too, so an outage does not mean a failed
        // network call on every single request.
        globalForLimits.__audioStudioLimits = {
            limits: FALLBACK_LIMITS,
            fetchedAt: Date.now(),
        };

        return FALLBACK_LIMITS;
    }
}

/**
 * The day a usage counter belongs to, in UTC.
 *
 * UTC rather than the visitor's timezone so the reset is a single moment
 * worldwide. Local midnight would let someone travel — or just change their
 * clock — into a fresh allowance.
 */
export function usageDayKey(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10);
}

export interface UsageStatus {
    used: number;
    limit: number;
    remaining: number;
    plan: Plan;
}

/** Today's usage without changing it — for the dashboard. */
export async function getUsageStatus(
    uid: string,
    plan: Plan
): Promise<UsageStatus> {
    const limits = await getPlanLimits();
    const limit = limits[plan] ?? FALLBACK_LIMITS[plan];

    const snapshot = await getAdminDb()
        .collection("users")
        .doc(uid)
        .collection("usage")
        .doc(usageDayKey())
        .get();

    const used =
        snapshot.exists && typeof snapshot.data()?.count === "number"
            ? (snapshot.data()!.count as number)
            : 0;

    return { used, limit, remaining: Math.max(0, limit - used), plan };
}

/**
 * Claim one of today's runs.
 *
 * The read and the increment happen in a TRANSACTION. Without it, two requests
 * arriving together both read the same count and both write count + 1, so the
 * eleventh job on a ten-job plan goes through — and firing several tools at
 * once is normal, not an attack.
 *
 * Returns allowed:false rather than throwing, so callers answer 429 with the
 * numbers instead of a generic failure.
 */
export async function claimToolRun(
    uid: string,
    plan: Plan
): Promise<UsageStatus & { allowed: boolean }> {
    const limits = await getPlanLimits();
    const limit = limits[plan] ?? FALLBACK_LIMITS[plan];

    const ref = getAdminDb()
        .collection("users")
        .doc(uid)
        .collection("usage")
        .doc(usageDayKey());

    const result = await getAdminDb().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);

        const used =
            snapshot.exists && typeof snapshot.data()?.count === "number"
                ? (snapshot.data()!.count as number)
                : 0;

        if (used >= limit) {
            return { allowed: false, used };
        }

        transaction.set(
            ref,
            {
                count: FieldValue.increment(1),
                day: usageDayKey(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return { allowed: true, used: used + 1 };
    });

    return {
        allowed: result.allowed,
        used: result.used,
        limit,
        remaining: Math.max(0, limit - result.used),
        plan,
    };
}
