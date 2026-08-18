import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkRateLimit, getClientKey } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Signing up 3 addresses an hour from one IP is plenty for a real person. */
const NEWSLETTER_LIMIT = {
    limit: 3,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000,
};

/**
 * POST — record a newsletter subscription.
 *
 * Stored in Firestore rather than pushed to a mailing-list provider, because
 * there is no provider configured yet. The addresses collect in one place and
 * can be exported to whichever service gets chosen later — which is far better
 * than the previous behaviour, where the form swallowed every address.
 *
 * The email is its own document id, so signing up twice updates one record
 * instead of creating duplicates.
 */
export async function POST(request: NextRequest) {
    try {
        const limit = checkRateLimit(
            getClientKey(request, "newsletter"),
            NEWSLETTER_LIMIT
        );

        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many sign-ups. Please try again later." },
                {
                    status: 429,
                    headers: { "Retry-After": String(limit.retryAfterSeconds) },
                }
            );
        }

        const body = (await request.json().catch(() => null)) as {
            email?: unknown;
        } | null;

        const email =
            typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

        if (!email || !EMAIL_PATTERN.test(email) || email.length > 200) {
            return NextResponse.json(
                { error: "Enter a valid email address." },
                { status: 400 }
            );
        }

        await getAdminDb()
            .collection("newsletter")
            .doc(email)
            .set(
                {
                    email,
                    subscribedAt: new Date().toISOString(),
                    source: "footer",
                },
                { merge: true }
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Newsletter signup failed:", error);

        return NextResponse.json(
            { error: "Could not sign you up right now. Please try again." },
            { status: 500 }
        );
    }
}
