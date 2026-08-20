import "server-only";

import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "./admin";

/**
 * Firebase Storage — server only.
 *
 * Two kinds of object live here, with different visibility:
 *
 *   avatars/{uid}/{timestamp}.jpg        PUBLIC  — shown in <img> tags
 *   users/{uid}/{collection}/{id}/{name} PRIVATE — served via signed URLs
 *
 * The uid appears first in both so security rules can scope by path, and
 * avatars carry a timestamp because a fixed filename would keep serving the
 * old cached image after an upload.
 */

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** Only formats a browser can reliably decode and re-encode. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Thrown when Storage has no bucket configured.
 *
 * A distinct type so routes can answer 503 ("not set up") rather than a
 * generic 500 — the difference between "your upload failed" and "this
 * feature isn't switched on yet".
 */
export class StorageNotConfiguredError extends Error {
    constructor() {
        super(
            "File storage isn't configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET and enable Storage in the Firebase Console."
        );
        this.name = "StorageNotConfiguredError";
    }
}

function bucket() {
    const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!name) {
        throw new StorageNotConfiguredError();
    }

    return getStorage(getAdminApp()).bucket(name);
}

/* ===================================================== */
/* PATHS                                                 */
/* ===================================================== */

/**
 * Build the storage path for a user-owned object.
 *
 *   users/{uid}/library/{itemId}/{safe-name}
 *
 * The itemId folder keeps two files with the same name from colliding.
 */
export function objectPathFor(
    uid: string,
    collection: "library" | "projects",
    itemId: string,
    fileName: string
): string {
    // Strip anything that could escape the intended folder or break a URL.
    const safeName =
        fileName
            .replace(/[\\/]/g, "_")
            .replace(/\.\./g, "_")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(0, 120) || "file";

    return `users/${uid}/${collection}/${itemId}/${safeName}`;
}

/* ===================================================== */
/* USER FILES                                            */
/* ===================================================== */

/** Upload a buffer to the given path. Overwrites if it already exists. */
export async function uploadObject(
    path: string,
    data: Buffer,
    contentType: string
): Promise<void> {
    await bucket().file(path).save(data, {
        contentType,
        // A resumable upload needs a session; a single save() is simpler and
        // fine for the sizes this app accepts.
        resumable: false,
        metadata: {
            cacheControl: "private, max-age=0, no-transform",
        },
    });
}

/**
<<<<<<< HEAD
 * Reads an object's bytes directly, same-origin.
 *
 * signedDownloadUrl() is right for a browser "save this file" click — it
 * hands the transfer to Google's CDN. But when the app itself needs the
 * bytes in JavaScript (e.g. decoding a saved draft back into the editor),
 * fetching a googleapis.com URL from client code can be blocked by CORS
 * depending on bucket configuration. This avoids that by reading the file
 * on the server and returning it through our own origin.
 */
export async function downloadObject(path: string): Promise<Buffer> {
    if (!(await isStorageReady())) throw new StorageNotConfiguredError();

    const [buffer] = await bucket().file(path).download();

    return buffer;
}

/** A temporary, unguessable link the browser can download from directly. */
=======
 * A short-lived, signed URL for downloading a private object.
 *
 * User files are NOT public. A signed URL grants access to one object for a
 * limited window without exposing the bucket or forcing every megabyte
 * through this Node process.
 */
>>>>>>> fb7e96e8cccd46a065df47f62bfbce8fdde4b7b8
export async function signedDownloadUrl(
    path: string,
    /** A filename forces a download; an options object allows a custom expiry. */
    downloadNameOrOptions?: string | { downloadName?: string; expiresInMs?: number }
): Promise<string> {
    const options =
        typeof downloadNameOrOptions === "string"
            ? { downloadName: downloadNameOrOptions }
            : downloadNameOrOptions ?? {};

    const expiresInMs = options.expiresInMs ?? 15 * 60 * 1000;

    const [url] = await bucket()
        .file(path)
        .getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + expiresInMs,
            // Makes the browser download rather than render it inline.
            responseDisposition: options.downloadName
                ? `attachment; filename="${encodeURIComponent(options.downloadName)}"`
                : undefined,
        });

    return url;
}

/** Delete a single stored object. A missing file is not an error. */
export async function deleteObject(path: string): Promise<void> {
    try {
        await bucket().file(path).delete();
    } catch (error) {
        console.error("Object delete failed:", path, error);
    }
}

/** Delete everything a user owns — used when an account is removed. */
export async function deleteUserObjects(uid: string): Promise<void> {
    try {
        await Promise.all([
            bucket().deleteFiles({ prefix: `users/${uid}/` }),
            bucket().deleteFiles({ prefix: `avatars/${uid}/` }),
        ]);
    } catch (error) {
        console.error("User object cleanup failed:", error);
    }
}

/* ===================================================== */
/* AVATARS                                               */
/* ===================================================== */

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

    // Avatars appear in <img> tags, so they need to be readable without a
    // token. Nothing private is stored here.
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