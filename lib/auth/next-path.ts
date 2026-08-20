/**
 * Where to send someone once they have authenticated.
 *
 * Middleware appends ?next=<path> when it turns a visitor away from a gated
 * route, so signing in returns them to what they actually clicked rather than
 * dropping everyone on the dashboard.
 *
 * The validation is the whole point. An unchecked ?next= is an open redirect:
 * an attacker can send a link to /sign-up?next=https://evil.example and have
 * the real site bounce the user onward straight after a genuine login — the
 * moment they are least suspicious and most likely to retype a password.
 *
 * Only same-origin absolute paths are allowed:
 *
 *   "/editor"            ✓
 *   "/dashboard?tab=1"   ✓
 *   "https://evil.com"   ✗  absolute URL
 *   "//evil.com"         ✗  protocol-relative — browsers read this as a host
 *   "/\evil.com"         ✗  some browsers treat the backslash as a slash
 *   "editor"             ✗  relative, resolves unpredictably
 */

export const DEFAULT_AFTER_AUTH = "/dashboard";

/** Auth screens themselves are never a destination — that would loop. */
const AUTH_PATHS = ["/sign-in", "/sign-up", "/forgot-password"];

export function safeNextPath(
    requested: string | null | undefined,
    fallback: string = DEFAULT_AFTER_AUTH
): string {
    if (!requested) return fallback;

    if (!requested.startsWith("/")) return fallback;
    if (requested.startsWith("//")) return fallback;
    if (requested.startsWith("/\\")) return fallback;

    if (AUTH_PATHS.some((path) => requested.startsWith(path))) return fallback;

    return requested;
}

/**
 * Read and validate ?next= from the current URL.
 *
 * Reads window.location rather than useSearchParams(): that hook opts a page
 * out of static prerendering unless it sits behind a Suspense boundary, and
 * every caller here runs inside a click handler where the URL is already
 * available anyway.
 */
export function nextPathFromLocation(
    fallback: string = DEFAULT_AFTER_AUTH
): string {
    if (typeof window === "undefined") return fallback;

    return safeNextPath(
        new URLSearchParams(window.location.search).get("next"),
        fallback
    );
}
