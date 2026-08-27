"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { useUsage, type UsageSnapshot } from "./UsageMeter";

/**
 * Switch your own plan, to check the tier limits against real enforcement.
 *
 * There is no billing yet, so without this the only way to see what a Pro or
 * Studio account experiences is to edit the Firestore document by hand.
 *
 * Renders NOTHING unless the server says ENABLE_PLAN_TESTING is on. That flag
 * has no NEXT_PUBLIC prefix on purpose — the browser cannot read or fake it,
 * so shipping this component to production without the flag set shows nobody
 * a way to upgrade themselves.
 */

const PLANS: { id: UsageSnapshot["plan"]; label: string; runs: number }[] = [
    { id: "free", label: "Free", runs: 10 },
    { id: "pro", label: "Pro", runs: 25 },
    { id: "studio", label: "Studio", runs: 100 },
];

export function PlanTester() {
    const { usage, refresh } = useUsage();
    const router = useRouter();

    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!usage?.testingEnabled) return null;

    const switchTo = async (plan: UsageSnapshot["plan"]) => {
        if (busy) return;

        setBusy(plan);
        setError(null);

        try {
            const response = await fetch("/api/account/usage", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };

                throw new Error(data.error ?? "Could not switch plan.");
            }

            refresh();

            // The plan is read server-side for the sidebar and account card, so
            // those need re-rendering too — not just the usage number.
            router.refresh();
        } catch (caught) {
            setError(
                caught instanceof Error ? caught.message : "Could not switch plan."
            );
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="mt-4 rounded-xl border border-dashed border-amber/40 bg-amber/[0.04] p-4">
            <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 shrink-0 text-amber" strokeWidth={1.8} />

                <p className="text-[12px] font-semibold text-graphite dark:text-mist">
                    Plan testing
                </p>

                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-amber">
                    Dev only
                </span>
            </div>

            <p className="mt-1.5 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                Switch tiers to check the daily limits. Your usage count carries
                over, so the new allowance applies to runs you have already made.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
                {PLANS.map((plan) => {
                    const active = usage.plan === plan.id;

                    return (
                        <button
                            key={plan.id}
                            type="button"
                            disabled={Boolean(busy) || active}
                            onClick={() => void switchTo(plan.id)}
                            className={`
                                rounded-full
                                border
                                px-3
                                py-1.5
                                text-[11px]
                                font-medium
                                transition-colors
                                disabled:cursor-not-allowed
                                ${active
                                    ? "border-amber bg-amber text-ink"
                                    : "border-paper-border text-graphite-muted hover:border-amber/50 hover:text-amber disabled:opacity-50 dark:border-ink-border dark:text-mist-muted"
                                }
                            `}
                        >
                            {busy === plan.id ? "Switching…" : `${plan.label} · ${plan.runs}/day`}
                        </button>
                    );
                })}
            </div>

            <p className="mt-2.5 font-mono text-[10px] text-graphite-faint dark:text-mist-faint">
                {usage.used} used · {usage.remaining} left of {usage.limit} today
            </p>

            {error && <p className="mt-2 text-[11px] text-coral">{error}</p>}
        </div>
    );
}
