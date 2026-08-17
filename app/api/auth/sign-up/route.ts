import { NextRequest, NextResponse } from "next/server";
import {
    SIGN_UP_LIMIT,
    checkRateLimit,
    getClientKey,
} from "@/lib/auth/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { createUser, toPublicUser } from "@/lib/auth/users";
import {
    validateConfirmation,
    validateEmail,
    validateName,
    validateNewPassword,
} from "@/lib/auth/validation";

export const runtime = "nodejs";

/**
 * Every rule enforced on the client is re-checked here. Client validation is
 * a convenience; anyone can POST directly to this endpoint.
 */
export async function POST(request: NextRequest) {
    try {
        const limit = checkRateLimit(
            getClientKey(request, "sign-up"),
            SIGN_UP_LIMIT
        );

        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many accounts created from this network. Try again later." },
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

        const { name, email, password, confirmation, acceptedTerms } =
            body as Record<string, unknown>;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const fieldErrors: Record<string, string> = {};

        const nameError = validateName(name);
        if (nameError) fieldErrors.name = nameError;

        const emailError = validateEmail(email);
        if (emailError) fieldErrors.email = emailError;

        const passwordError = validateNewPassword(password);
        if (passwordError) fieldErrors.password = passwordError;

        if (typeof confirmation === "string") {
            const confirmationError = validateConfirmation(password, confirmation);
            if (confirmationError) fieldErrors.confirmation = confirmationError;
        }

        if (acceptedTerms !== true) {
            fieldErrors.terms = "Please accept the terms to continue.";
        }

        if (Object.keys(fieldErrors).length > 0) {
            return NextResponse.json({ fieldErrors }, { status: 400 });
        }

        const user = await createUser({ name, email, password });

        await setSessionCookie(
            { userId: user.id, email: user.email, name: user.name },
            false
        );

        return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            // Sign-up necessarily reveals whether an email is registered — there is
            // no way around it. Sign-in stays deliberately vague instead.
            return NextResponse.json(
                { fieldErrors: { email: "An account with this email already exists." } },
                { status: 409 }
            );
        }

        console.error("Sign-up error:", error);

        return NextResponse.json(
            { error: "Could not create your account. Please try again." },
            { status: 500 }
        );
    }
}