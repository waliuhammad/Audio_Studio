import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current signed-in user, or null. Used by client components. */
export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ user: null });
    }

    const user = await findUserById(session.userId);

    // Valid token but the user is gone (deleted, or the in-memory store reset).
    if (!user) {
        return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: toPublicUser(user) });
}