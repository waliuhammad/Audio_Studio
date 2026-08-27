"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, X } from "lucide-react";
import { useUsage, type UsageSnapshot } from "./UsageMeter";

/**
 * A floating switcher for trying each plan against the real limits.
 *
 * Mounted from the root layout so it follows you across every page — the point
 * is to change tier and immediately watch a tool accept or refuse the next
 * run, which is awkward if the control only exists on the settings screen.
 *
 * Renders NOTHING unless the server reports ENABLE_PLAN_TESTING. That variable
 * has no NEXT_PUBLIC prefix deliberately, so the browser can neither read nor
 * forge it; shipping this with the flag unset shows nobody a way to upgrade
 * themselves.
 *
 * Sits bottom-RIGHT because the save-to-library bar and the tool error banner
 * both occupy bottom-centre. Collapsed by default so it never covers a page's
 * own controls.
 */

const PLANS: { id: UsageSnapshot["plan"]; label: string; runs: number }[] = [
    { id: "free", label: "Free", runs: 10 },
    { id: "pro", label: "Pro", runs: 25 },
    { id: "studio", label: "Studio", runs: 100 },
];

export function PlanTester() {
    const { usage, refresh } = useUsage();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Nothing for signed-out visitors, and nothing when testing is switched off.
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
            // those need re-rendering too, not just the usage number.
            router.refresh();
        } catch (caught) {
            setError(
                caught instanceof Error ? caught.message : "Could not switch plan."
            );
        } finally {
            setBusy(null);
        }
    };

    const current = PLANS.find((plan) => plan.id === usage.plan);

    return (
        <div className="fixed bottom-4 right-4 z-[60] print:hidden">
            {open ? (
                <div
                    className="
                        w-64
                        rounded-2xl
                        border
                        border-amber/40
                        bg-paper-surface/95
                        p-4
                        shadow-[0_16px_48px_rgba(0,0,0,0.18)]
                        backdrop-blur-xl
                        dark:bg-ink-surface/95
                    "
                >
                    <div className="flex items-center gap-2">
                        <FlaskConical
                            className="h-4 w-4 shrink-0 text-amber"
                            strokeWidth={1.8}
                        />

                        <p className="text-[12px] font-semibold text-graphite dark:text-mist">
                            Plan testing
                        </p>

                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Close plan testing"
                            className="ml-auto rounded-lg p-1 text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5">
                        {PLANS.map((plan) => {
                            const active = usage.plan === plan.id;

                            return (
                                <button
                                    key={plan.id}
                                    type="button"
                                    disabled={Boolean(busy) || active}
                                    onClick={() => void switchTo(plan.id)}
                                    className={`
                                        flex
                                        items-center
                                        justify-between
                                        rounded-lg
                                        border
                                        px-3
                                        py-2
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
                                    <span>{plan.label}</span>

                                    <span className="font-mono text-[10px]">
                                        {busy === plan.id ? "…" : `${plan.runs}/day`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="mt-3 font-mono text-[10px] text-graphite-faint dark:text-mist-faint">
                        {usage.used} used · {usage.remaining} left of {usage.limit}
                    </p>

                    {error && <p className="mt-1.5 text-[10px] text-coral">{error}</p>}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    title="Plan testing (dev only)"
                    className="
                        flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-amber/40
                        bg-paper-surface/95
                        px-3.5
                        py-2
                        text-[11px]
                        font-medium
                        text-graphite
                        shadow-[0_8px_24px_rgba(0,0,0,0.14)]
                        backdrop-blur-xl
                        transition-transform
                        hover:-translate-y-0.5
                        dark:bg-ink-surface/95
                        dark:text-mist
                    "
                >
                    <FlaskConical className="h-3.5 w-3.5 text-amber" strokeWidth={1.9} />

                    <span className="capitalize">{current?.label ?? usage.plan}</span>

                    <span className="font-mono text-[10px] text-graphite-muted dark:text-mist-muted">
                        {usage.remaining}/{usage.limit}
                    </span>
                </button>
            )}
        </div>
    );
}
