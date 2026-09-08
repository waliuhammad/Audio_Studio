/**
 * The signed-in user, in the shape the dashboard UI wants.
 *
 * Firestore stores raw facts (bytes, seconds, an ISO join date); the sidebar
 * and topbar want initials and minutes. Converting once here — rather than in
 * each of the five screens that render an avatar — keeps the screens dumb and
 * means a change to how a plan is labelled happens in one place.
 */

import type { UserProfile } from "@/lib/firebase/firestore";

export interface AccountSummary {
    name: string;
    email: string;
    initials: string;
    /** Profile photo URL, or null when the user has none (initials are shown). */
    picture: string | null;
    /** Display label, e.g. "Pro". */
    plan: string;
    /** Raw plan id, for logic — "free" | "pro" | "business". */
    planId: UserProfile["plan"];
    /** True when the user is on a paid plan (show "Manage billing"). */
    isPaid: boolean;
    /** Lemon Squeezy status, e.g. "active" | "cancelled" | "past_due". */
    subscriptionStatus: string | null;
    /** True while a paid plan is set to end at the period's close. */
    subscriptionCancelled: boolean;
    /** ISO date the plan renews (active) — null when there is nothing to renew. */
    subscriptionRenewsAt: string | null;
    /** ISO date paid access ends after a cancellation. */
    subscriptionEndsAt: string | null;
    storageUsedBytes: number;
    storageLimitBytes: number;
    projectCount: number;
    filesProcessed: number;
    processingMinutes: number;
    /** ISO date the account was created — the only real "member since" we have. */
    createdAt: string;
    /** Saved notification toggles, keyed by id. Absent keys use the UI default. */
    notificationPrefs: Record<string, boolean>;
}

/**
 * "Ada Lovelace" → "AL", "ada" → "AD", "" → "?".
 *
 * Falls back to the email's local part, because a social sign-in can arrive
 * with no display name at all and an empty avatar looks broken.
 */
export function initialsFor(name: string, email: string): string {
    const source = name.trim() || email.split("@")[0] || "";

    if (!source) return "?";

    const words = source.split(/[\s._-]+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
}

const PLAN_LABEL: Record<UserProfile["plan"], string> = {
    free: "Free",
    pro: "Pro",
    business: "Business",
};

export function toAccountSummary(
    profile: UserProfile,
    projectCount: number
): AccountSummary {
    return {
        name: profile.name,
        email: profile.email,
        initials: initialsFor(profile.name, profile.email),
        picture: profile.picture,
        plan: PLAN_LABEL[profile.plan] ?? "Free",
        planId: profile.plan,
        isPaid: profile.plan !== "free",
        subscriptionStatus: profile.subscriptionStatus ?? null,
        subscriptionCancelled: profile.subscriptionStatus === "cancelled",
        subscriptionRenewsAt: profile.subscriptionRenewsAt ?? null,
        subscriptionEndsAt: profile.subscriptionEndsAt ?? null,
        storageUsedBytes: profile.storageUsedBytes,
        storageLimitBytes: profile.storageLimitBytes,
        projectCount,
        filesProcessed: profile.filesProcessed,
        processingMinutes: Math.round(profile.processingSeconds / 60),
        createdAt: profile.createdAt,
        notificationPrefs: profile.notificationPrefs,
    };
}