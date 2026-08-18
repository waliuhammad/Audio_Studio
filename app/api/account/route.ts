import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { ensureUserProfile, updateUserProfile } from "@/lib/firebase/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";

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