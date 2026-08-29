"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

/**
 * How many tool runs are left today.
 *
 * Rendered from the tools layout so every tool shows it without each page
 * wiring it up — the same reason the save-to-library bar lives there.
 *
 * It refetches when the tab regains focus because a run started on one tool
 * changes the number on every other. Without that, a second tab keeps showing
 * the count from whenever it was opened and the limit appears to arrive out of
 * nowhere.
 */

export interface UsageSnapshot {
    used: number;
    limit: number;
    remaining: number;
    plan: "free" | "pro" | "business";
    /** False for anonymous callers, who have no usage to report. */
    signedIn?: boolean;
}

const PLAN_LABEL: Record<UsageSnapshot["plan"], string> = {
    free: "Free",
    pro: "Pro",
    business: "Business",
};

export function useUsage(): {
    usage: UsageSnapshot | null;
    refresh: () => void;
} {
    const [usage, setUsage] = useState<UsageSnapshot | null>(null);

    const load = useCallback(async () => {
        try {
            const response = await fetch("/api/account/usage", {
                cache: "no-store",
            });

            if (!response.ok) {
                setUsage(null);
                return;
            }

            setUsage((await response.json()) as UsageSnapshot);
        } catch {
            setUsage(null);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const refetch = () => {
            if (document.visibilityState === "visible") void load();
        };

        window.addEventListener("focus", refetch);
        document.addEventListener("visibilitychange", refetch);

        return () => {
            window.removeEventListener("focus", refetch);
            document.removeEventListener("visibilitychange", refetch);
        };
    }, [load]);

    return { usage, refresh: load };
}

export function UsageMeter() {
    const { usage } = useUsage();

    // Nothing to say until the number is known, and nothing at all for a
    // visitor who is not signed in — there is no allowance to report.
    if (!usage || usage.signedIn === false) return null;

    const exhausted = usage.remaining === 0;

    // Quiet until it matters. A bar counting down from 100 is noise on a Studio
    // plan; what a user needs is a warning when they are nearly out.
    const low = usage.remaining <= Math.max(2, Math.ceil(usage.limit * 0.2));

    if (!exhausted && !low) return null;

    return (
        <div className="container-studio pt-4">
            <div
                role="status"
                className={`
                    flex
                    flex-wrap
                    items-center
                    gap-x-3
                    gap-y-1
                    rounded-xl
                    border
                    px-4
                    py-2.5
                    text-[13px]
                    ${exhausted
                        ? "border-coral/40 bg-coral/[0.07] text-coral"
                        : "border-amber/40 bg-amber/[0.07] text-graphite dark:text-mist"
                    }
                `}
            >
                <Zap
                    className={`h-4 w-4 shrink-0 ${exhausted ? "text-coral" : "text-amber"}`}
                    strokeWidth={1.8}
                />

                <span className="font-medium">
                    {exhausted
                        ? `You've used all ${usage.limit} runs on your ${PLAN_LABEL[usage.plan]} plan today.`
                        : `${usage.remaining} of ${usage.limit} runs left today.`}
                </span>

                <span className="text-graphite-muted dark:text-mist-muted">
                    Resets at midnight UTC.
                </span>

                {usage.plan !== "business" && (
                    <Link
                        href="/#pricing"
                        className="ml-auto shrink-0 font-semibold text-amber underline underline-offset-2"
                    >
                        See plans
                    </Link>
                )}
            </div>
        </div>
    );
}
