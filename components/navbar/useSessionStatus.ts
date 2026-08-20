"use client";

import { useEffect, useState } from "react";

/**
 * Is anyone signed in?
 *
 * The marketing navbar is a client component rendered on static pages, so it
 * cannot read the httpOnly session cookie directly — only the server can. It
 * asks the session endpoint once on mount instead.
 *
 * Returns null until the answer is known. Callers should render the
 * signed-OUT state during that moment rather than guessing: showing "Sign In"
 * briefly to someone who is signed in is a smaller error than flashing an
 * account link at a visitor who has no account.
 */
export function useSessionStatus(): boolean | null {
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/auth/session", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : { user: null }))
            .then((data: { user: unknown }) => {
                if (!cancelled) setIsSignedIn(Boolean(data.user));
            })
            .catch(() => {
                if (!cancelled) setIsSignedIn(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return isSignedIn;
}
