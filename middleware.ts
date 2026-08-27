import { NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/next-path";

/**
 * Route protection.
 *
 * IMPORTANT: middleware runs on the Edge runtime, where the Firebase Admin
 * SDK cannot run (it needs Node APIs). So this can only INSPECT the session
 * cookie — it cannot verify the signature.
 *
 * That is deliberate and safe, because this layer only decides where to send
 * the browser. Actual verification happens in every page and API route via
 * getSessionUser(), which does call the Admin SDK. Someone with a forged
 * cookie gets past this redirect and is then rejected with real data.
 *
 * Never treat this file as the security boundary.
 */

const SESSION_COOKIE = "audio_studio_session";

const PROTECTED_PREFIXES = ["/dashboard", "/library", "/trash", "/settings"];

/**
 * Gated, but sent to SIGN-UP rather than sign-in.
 *
 * The editor is the product's main call to action, so someone clicking "Open
 * Editor" is far more likely to be a new visitor than a returning user who
 * forgot to log in. Showing the sign-in form first asks them for credentials
 * they do not have yet; the sign-up page links to sign-in for the minority who
 * already have an account.
 *
 * The tools are gated here too. Every run now costs against a daily plan
 * allowance, and an allowance needs an account to count against — so the tool
 * ROUTES refuse anonymous requests. Gating the pages as well means a visitor
 * is asked to sign up before choosing a file and setting up an edit, rather
 * than after, when the work would be lost.
 */
const SIGNUP_PREFIXES = [
    "/editor",
    "/audiotools",
    "/videotools",
    "/othertools",
];

const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/** Decode a JWT payload without verifying it. Returns null if malformed. */
function decodePayload(token: string): Record<string, unknown> | null {
    const parts = token.split(".");
    const segment = parts.length === 3 ? parts[1] : undefined;

    if (!segment) return null;

    try {
        const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(
            base64.length + ((4 - (base64.length % 4)) % 4),
            "="
        );

        const parsed: unknown = JSON.parse(atob(padded));

        return typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

/**
 * Is this plausibly a live Firebase session cookie for THIS project?
 *
 * Presence alone is not enough. The previous (jose/JWT) auth system used this
 * same cookie name, and an expired Firebase cookie is equally useless — either
 * one would otherwise bounce the user off /sign-in to a dashboard they cannot
 * actually use, leaving no way back to the form. Checking issuer and expiry
 * keeps both out.
 */
function looksLikeLiveSession(token: string): boolean {
    const payload = decodePayload(token);

    if (!payload) return false;

    // Firebase session cookies expire; a stale one must not count as signed in.
    const exp = payload.exp;
    if (typeof exp !== "number" || exp * 1000 <= Date.now()) return false;

    // Issued by Firebase for this specific project. This is what rules out the
    // legacy cookie, which carried neither claim.
    if (PROJECT_ID) {
        if (payload.iss !== `https://session.firebase.google.com/${PROJECT_ID}`) {
            return false;
        }

        if (payload.aud !== PROJECT_ID) return false;
    }

    return true;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const matches = (prefix: string) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`);

    const isProtected = PROTECTED_PREFIXES.some(matches);
    const needsSignup = SIGNUP_PREFIXES.some(matches);

    const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

    if (!isProtected && !needsSignup && !isAuthPage) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const signedIn = Boolean(token) && looksLikeLiveSession(token as string);

    // A cookie that is present but unusable gets cleared, so the browser stops
    // sending it and the user is not stuck on the next request either.
    const staleCookie = Boolean(token) && !signedIn;

    if ((isProtected || needsSignup) && !signedIn) {
        const url = request.nextUrl.clone();
        url.pathname = needsSignup ? "/sign-up" : "/sign-in";

        // Carries the original path through the form, so the user lands where
        // they were heading instead of on a generic dashboard.
        url.searchParams.set("next", pathname);

        const response = NextResponse.redirect(url);
        if (staleCookie) response.cookies.delete(SESSION_COOKIE);

        return response;
    }

    /*
     * "Open Editor" / "Open Studio" send everyone to /sign-up?...&new=1 on
     * purpose, even a visitor who is already signed in — they want to create
     * a second account, not reuse the one they're on. The `new` flag is what
     * tells this middleware not to bounce that signed-in visitor straight to
     * their destination the way it normally would.
     */
    const wantsFreshAccount =
        pathname.startsWith("/sign-up") &&
        request.nextUrl.searchParams.get("new") === "1";

    if (isAuthPage && signedIn && !wantsFreshAccount) {
        const url = request.nextUrl.clone();

        // Someone already signed in who lands on /sign-up?next=/editor wants
        // the editor, not the dashboard. safeNextPath rejects anything that
        // could leave this origin — ?next= is attacker-controlled, and a
        // trusted domain bouncing users onward is what phishing links want.
        const destination = safeNextPath(
            request.nextUrl.searchParams.get("next")
        );

        const [nextPath, nextQuery] = destination.split("?");

        url.pathname = nextPath || "/dashboard";
        url.search = nextQuery ? `?${nextQuery}` : "";

        return NextResponse.redirect(url);
    }

    // Let the page render, but drop the dead cookie on the way through.
    const response = NextResponse.next();
    if (staleCookie) response.cookies.delete(SESSION_COOKIE);

    return response;
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|icon.png|opengraph-image.png|robots.txt|sitemap.xml).*)",
    ],
};