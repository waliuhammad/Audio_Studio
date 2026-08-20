"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Catches render and data errors anywhere under app/.
 *
 * Without this file Next.js shows its own unstyled error page, which looks
 * like the site has fallen over completely. A route failing should still feel
 * like part of the app, and should offer the two things that actually help:
 * try again, or go somewhere that works.
 *
 * The message itself is deliberately not shown. It comes from the server and
 * can contain internals — paths, query shapes, provider errors — that a
 * visitor should never read. `digest` is the identifier to quote in a bug
 * report; the full detail stays in the server logs.
 */
export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Route error:", error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-paper px-6 dark:bg-ink">
            <div className="w-full max-w-md text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-coral/30 bg-coral/10 text-coral">
                    <AlertTriangle className="h-6 w-6" strokeWidth={1.7} />
                </span>

                <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-graphite dark:text-mist">
                    Something broke on our side
                </h1>

                <p className="mt-2 text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
                    This page didn&apos;t load. It&apos;s usually temporary —
                    trying again often works. Your files are untouched.
                </p>

                {error.digest && (
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                        Ref {error.digest}
                    </p>
                )}

                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        className="
                            flex
                            h-10
                            items-center
                            gap-2
                            rounded-full
                            bg-amber
                            px-5
                            text-xs
                            font-semibold
                            text-ink
                            transition-transform
                            duration-200
                            hover:-translate-y-0.5
                            active:translate-y-0
                        "
                    >
                        <RotateCcw className="h-4 w-4" strokeWidth={1.9} />
                        Try again
                    </button>

                    <Link
                        href="/"
                        className="
                            flex
                            h-10
                            items-center
                            rounded-full
                            border
                            border-paper-border
                            px-5
                            text-xs
                            font-medium
                            text-graphite-muted
                            transition-colors
                            hover:border-amber/50
                            hover:text-amber
                            dark:border-ink-border
                            dark:text-mist-muted
                        "
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </main>
    );
}
