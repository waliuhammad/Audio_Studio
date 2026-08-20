import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./admin";
import { deleteAvatars, deleteUserObjects } from "./storage";
import type { SessionUser } from "./session";

/**
 * Firestore data access.
 *
 * Structure — everything a user owns lives UNDER their own document:
 *
 *   users/{uid}
 *   users/{uid}/projects/{projectId}
 *   users/{uid}/library/{itemId}
 *   users/{uid}/trash/{itemId}
 *
 * Subcollections keep security rules trivial ("uid must match the path") and
 * make per-user queries fast without composite indexes. They also mean an id
 * belonging to another user simply is not found, rather than requiring an
 * ownership check on every read.
 *
 * All reads/writes here use the Admin SDK, which BYPASSES security rules.
 * The rules in firestore.rules are the second line of defence for any direct
 * client access; this layer must do its own ownership checks.
 */

/* ===================================================== */
/* TYPES                                                 */
/* ===================================================== */

export type MediaKind = "audio" | "video" | "image" | "folder";
export type ProjectStatus = "done" | "processing" | "draft";

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    picture: string | null;
    plan: "free" | "pro" | "studio";
    storageUsedBytes: number;
    storageLimitBytes: number;
    filesProcessed: number;
    processingSeconds: number;
    createdAt: string;
}

export interface StoredItem {
    id: string;
    name: string;
    kind: MediaKind;
    sizeBytes: number;
    updatedAt: string;
    storagePath?: string;
    meta?: string;
}

export interface StoredProject extends StoredItem {
    status: ProjectStatus;
    durationSeconds?: number;
}

export interface StoredTrashItem extends StoredItem {
    deletedAt: string;
    /** Which collection it came from, so restore puts it back correctly. */
    origin: "projects" | "library";
}

const FREE_STORAGE_LIMIT = 8 * 1024 * 1024 * 1024; // 8 GB

/* ===================================================== */
/* HELPERS                                               */
/* ===================================================== */

function usersRef() {
    return getAdminDb().collection("users");
}

function userDoc(uid: string) {
    return usersRef().doc(uid);
}

/** Firestore Timestamps aren't JSON-serialisable — convert at the boundary. */
function toIso(value: unknown): string {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (typeof value === "string") return value;

    return new Date().toISOString();
}

function docToItem(doc: FirebaseFirestore.QueryDocumentSnapshot): StoredItem {
    const data = doc.data();

    return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : "Untitled",
        kind: (data.kind as MediaKind) ?? "audio",
        sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : 0,
        updatedAt: toIso(data.updatedAt),
        storagePath:
            typeof data.storagePath === "string" ? data.storagePath : undefined,
        meta: typeof data.meta === "string" ? data.meta : undefined,
    };
}

/* ===================================================== */
/* USER PROFILE                                          */
/* ===================================================== */

/** Create the profile on first sign-in; refresh basic fields after that. */
export async function ensureUserProfile(
    user: SessionUser
): Promise<UserProfile> {
    const ref = userDoc(user.uid);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
        const profile = {
            email: user.email,
            name: user.name,
            picture: user.picture,
            plan: "free" as const,
            storageUsedBytes: 0,
            storageLimitBytes: FREE_STORAGE_LIMIT,
            filesProcessed: 0,
            processingSeconds: 0,
            createdAt: FieldValue.serverTimestamp(),
        };

        await ref.set(profile);

        return {
            uid: user.uid,
            ...profile,
            createdAt: new Date().toISOString(),
        };
    }

    // Keep email/picture in step with the auth provider.
    const data = snapshot.data() ?? {};
    const updates: Record<string, unknown> = {};

    if (data.email !== user.email) updates.email = user.email;
    if (user.picture && data.picture !== user.picture) {
        updates.picture = user.picture;
    }

    if (Object.keys(updates).length > 0) {
        await ref.update(updates);
    }

    return {
        uid: user.uid,
        email: user.email,
        name: typeof data.name === "string" ? data.name : user.name,
        picture: user.picture ?? (data.picture as string | null) ?? null,
        plan: (data.plan as UserProfile["plan"]) ?? "free",
        storageUsedBytes:
            typeof data.storageUsedBytes === "number" ? data.storageUsedBytes : 0,
        storageLimitBytes:
            typeof data.storageLimitBytes === "number"
                ? data.storageLimitBytes
                : FREE_STORAGE_LIMIT,
        filesProcessed:
            typeof data.filesProcessed === "number" ? data.filesProcessed : 0,
        processingSeconds:
            typeof data.processingSeconds === "number" ? data.processingSeconds : 0,
        createdAt: toIso(data.createdAt),
    };
}

