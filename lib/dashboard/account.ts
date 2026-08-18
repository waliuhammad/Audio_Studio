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
    plan: string;
    storageUsedBytes: number;
    storageLimitBytes: number;
    projectCount: number;
    filesProcessed: number;
    processingMinutes: number;
    /** ISO date the account was created — the only real "member since" we have. */
    createdAt: string;
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
    studio: "Studio",
};

export function toAccountSummary(
    profile: UserProfile,
    projectCount: number
): AccountSummary {
    return {
        name: profile.name,
        email: profile.email,
        initials: initialsFor(profile.name, profile.email),
        plan: PLAN_LABEL[profile.plan] ?? "Free",
        storageUsedBytes: profile.storageUsedBytes,
        storageLimitBytes: profile.storageLimitBytes,
        projectCount,
        filesProcessed: profile.filesProcessed,
        processingMinutes: Math.round(profile.processingSeconds / 60),
        createdAt: profile.createdAt,
    };
}
