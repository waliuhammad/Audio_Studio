import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * POST, not GET — a GET sign-out can be triggered by any <img> tag on a
 * third-party page, logging your users out unexpectedly.
 */
export async function POST() {
    clearSessionCookie();

    return NextResponse.json({ success: true });
}