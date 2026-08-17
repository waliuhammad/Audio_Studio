import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Session handling.
 *
 * The session is a signed JWT stored in an httpOnly cookie. httpOnly means
 * JavaScript cannot read it, so an XSS bug cannot steal the token.
 *
 * Note this is a SIGNED token, not an encrypted one — anyone can decode the
 * payload. Keep it to identifiers only; never put anything secret in here.
 */

export const SESSION_COOKIE = "audio_studio_session";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
    userId: string;
    email: string;
    name: string;
}

function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error(
            "AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 32"
        );
    }

    return new TextEncoder().encode(secret);
}

export async function createSessionToken(
    payload: SessionPayload,
    maxAgeSeconds: number
): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${maxAgeSeconds}s`)
        .sign(getSecret());
}

export async function verifySessionToken(
    token: string
): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret(), {
            algorithms: ["HS256"],
        });

        const { userId, email, name } = payload as Record<string, unknown>;

        if (
            typeof userId !== "string" ||
            typeof email !== "string" ||
            typeof name !== "string"
        ) {
            return null;
        }

        return { userId, email, name };
    } catch {
        // Expired, tampered with, or signed by a different secret.
        return null;
    }
}

export async function setSessionCookie(
    payload: SessionPayload,
    remember = false
): Promise<void> {
    const maxAge = remember
        ? REMEMBER_MAX_AGE_SECONDS
        : DEFAULT_MAX_AGE_SECONDS;

    const token = await createSessionToken(payload, maxAge);

    cookies().set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // "lax" still sends the cookie on top-level navigation, so returning
        // from an email link keeps you signed in, while blocking CSRF on POSTs.
        sameSite: "lax",
        path: "/",
        maxAge,
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

/** Read the current session in a server component or route handler. */
export async function getSession(): Promise<SessionPayload | null> {
    const token = cookies().get(SESSION_COOKIE)?.value;

    if (!token) return null;

    return verifySessionToken(token);
}