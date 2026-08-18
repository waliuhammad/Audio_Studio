import { NextRequest, NextResponse } from "next/server";

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

    const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

    if (!isProtected && !isAuthPage) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const signedIn = Boolean(token) && looksLikeLiveSession(token as string);

    // A cookie that is present but unusable gets cleared, so the browser stops
    // sending it and the user is not stuck on the next request either.
    const staleCookie = Boolean(token) && !signedIn;

    if (isProtected && !signedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        url.searchParams.set("next", pathname);

        const response = NextResponse.redirect(url);
        if (staleCookie) response.cookies.delete(SESSION_COOKIE);

        return response;
    }

    if (isAuthPage && signedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";

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
