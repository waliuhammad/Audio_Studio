"use client";

import type {
    LibraryItem,
    MediaKind,
    Project,
    ProjectStatus,
    TrashItem,
} from "./types";

/**
 * Browser-side data access for the signed-in screens.
 *
 * Two jobs: talk to /api/*, and translate between the two shapes in play.
 * Firestore stores absolute ISO timestamps; the UI types store `ageMinutes`
 * relative to render time (see the note in types.ts about hydration). The
 * conversion has to happen SOMEWHERE, and doing it once at the boundary keeps
 * every screen working with a single shape.
 */

/** Days an item survives in the trash before it is purged. */
export const TRASH_RETENTION_DAYS = 30;

interface RawItem {
    id: string;
    name: string;
    kind: MediaKind;
    sizeBytes: number;
    updatedAt: string;
    meta?: string;
    storagePath?: string;
}

interface RawProject extends RawItem {
    status: ProjectStatus;
    durationSeconds?: number;
}

interface RawTrashItem extends RawItem {
    deletedAt: string;
    origin: "projects" | "library";
}

function minutesSince(iso: string): number {
    const then = Date.parse(iso);

    if (!Number.isFinite(then)) return 0;

    return Math.max(0, Math.round((Date.now() - then) / 60_000));
}

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
            error?: string;
        };

        throw new Error(data.error ?? `Request failed (HTTP ${response.status}).`);
    }

    return (await response.json()) as T;
}

async function send(url: string, method: "DELETE" | "PATCH"): Promise<void> {
    const response = await fetch(url, { method });

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
            error?: string;
        };

        throw new Error(data.error ?? `Request failed (HTTP ${response.status}).`);
    }
}

/* ===================================================== */
/* READS                                                 */
/* ===================================================== */

export async function fetchProjects(): Promise<Project[]> {
    const { projects } = await getJson<{ projects: RawProject[] }>(
        "/api/projects"
    );

    return projects.map((project) => ({
        id: project.id,
        name: project.name,
        kind: project.kind,
        sizeBytes: project.sizeBytes,
        ageMinutes: minutesSince(project.updatedAt),
        status: project.status,
        durationSeconds: project.durationSeconds,
    }));
}

export async function fetchLibrary(): Promise<LibraryItem[]> {
    const { items } = await getJson<{ items: RawItem[] }>("/api/library");

    return items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        sizeBytes: item.sizeBytes,
        ageMinutes: minutesSince(item.updatedAt),
        meta: item.meta,
    }));
}

export async function fetchTrash(): Promise<TrashItem[]> {
    const { items } = await getJson<{ items: RawTrashItem[] }>("/api/trash");

    return items.map((item) => {
        const deletedMinutesAgo = minutesSince(item.deletedAt);
        const daysSinceDeletion = deletedMinutesAgo / (60 * 24);

        return {
            id: item.id,
            name: item.name,
            kind: item.kind,
            sizeBytes: item.sizeBytes,
            ageMinutes: deletedMinutesAgo,
            deletedOn: new Date(item.deletedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
            }),
            daysUntilPurge: Math.max(
                0,
                Math.ceil(TRASH_RETENTION_DAYS - daysSinceDeletion)
            ),
            origin: item.origin,
        };
    });
}

/* ===================================================== */
/* WRITES                                                */
/* ===================================================== */

/** Recoverable — the item lands in the trash. */
export async function trashProject(id: string): Promise<void> {
    await send(`/api/projects/${id}`, "DELETE");
}

/** Recoverable — the item lands in the trash. */
export async function trashLibraryItem(id: string): Promise<void> {
    await send(`/api/library/${id}`, "DELETE");
}

/** Puts an item back in whichever collection it came from. */
export async function restoreItem(id: string): Promise<void> {
    await send(`/api/trash/${id}`, "PATCH");
}

/** Irreversible. */
export async function deleteForever(id: string): Promise<void> {
    await send(`/api/trash/${id}`, "DELETE");
}

/** Irreversible, and empties everything at once. */
export async function emptyTrash(): Promise<number> {
    const response = await fetch("/api/trash", { method: "DELETE" });

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
            error?: string;
        };

        throw new Error(data.error ?? "Could not empty the trash.");
    }

    const { deleted } = (await response.json()) as { deleted: number };

    return deleted;
}

/** Where the browser can fetch a saved file. Redirects to a signed URL. */
export function libraryDownloadUrl(id: string): string {
    return `/api/library/${id}/download`;
}

/* ===================================================== */
/* ACCOUNT                                               */
/* ===================================================== */

export async function updateAccountName(name: string): Promise<string> {
    const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });

    const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        name?: string;
    };

    if (!response.ok) {
        throw new Error(data.error ?? "Could not save your changes.");
    }

    return data.name ?? name;
}
