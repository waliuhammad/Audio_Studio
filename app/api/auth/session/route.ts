import { NextRequest, NextResponse } from "next/server";
import {
    SIGN_IN_LIMIT,
    checkRateLimit,
    getClientKey,
} from "@/lib/auth/rate-limit";
import {
    clearSessionCookie,
    createSessionCookie,
    getSessionUser,
} from "@/lib/firebase/session";
import { ensureUserProfile } from "@/lib/firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — exchange a Firebase ID token for an httpOnly session cookie.
 *
 * The browser signs in with the Firebase SDK, then immediately posts the
 * resulting ID token here. Firebase itself has already verified the
 * credentials; this endpoint's job is to establish the server session.
 */
export async function POST(request: NextRequest) {
    try {
        // Firebase rate-limits credential attempts itself, but this also guards
        // against someone hammering the endpoint with junk tokens.
        const limit = checkRateLimit(
            getClientKey(request, "session"),
            SIGN_IN_LIMIT
        );

        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait a moment and try again." },
                {
                    status: 429,
                    headers: { "Retry-After": String(limit.retryAfterSeconds) },
                }
            );
        }

        const body = await request.json().catch(() => null);

        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const { idToken, rememberMe } = body as Record<string, unknown>;

        if (typeof idToken !== "string" || !idToken) {
            return NextResponse.json(
                { error: "Missing sign-in token." },
                { status: 400 }
            );
        }

        await createSessionCookie(idToken, rememberMe === true);

        // Create the Firestore profile on first sign-in (covers social logins,
        // which never hit our sign-up route).
        const user = await getSessionUser();

        if (user) {
            await ensureUserProfile(user);
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Session creation failed:", error);

        const message = error instanceof Error ? error.message : String(error);

        // A missing or malformed service-account key is by far the most common
        // failure here. It is a server setup problem, not a bad credential, so
        // returning "sign in again" would send the user in circles.
        const isConfigProblem =
            message.includes("Firebase Admin is not configured") ||
            message.includes("private_key") ||
            message.includes("Failed to parse private key") ||
            message.includes("DECODER routines") ||
            message.includes("PEM");

        if (isConfigProblem) {
            return NextResponse.json(
                {
                    error:
                        "Server isn't configured for Firebase yet. Check FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL and FIREBASE_PROJECT_ID in .env.local.",
                    detail:
                        process.env.NODE_ENV === "development" ? message : undefined,
                },
                { status: 500 }
            );
        }

        // Firestore hasn't been created, or rules block the write.
        if (message.includes("NOT_FOUND") || message.includes("PERMISSION_DENIED")) {
            return NextResponse.json(
                {
                    error:
                        "Signed in, but the database isn't ready. Create a Firestore database in the Firebase Console.",
                    detail:
                        process.env.NODE_ENV === "development" ? message : undefined,
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                error: "Could not start your session. Please sign in again.",
                // Development only — never leak internals in production.
                detail: process.env.NODE_ENV === "development" ? message : undefined,
            },
            { status: 401 }
        );
    }
}

/** DELETE — sign out. */
export async function DELETE() {
    clearSessionCookie();

    return NextResponse.json({ success: true });
}

/** GET — current user, or null. */
export async function GET() {
    const user = await getSessionUser();

    return NextResponse.json({ user });
}