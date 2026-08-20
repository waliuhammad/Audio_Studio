import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/firebase/route-helpers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { updateUserPicture } from "@/lib/firebase/firestore";
import {
    ALLOWED_IMAGE_TYPES,
    MAX_AVATAR_BYTES,
    deleteAvatars,
    pruneOldAvatars,
    uploadAvatar,
} from "@/lib/firebase/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST — upload a new profile photo.
 *
 * The browser resizes and re-encodes to JPEG before sending, so what arrives
 * is already small. These checks exist because a direct API call would not
 * have gone through that step.
 */
export async function POST(request: NextRequest) {
    return withUser(async (user) => {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "No image was uploaded." },
                { status: 400 }
            );
        }

        if (file.size === 0) {
            return NextResponse.json({ error: "That file is empty." }, { status: 400 });
        }

        if (file.size > MAX_AVATAR_BYTES) {
            return NextResponse.json(
                { error: "That image is too large. The limit is 5 MB." },
                { status: 400 }
            );
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Use a JPG, PNG or WebP image." },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const { url, path } = await uploadAvatar(user.uid, buffer, file.type);

        // Firebase Auth feeds the session token; Firestore feeds the UI.
        // Both must be updated or the avatar appears in one place and not another.
        await getAdminAuth().updateUser(user.uid, { photoURL: url });
        await updateUserPicture(user.uid, url);

        // Old files would otherwise accumulate and count against storage forever.
        await pruneOldAvatars(user.uid, path);

        return { success: true, url };
    });
}

/** DELETE — remove the photo and fall back to initials. */
export async function DELETE() {
    return withUser(async (user) => {
        await deleteAvatars(user.uid);

        await getAdminAuth().updateUser(user.uid, { photoURL: null });
        await updateUserPicture(user.uid, null);

        return { success: true };
    });
}