/**
 * Shared types and formatters for the dashboard area
 * (Dashboard, Projects, Library, Trash).
 *
 * Design note: this layer deliberately stores RAW values — bytes as numbers,
 * age as minutes — rather than pre-formatted strings like "84.2 MB" or
 * "2 hours ago". Display strings can't be sorted or filtered, and sorting by
 * size and date is the whole point of these screens. Formatting happens at
 * render time via the helpers below.
 */

import type { LucideIcon } from "lucide-react";
import {
    FileAudio,
    FileVideo,
    Folder,
    Image as ImageIcon,
    Music,
} from "lucide-react";

/* ===================================================== */
/* CORE TYPES                                            */
/* ===================================================== */

export type MediaKind = "audio" | "video" | "image" | "folder";

export type ProjectStatus = "done" | "processing" | "draft";

export interface MediaItem {
    /** Stable key for React lists and selection sets. */
    id: string;
    name: string;
    kind: MediaKind;
    /** Raw size in bytes. Folders use 0. */
    sizeBytes: number;
    /**
     * Age in minutes, not a timestamp.
     *
     * Using a fixed offset instead of Date.now() keeps the rendered label
     * identical on the server and on the client, which avoids a React
     * hydration mismatch. Swap this for a real ISO `updatedAt` when the
     * backend supplies one.
     */
    ageMinutes: number;
}

export interface Project extends MediaItem {
    status: ProjectStatus;
    /** Duration in seconds, when known. */
    durationSeconds?: number;
}

export interface LibraryItem extends MediaItem {
    /** Extra descriptor, e.g. "1920×1080 · 01:42". */
    meta?: string;
}

export interface TrashItem extends MediaItem {
    deletedOn: string;
    /** Days remaining before permanent deletion. */
    daysUntilPurge: number;
}

/* ===================================================== */
/* ICONS                                                 */
/* ===================================================== */

/**
 * Icons are derived from `kind` rather than stored on each record, so the
 * data stays plain JSON and can come straight from an API later.
 */
export function getIconForKind(kind: MediaKind, name = ""): LucideIcon {
    if (kind === "folder") return Folder;
    if (kind === "video") return FileVideo;
    if (kind === "image") return ImageIcon;

    const lower = name.toLowerCase();
    const isMusical =
        lower.endsWith(".flac") ||
        lower.includes("beat") ||
        lower.includes("loop") ||
        lower.includes("sting") ||
        lower.includes("drum");

    return isMusical ? Music : FileAudio;
}

export const KIND_LABEL: Record<MediaKind, string> = {
    audio: "Audio",
    video: "Video",
    image: "Image",
    folder: "Folder",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
    done: "Done",
    processing: "Processing",
    draft: "Draft",
};

/** Tailwind classes for each status pill. */
export const STATUS_CLASS: Record<ProjectStatus, string> = {
    done: "border-teal/30 bg-teal/10 text-teal",
    processing: "border-amber/30 bg-amber/10 text-amber",
    draft: "border-paper-border bg-paper-raised text-graphite-muted dark:border-ink-border dark:bg-ink-raised dark:text-mist-muted",
};

/* ===================================================== */
/* FORMATTERS                                            */
/* ===================================================== */

export function formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "—";

    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024))
    );

    const value = bytes / 1024 ** exponent;

    return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent] ?? "B"
        }`;
}

export function formatAge(minutes: number): string {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${Math.floor(minutes)} min ago`;

    const hours = minutes / 60;
    if (hours < 24) {
        const rounded = Math.floor(hours);
        return rounded === 1 ? "1 hour ago" : `${rounded} hours ago`;
    }

    const days = hours / 24;
    if (days < 2) return "Yesterday";
    if (days < 7) return `${Math.floor(days)} days ago`;

    const weeks = days / 7;
    if (weeks < 2) return "Last week";
    if (weeks < 5) return `${Math.floor(weeks)} weeks ago`;

    const months = days / 30;
    return months < 2 ? "Last month" : `${Math.floor(months)} months ago`;
}

export function formatDuration(seconds?: number): string {
    if (!seconds || !Number.isFinite(seconds)) return "—";

    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

/* ===================================================== */
/* SORTING                                               */
/* ===================================================== */

export type SortKey = "name" | "size" | "date";

export const SORT_LABEL: Record<SortKey, string> = {
    name: "Name",
    size: "Size",
    date: "Date",
};

/** Returns a NEW sorted array — never mutates the input. */
export function sortItems<T extends MediaItem>(
    items: T[],
    key: SortKey,
    ascending = false
): T[] {
    const sorted = [...items].sort((a, b) => {
        switch (key) {
            case "name":
                return a.name.localeCompare(b.name);
            case "size":
                return a.sizeBytes - b.sizeBytes;
            case "date":
            default:
                // Smaller age = more recent, so invert for a "newest first" default.
                return b.ageMinutes - a.ageMinutes;
        }
    });

    return ascending ? sorted : sorted.reverse();
}

/** Case-insensitive substring match on the item name. */
export function matchesSearch(item: MediaItem, query: string): boolean {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return true;

    return item.name.toLowerCase().includes(trimmed);
}