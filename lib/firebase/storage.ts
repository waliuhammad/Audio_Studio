import "server-only";

import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "./admin";

/**
 * Firebase Storage — server only.
 *
 * Files live at users/{uid}/{collection}/{itemId}/{filename}, which mirrors the
 * Firestore layout exactly. That parallel matters: given a Firestore document
 * you can derive its object path without storing a lookup table, and a prefix
 * delete removes everything belonging to a user in one call.
 *
 * Downloads go through short-lived SIGNED URLs rather than public objects, so
 * a saved file cannot be shared by guessing a path.
 */

/** How long a download link stays valid. Long enough to click, short enough
 *  that a leaked URL stops working quickly. */
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

export class StorageNotConfiguredError extends Error {
    constructor() {
        super(
            "File storage is not set up for this project yet. Enable Storage in the Firebase Console, then set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
        );
        this.name = "StorageNotConfiguredError";
    }
}

function bucket() {
    const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!name) throw new StorageNotConfiguredError();

    return getStorage(getAdminApp()).bucket(name);
}

/**
 * Is Storage actually usable?
 *
 * A configured bucket NAME is not the same as a bucket that exists — Firebase
 * projects ship with the env var filled in long before anyone enables Storage
 * in the console. Callers use this to fail with an explanation instead of an
 * opaque 404 from Google.
 */
export async function isStorageReady(): Promise<boolean> {
    try {
        const [exists] = await bucket().exists();

        return exists;
    } catch {
        return false;
    }
}

/** Strips anything that would let a filename escape its folder. */
export function safeObjectName(fileName: string): string {
    const base = fileName.split(/[\\/]/).pop() ?? "file";

    return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export function objectPathFor(
    uid: string,
    collection: "projects" | "library",
    itemId: string,
    fileName: string
): string {
    return `users/${uid}/${collection}/${itemId}/${safeObjectName(fileName)}`;
}

export async function uploadObject(
    path: string,
    data: Buffer,
    contentType: string
): Promise<void> {
    if (!(await isStorageReady())) throw new StorageNotConfiguredError();

    await bucket().file(path).save(data, {
        contentType,
        resumable: false,
        metadata: { cacheControl: "private, max-age=0" },
    });
}

/**
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
export async function signedDownloadUrl(
    path: string,
    downloadName?: string
): Promise<string> {
    const [url] = await bucket()
        .file(path)
        .getSignedUrl({
            action: "read",
            expires: Date.now() + SIGNED_URL_TTL_MS,
            ...(downloadName
                ? {
                    responseDisposition: `attachment; filename="${safeObjectName(
                        downloadName
                    )}"`,
                }
                : {}),
        });

    return url;
}

/**
 * Best-effort delete.
 *
 * A missing object is not an error here: the Firestore document is the record
 * of truth, and refusing to delete it because its file already vanished would
 * strand the row permanently.
 */
export async function deleteObject(path: string): Promise<void> {
    try {
        await bucket().file(path).delete({ ignoreNotFound: true });
    } catch (error) {
        console.error("Storage delete failed for", path, error);
    }
}

/** Removes every object belonging to a user — for account deletion. */
export async function deleteUserObjects(uid: string): Promise<void> {
    try {
        await bucket().deleteFiles({ prefix: `users/${uid}/`, force: true });
    } catch (error) {
        console.error("Storage prefix delete failed for", uid, error);
    }
}
