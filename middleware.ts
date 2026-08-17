import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Route protection.
 *
 * Runs on the Edge runtime, so it cannot import anything Node-specific —
 * no bcryptjs, no fs, no crypto module. That is why the token is verified
 * inline with `jose` (Web Crypto) rather than importing lib/auth/session,
 * which pulls in next/headers.
 *
 * This is a REDIRECT layer, not the security boundary. Every API route and
 * server component must still check the session itself; middleware only
 * decides where the browser lands.
 */

const SESSION_COOKIE = "audio_studio_session";

/** Signed-in users only. */
const PROTECTED_PREFIXES = [
    "/dashboard",
    "/library",
    "/trash",
    "/settings",
];

/** Signed-out users only — no point showing sign-in to someone signed in. */
const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];

async function hasValidSession(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) return false;

    const secret = process.env.AUTH_SECRET;

    if (!secret || secret.length < 32) {
        // Misconfigured server: fail closed rather than letting everyone through.
        console.error("AUTH_SECRET is missing or too short.");
        return false;
    }

    try {
        await jwtVerify(token, new TextEncoder().encode(secret), {
            algorithms: ["HS256"],
        });

        return true;
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

    if (!isProtected && !isAuthPage) {
        return NextResponse.next();
    }

    const signedIn = await hasValidSession(request);

    if (isProtected && !signedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        // Remember where they were headed so sign-in can send them back.
        url.searchParams.set("next", pathname);

        const response = NextResponse.redirect(url);

        // Clear a stale/expired cookie so the browser stops sending it.
        response.cookies.delete(SESSION_COOKIE);

        return response;
    }

    if (isAuthPage && signedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";

        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    /**
     * Skip static assets and API routes.
     * API routes do their own session checks — running middleware on them
     * would redirect fetch() calls to HTML, which breaks JSON clients.
     */
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|icon.png|opengraph-image.png|robots.txt|sitemap.xml).*)",
    ],
};