/** Set or clear the stored avatar URL. */
export async function updateUserPicture(
    uid: string,
    picture: string | null
): Promise<void> {
    await userDoc(uid).update({ picture });
}

export async function updateUserProfile(
    uid: string,
    changes: { name?: string }
): Promise<void> {
    const updates: Record<string, unknown> = {};

    if (typeof changes.name === "string" && changes.name.trim()) {
        updates.name = changes.name.trim().slice(0, 80);
    }

    if (Object.keys(updates).length === 0) return;

    await userDoc(uid).update(updates);
}

/** Atomic counter bump — safe under concurrent requests. */
export async function recordProcessedFile(
    uid: string,
    seconds: number
): Promise<void> {
    await userDoc(uid).update({
        filesProcessed: FieldValue.increment(1),
        processingSeconds: FieldValue.increment(Math.max(0, Math.round(seconds))),
    });
}

/* ===================================================== */
/* READS                                                 */
/* ===================================================== */

export async function listProjects(uid: string): Promise<StoredProject[]> {
    const snapshot = await userDoc(uid)
        .collection("projects")
        .orderBy("updatedAt", "desc")
        .limit(200)
        .get();

    return snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            ...docToItem(doc),
            status: (data.status as ProjectStatus) ?? "done",
            durationSeconds:
                typeof data.durationSeconds === "number"
                    ? data.durationSeconds
                    : undefined,
        };
    });
}

export async function listLibrary(uid: string): Promise<StoredItem[]> {
    const snapshot = await userDoc(uid)
        .collection("library")
        .orderBy("updatedAt", "desc")
        .limit(300)
        .get();

    return snapshot.docs.map(docToItem);
}

export async function listTrash(uid: string): Promise<StoredTrashItem[]> {
    const snapshot = await userDoc(uid)
        .collection("trash")
        .orderBy("deletedAt", "desc")
        .limit(200)
        .get();

    return snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            ...docToItem(doc),
            deletedAt: toIso(data.deletedAt),
            origin: (data.origin as StoredTrashItem["origin"]) ?? "projects",
        };
    });
}

/** A single item, scoped to the owner so foreign ids simply miss. */
export async function getItem(
    uid: string,
    collection: "projects" | "library",
    itemId: string
): Promise<StoredItem | null> {
    const snapshot = await userDoc(uid).collection(collection).doc(itemId).get();

    if (!snapshot.exists) return null;

    return docToItem(snapshot as FirebaseFirestore.QueryDocumentSnapshot);
}

/** Read the profile without creating one. Returns null if absent. */
export async function getProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await userDoc(uid).get();

    if (!snapshot.exists) return null;

    const data = snapshot.data() ?? {};

    return {
        uid,
        email: typeof data.email === "string" ? data.email : "",
        name: typeof data.name === "string" ? data.name : "User",
        picture: (data.picture as string | null) ?? null,
        plan: (data.plan as UserProfile["plan"]) ?? "free",
        storageUsedBytes:
            typeof data.storageUsedBytes === "number" ? data.storageUsedBytes : 0,
        storageLimitBytes:
            typeof data.storageLimitBytes === "number"
                ? data.storageLimitBytes
                : FREE_STORAGE_LIMIT,
        filesProcessed:
            typeof data.filesProcessed === "number" ? data.filesProcessed : 0,
        processingSeconds:
            typeof data.processingSeconds === "number" ? data.processingSeconds : 0,
        createdAt: toIso(data.createdAt),
    };
}

/* ===================================================== */
/* WRITES                                                */
/* ===================================================== */

/** Patch fields on an existing item. */
export async function updateItem(
    uid: string,
    collection: "projects" | "library",
    itemId: string,
    changes: Partial<{
        name: string;
        storagePath: string;
        meta: string;
        status: ProjectStatus;
        durationSeconds: number;
    }>
): Promise<void> {
    await userDoc(uid)
        .collection(collection)
        .doc(itemId)
        .update({ ...changes, updatedAt: FieldValue.serverTimestamp() });
}

/**
 * Remove a record outright, bypassing the trash.
 *
 * Used to roll back when an upload fails after the document was created —
 * sending a half-written item to the trash would just confuse the user.
 */
export async function deleteItemRecord(
    uid: string,
    collection: "projects" | "library",
    itemId: string,
    sizeBytes = 0
): Promise<void> {
    await userDoc(uid).collection(collection).doc(itemId).delete();

    if (sizeBytes > 0) {
        await userDoc(uid).update({
            storageUsedBytes: FieldValue.increment(-sizeBytes),
        });
    }
}

