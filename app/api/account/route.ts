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

        const { name, notificationPrefs } = body as Record<string, unknown>;

        /*
         * Both fields are optional and independent.
         *
         * The settings screen saves the profile form and the notification
         * toggles from different controls, and requiring a name on every
         * request would mean a toggle could not be flipped without also
         * re-submitting the form.
         */
        const hasName = name !== undefined;
        const hasPrefs = notificationPrefs !== undefined;

        if (!hasName && !hasPrefs) {
            return NextResponse.json(
                { error: "Nothing to update." },
                { status: 400 }
            );
        }

        if (hasName && (typeof name !== "string" || name.trim().length < 2)) {
            return NextResponse.json(
                { error: "Enter a name with at least 2 characters." },
                { status: 400 }
            );
        }

        let prefs: Record<string, boolean> | undefined;

        if (hasPrefs) {
            if (
                !notificationPrefs ||
                typeof notificationPrefs !== "object" ||
                Array.isArray(notificationPrefs)
            ) {
                return NextResponse.json(
                    { error: "Invalid notification settings." },
                    { status: 400 }
                );
            }

            // Whitelist to booleans and cap the size — this map is written
            // straight to the document, so it must not become a place to
            // stash arbitrary data.
            prefs = {};

            for (const [key, value] of Object.entries(
                notificationPrefs as Record<string, unknown>
            ).slice(0, 40)) {
                if (typeof value === "boolean" && /^[a-z0-9-]{1,60}$/.test(key)) {
                    prefs[key] = value;
                }
            }
        }

        if (hasName) {
            // Keep Firebase Auth and Firestore in step — the auth record feeds
            // the session token claims, Firestore feeds the UI.
            await getAdminAuth().updateUser(user.uid, {
                displayName: (name as string).trim(),
            });
        }

        await updateUserProfile(user.uid, {
            ...(hasName ? { name: name as string } : {}),
            ...(prefs ? { notificationPrefs: prefs } : {}),
        });

        return {
            success: true,
            ...(hasName ? { name: (name as string).trim() } : {}),
            ...(prefs ? { notificationPrefs: prefs } : {}),
        };
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
