import "server-only";

import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "./admin";

/**
 * Firebase Storage — server only.
 *
 * Avatars live at:  avatars/{uid}/{timestamp}.jpg
 *
 * The uid is in the path so security rules can scope access, and the
 * timestamp busts the CDN cache — reusing a fixed filename means browsers
 * keep showing the OLD photo after an upload, which looks broken.
 */

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** Only formats a browser can reliably decode and re-encode. */
export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

function bucket() {
    const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!name) {
        throw new Error(
            "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set. Copy it from Firebase Console -> Project settings -> General."
        );
    }

    return getStorage(getAdminApp()).bucket(name);
}

export interface UploadedAvatar {
    url: string;
    path: string;
}

/** Upload an avatar and return its public URL. */
export async function uploadAvatar(
    uid: string,
    data: Buffer,
    contentType: string
): Promise<UploadedAvatar> {
    const path = `avatars/${uid}/${Date.now()}.jpg`;
    const file = bucket().file(path);

    await file.save(data, {
        contentType,
        resumable: false,
        metadata: {
            // Immutable because the filename changes on every upload.
            cacheControl: "public, max-age=31536000, immutable",
        },
    });

    // Avatars are shown in the UI and in <img> tags, so they need to be
    // readable without a token. Nothing private is stored here.
    await file.makePublic();

    return {
        url: `https://storage.googleapis.com/${bucket().name}/${path}`,
        path,
    };
}

/** Remove every avatar a user has uploaded. */
export async function deleteAvatars(uid: string): Promise<void> {
    try {
        await bucket().deleteFiles({ prefix: `avatars/${uid}/` });
    } catch (error) {
        // A missing file is not a failure worth surfacing to the user.
        console.error("Avatar cleanup failed:", error);
    }
}

/** Delete older avatars, keeping the one just uploaded. */
export async function pruneOldAvatars(
    uid: string,
    keepPath: string
): Promise<void> {
    try {
        const [files] = await bucket().getFiles({ prefix: `avatars/${uid}/` });

        await Promise.all(
            files
                .filter((file) => file.name !== keepPath)
                .map((file) => file.delete().catch(() => undefined))
        );
    } catch (error) {
        console.error("Avatar prune failed:", error);
    }
}