export async function createItem(
    uid: string,
    collection: "projects" | "library",
    input: {
        name: string;
        kind: MediaKind;
        sizeBytes: number;
        status?: ProjectStatus;
        durationSeconds?: number;
        storagePath?: string;
        meta?: string;
    }
): Promise<string> {
    const ref = userDoc(uid).collection(collection).doc();

    await ref.set({
        name: input.name.slice(0, 200),
        kind: input.kind,
        sizeBytes: Math.max(0, input.sizeBytes),
        status: input.status ?? "done",
        durationSeconds: input.durationSeconds ?? null,
        storagePath: input.storagePath ?? null,
        meta: input.meta ?? null,
        updatedAt: FieldValue.serverTimestamp(),
    });

    await userDoc(uid).update({
        storageUsedBytes: FieldValue.increment(Math.max(0, input.sizeBytes)),
    });

    return ref.id;
}

/* ===================================================== */
/* TRASH                                                 */
/* ===================================================== */

/**
 * Move an item to trash.
 *
 * A batch makes the copy and the delete atomic — without it a crash between
 * the two would either duplicate the item or lose it entirely.
 */
export async function moveToTrash(
    uid: string,
    collection: "projects" | "library",
    itemId: string
): Promise<boolean> {
    const db = getAdminDb();
    const sourceRef = userDoc(uid).collection(collection).doc(itemId);
    const snapshot = await sourceRef.get();

    if (!snapshot.exists) return false;

    const batch = db.batch();

    batch.set(userDoc(uid).collection("trash").doc(itemId), {
        ...snapshot.data(),
        origin: collection,
        deletedAt: FieldValue.serverTimestamp(),
    });

    batch.delete(sourceRef);

    await batch.commit();

    return true;
}

export async function restoreFromTrash(
    uid: string,
    itemId: string
): Promise<boolean> {
    const db = getAdminDb();
    const trashRef = userDoc(uid).collection("trash").doc(itemId);
    const snapshot = await trashRef.get();

    if (!snapshot.exists) return false;

    const data = snapshot.data() ?? {};
    const origin = data.origin === "library" ? "library" : ("projects" as const);

    const batch = db.batch();

    // Strip trash-only fields before putting it back.
    const { origin: _origin, deletedAt: _deletedAt, ...rest } = data;

    batch.set(userDoc(uid).collection(origin).doc(itemId), {
        ...rest,
        updatedAt: FieldValue.serverTimestamp(),
    });

    batch.delete(trashRef);

    await batch.commit();

    return true;
}

export async function deleteForever(
    uid: string,
    itemId: string
): Promise<boolean> {
    const ref = userDoc(uid).collection("trash").doc(itemId);
    const snapshot = await ref.get();

    if (!snapshot.exists) return false;

    const size = snapshot.data()?.sizeBytes;

    await ref.delete();

    if (typeof size === "number" && size > 0) {
        await userDoc(uid).update({
            storageUsedBytes: FieldValue.increment(-size),
        });
    }

    return true;
}

/** Firestore batches cap at 500 operations, so this chunks. */
export async function emptyTrash(uid: string): Promise<number> {
    const db = getAdminDb();
    const snapshot = await userDoc(uid).collection("trash").get();

    if (snapshot.empty) return 0;

    let freedBytes = 0;
    let deleted = 0;

    for (let index = 0; index < snapshot.docs.length; index += 450) {
        const chunk = snapshot.docs.slice(index, index + 450);
        const batch = db.batch();

        for (const doc of chunk) {
            const size = doc.data()?.sizeBytes;
            if (typeof size === "number") freedBytes += size;

            batch.delete(doc.ref);
            deleted += 1;
        }

        await batch.commit();
    }

    if (freedBytes > 0) {
        await userDoc(uid).update({
            storageUsedBytes: FieldValue.increment(-freedBytes),
        });
    }

    return deleted;
}
/**
 * Delete everything a user owns, then the user document itself.
 *
 * Firestore does NOT cascade: deleting users/{uid} would leave its
 * subcollections orphaned — invisible to every query, still billable, and
 * unreachable forever. So each one is cleared explicitly first.
 *
 * Stored files go too. An account deletion that left the uploads behind would
 * keep charging for data the user believes they erased.
 *
 * Irreversible, and only used by DELETE /api/account.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
    const db = getAdminDb();

    for (const name of ["projects", "library", "trash"] as const) {
        const snapshot = await userDoc(uid).collection(name).get();

        // Firestore hard-caps a batch at 500 operations.
        for (let index = 0; index < snapshot.docs.length; index += 450) {
            const batch = db.batch();

            for (const doc of snapshot.docs.slice(index, index + 450)) {
                batch.delete(doc.ref);
            }

            await batch.commit();
        }
    }

    // Both helpers swallow their own errors, so a storage hiccup cannot leave
    // the account half-deleted with its auth record already gone.
    await deleteUserObjects(uid);
    await deleteAvatars(uid);

    await userDoc(uid).delete();
}
<<<<<<< HEAD

/**
 * Overwrite a draft project's stored file — used by the editor's "Save draft".
 *
 * The document already exists (createItem made an empty skeleton the moment
 * the file was opened), so this is always an UPDATE, never a create. Storage
 * accounting has to look at the PREVIOUS size on that same document rather
 * than just adding the new size — otherwise re-saving the same draft five
 * times would charge the user for five copies of a file only one of which
 * still exists in Storage (the upload overwrites the same path each time).
 *
 * A transaction keeps the size delta and the byte counter update atomic, so
 * a crash between them can't leave storageUsedBytes drifted from reality.
 */
