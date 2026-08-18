import "server-only";

import { NextResponse } from "next/server";
import { SessionError, getSessionUser, type SessionUser } from "./session";

/**
 * Shared plumbing for the authenticated data routes.
 *
 * withUser() guarantees every handler runs with a VERIFIED session. Middleware
 * only checks that a cookie exists (Edge runtime can't run the Admin SDK), so
 * this is the actual security boundary for these endpoints.
 */

export function apiError(error: unknown): NextResponse {
    if (error instanceof SessionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("API route error:", error);

    return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
    );
}

export async function withUser<T>(
    handler: (user: SessionUser) => Promise<T>
): Promise<NextResponse> {
    try {
        const user = await getSessionUser();

        if (!user) {
            return NextResponse.json(
                { error: "You need to be signed in to do that." },
                { status: 401 }
            );
        }

        const result = await handler(user);

        return NextResponse.json(result);
    } catch (error) {
        return apiError(error);
    }
}