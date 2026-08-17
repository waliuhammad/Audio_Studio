import { NextRequest, NextResponse } from "next/server";
import {
    SIGN_IN_LIMIT,
    checkRateLimit,
    getClientKey,
    resetRateLimit,
} from "@/lib/auth/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { authenticate, seedDemoUser, toPublicUser } from "@/lib/auth/users";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        // Dev only — gives you an account to sign in with immediately.
        await seedDemoUser();

        const rateKey = getClientKey(request, "sign-in");
        const limit = checkRateLimit(rateKey, SIGN_IN_LIMIT);

        if (!limit.allowed) {
            const minutes = Math.ceil(limit.retryAfterSeconds / 60);

            return NextResponse.json(
                {
                    error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"
                        }.`,
                },
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

        const { email, password, rememberMe } = body as Record<string, unknown>;

        if (typeof email !== "string" || typeof password !== "string") {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        if (!email.trim() || !password) {
            return NextResponse.json(
                { error: "Enter your email and password." },
                { status: 400 }
            );
        }

        const user = await authenticate(email, password);

        if (!user) {
            // Deliberately ambiguous: never confirm whether the email exists.
            return NextResponse.json(
                { error: "Email or password is incorrect." },
                { status: 401 }
            );
        }

        resetRateLimit(rateKey);

        await setSessionCookie(
            { userId: user.id, email: user.email, name: user.name },
            rememberMe === true
        );

        return NextResponse.json({ user: toPublicUser(user) });
    } catch (error) {
        console.error("Sign-in error:", error);

        return NextResponse.json(
            { error: "Could not sign you in. Please try again." },
            { status: 500 }
        );
    }
}