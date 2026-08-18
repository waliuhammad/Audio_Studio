import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth } from "./admin";

/**
 * Server-side session handling.
 *
 * Firebase ID tokens expire after 1 hour and live in browser storage, which
 * makes them a poor fit for server rendering. Exchanging one for a Firebase
 * SESSION COOKIE gives an httpOnly cookie that lasts up to 14 days and can be
 * verified on the server — so protected pages render correctly on first paint
 * instead of flashing signed-out content.
 */

export const SESSION_COOKIE = "audio_studio_session";

/** Firebase caps session cookies at 14 days. */
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SHORT_SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export interface SessionUser {
    uid: string;
    email: string;
    name: string;
    picture: string | null;
    emailVerified: boolean;
}

/**
 * Exchange a freshly-issued ID token for a session cookie.
 * Throws if the token is invalid, expired, or older than 5 minutes.
 */
export async function createSessionCookie(
    idToken: string,
    remember = false
): Promise<void> {
    const expiresIn = remember ? SESSION_MAX_AGE_MS : SHORT_SESSION_MAX_AGE_MS;

    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
        expiresIn,
    });

    cookies().set(SESSION_COOKIE, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(expiresIn / 1000),
    });
}

export function clearSessionCookie(): void {
    cookies().set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

/**
 * Read and verify the current session.
 *
 * checkRevoked: true costs an extra round trip but means a user who was
 * disabled or signed out everywhere loses access immediately, rather than
 * when the cookie eventually expires.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    const cookie = cookies().get(SESSION_COOKIE)?.value;

    if (!cookie) return null;

    try {
        const claims = await getAdminAuth().verifySessionCookie(cookie, true);

        return {
            uid: claims.uid,
            email: typeof claims.email === "string" ? claims.email : "",
            name:
                typeof claims.name === "string" && claims.name
                    ? claims.name
                    : typeof claims.email === "string"
                        ? claims.email.split("@")[0] ?? "User"
                        : "User",
            picture: typeof claims.picture === "string" ? claims.picture : null,
            emailVerified: claims.email_verified === true,
        };
    } catch {
        // Expired, revoked, or tampered with.
        return null;
    }
}

/** Use in API routes that require a signed-in user. */
export async function requireSessionUser(): Promise<SessionUser> {
    const user = await getSessionUser();

    if (!user) {
        throw new SessionError("You need to be signed in to do that.", 401);
    }

    return user;
}

export class SessionError extends Error {
    status: number;

    constructor(message: string, status = 401) {
        super(message);
        this.name = "SessionError";
        this.status = status;
    }
}

/** Revoke every refresh token for a user — signs them out on all devices. */
export async function revokeAllSessions(uid: string): Promise<void> {
    await getAdminAuth().revokeRefreshTokens(uid);
}