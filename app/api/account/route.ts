import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import {
    deleteAllUserData,
    ensureUserProfile,
    updateUserProfile,
} from "@/lib/firebase/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";
import { clearSessionCookie } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — the signed-in user's profile. */
export async function GET() {
    return withUser(async (user) => ({
        profile: await ensureUserProfile(user),
    }));
}

/** PATCH — update the display name. */
export async function PATCH(request: NextRequest) {
    return withUser(async (user) => {
        const body = await request.json().catch(() => null);

        if (!body || typeof body !== "object") {
            throw new Error("Invalid request.");
        }

        const { name } = body as Record<string, unknown>;

        if (typeof name !== "string" || name.trim().length < 2) {
            return NextResponse.json(
                { error: "Enter a name with at least 2 characters." },
                { status: 400 }
            );
        }

        // Keep Firebase Auth and Firestore in step — the auth record feeds the
        // session token claims, Firestore feeds the UI.
        await getAdminAuth().updateUser(user.uid, { displayName: name.trim() });
        await updateUserProfile(user.uid, { name });

        return { success: true, name: name.trim() };
    });
}

/**
 * DELETE — erase the account and everything in it. Irreversible.
 *
 * Order matters: Firestore first, then the auth record. If it ran the other
 * way and the second step failed, the documents would be stranded with no
 * signed-in user who could ever reach them again.
 */
export async function DELETE() {
    return withUser(async (user) => {
        await deleteAllUserData(user.uid);
        await getAdminAuth().deleteUser(user.uid);

        // The session cookie outlives the account it points at, so drop it
        // here rather than leaving the browser to present a cookie for a user
        // that no longer exists.
        clearSessionCookie();

        return { success: true };
    });
}