export async function saveProjectFile(
    uid: string,
    itemId: string,
    input: {
        sizeBytes: number;
        storagePath: string;
        durationSeconds?: number;
        status?: ProjectStatus;
    }
): Promise<boolean> {
    const db = getAdminDb();
    const itemRef = userDoc(uid).collection("projects").doc(itemId);
    const userRef = userDoc(uid);

    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(itemRef);

        if (!snapshot.exists) return false;

        const data = snapshot.data() ?? {};
        const previousSize =
            typeof data.sizeBytes === "number" ? data.sizeBytes : 0;
        const newSize = Math.max(0, input.sizeBytes);
        const delta = newSize - previousSize;

        tx.update(itemRef, {
            sizeBytes: newSize,
            storagePath: input.storagePath,
            durationSeconds: input.durationSeconds ?? null,
            status: input.status ?? "draft",
            updatedAt: FieldValue.serverTimestamp(),
        });

        if (delta !== 0) {
            tx.update(userRef, {
                storageUsedBytes: FieldValue.increment(delta),
            });
        }

        return true;
    });
}

/* ===================================================== */
/* ITEM HELPERS                                          */
/* ===================================================== */

/** The stored profile, or null if the user document is gone. */
export async function getProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await userDoc(uid).get();

    if (!snapshot.exists) return null;

    const data = snapshot.data() ?? {};

    return {
        uid,
        email: typeof data.email === "string" ? data.email : "",
        name: typeof data.name === "string" ? data.name : "",
        picture: typeof data.picture === "string" ? data.picture : null,
        plan: (data.plan as UserProfile["plan"]) ?? "free",
        storageUsedBytes:
            typeof data.storageUsedBytes === "number" ? data.storageUsedBytes : 0,
        storageLimitBytes:
            typeof data.storageLimitBytes === "number"
                ? data.storageLimitBytes
                : FREE_STORAGE_LIMIT,
        filesProcessed:
            typeof data.filesProcessed === "number" ? data.filesProcessed : 0,
        processingSeconds:
            typeof data.processingSeconds === "number" ? data.processingSeconds : 0,
        createdAt: toIso(data.createdAt),
    };
}

/** Read one item — used to resolve its storagePath before a download. */
export async function getItem(
    uid: string,
    collection: "projects" | "library",
    itemId: string
): Promise<StoredItem | null> {
    const snapshot = await userDoc(uid).collection(collection).doc(itemId).get();

    return snapshot.exists ? docToItem(snapshot) : null;
}

export async function updateItem(
    uid: string,
    collection: "projects" | "library",
    itemId: string,
    changes: { name?: string; storagePath?: string; meta?: string }
): Promise<void> {
    const updates: Record<string, unknown> = { ...changes };

    if (Object.keys(updates).length === 0) return;

    updates.updatedAt = FieldValue.serverTimestamp();

    await userDoc(uid).collection(collection).doc(itemId).update(updates);
}

/**
 * Remove a document outright, skipping the trash.
 *
 * This is for rolling back a half-finished create — a save whose upload failed
 * never existed as far as the user is concerned, so putting it in the trash
 * would just leave them a phantom to clean up.
 */
export async function deleteItemRecord(
    uid: string,
    collection: "projects" | "library",
    itemId: string,
    sizeBytes: number
): Promise<void> {
    await userDoc(uid).collection(collection).doc(itemId).delete();

    if (sizeBytes > 0) {
        await userDoc(uid).update({
            storageUsedBytes: FieldValue.increment(-sizeBytes),
        });
    }
}
=======
>>>>>>> fb7e96e8cccd46a065df47f62bfbce8fdde4b7b8
