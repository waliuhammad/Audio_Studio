/**
 * Placeholder data for the dashboard area.
 *
 * This is the ONLY file that needs to change when the backend lands — swap
 * these constants for fetch calls returning the same shapes and every screen
 * keeps working unchanged.
 */

import type { LibraryItem, Project, TrashItem } from "./types";

const MB = 1024 * 1024;
const GB = 1024 * MB;

const HOUR = 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/* ===================================================== */
/* ACCOUNT                                               */
/* ===================================================== */

export interface AccountSummary {
    name: string;
    email: string;
    initials: string;
    plan: string;
    storageUsedBytes: number;
    storageLimitBytes: number;
    projectCount: number;
    filesProcessed: number;
    processingMinutes: number;
}

export const ACCOUNT: AccountSummary = {
    name: "Ada Lovelace",
    email: "ada@audiostudio.app",
    initials: "AL",
    plan: "Free",
    storageUsedBytes: Math.round(6.2 * GB),
    storageLimitBytes: 8 * GB,
    projectCount: 24,
    filesProcessed: 342,
    processingMinutes: 246,
};

/* ===================================================== */
/* PROJECTS                                              */
/* ===================================================== */

export const PROJECTS: Project[] = [
    {
        id: "p-01",
        name: "podcast_episode_12.wav",
        kind: "audio",
        sizeBytes: Math.round(84.2 * MB),
        ageMinutes: 2 * HOUR,
        status: "done",
        durationSeconds: 2745,
    },
    {
        id: "p-02",
        name: "client_demo_mix.mov",
        kind: "video",
        sizeBytes: Math.round(210.5 * MB),
        ageMinutes: 1 * DAY,
        status: "done",
        durationSeconds: 312,
    },
    {
        id: "p-03",
        name: "studio_session_master.wav",
        kind: "audio",
        sizeBytes: Math.round(148.9 * MB),
        ageMinutes: 1 * DAY + 6 * HOUR,
        status: "processing",
        durationSeconds: 1880,
    },
    {
        id: "p-04",
        name: "voiceover_final_02.mp3",
        kind: "audio",
        sizeBytes: Math.round(9.3 * MB),
        ageMinutes: 3 * DAY,
        status: "done",
        durationSeconds: 244,
    },
    {
        id: "p-05",
        name: "wedding_highlight_reel.mp4",
        kind: "video",
        sizeBytes: Math.round(512.4 * MB),
        ageMinutes: 4 * DAY,
        status: "done",
        durationSeconds: 428,
    },
    {
        id: "p-06",
        name: "beats_lofi_loop.wav",
        kind: "audio",
        sizeBytes: Math.round(22.0 * MB),
        ageMinutes: 1 * WEEK,
        status: "draft",
        durationSeconds: 96,
    },
    {
        id: "p-07",
        name: "band_rehearsal_trim.m4a",
        kind: "audio",
        sizeBytes: Math.round(41.7 * MB),
        ageMinutes: 1 * WEEK + 2 * DAY,
        status: "done",
        durationSeconds: 1105,
    },
    {
        id: "p-08",
        name: "product_demo_v2.mp4",
        kind: "video",
        sizeBytes: Math.round(620.1 * MB),
        ageMinutes: 2 * WEEK,
        status: "processing",
        durationSeconds: 186,
    },
    {
        id: "p-09",
        name: "intro_logo_sting.flac",
        kind: "audio",
        sizeBytes: Math.round(6.8 * MB),
        ageMinutes: 3 * WEEK,
        status: "done",
        durationSeconds: 8,
    },
];

/* ===================================================== */
/* LIBRARY                                               */
/* ===================================================== */

export const LIBRARY: LibraryItem[] = [
    {
        id: "l-01",
        name: "drums_break_loop.wav",
        kind: "audio",
        sizeBytes: Math.round(12.4 * MB),
        ageMinutes: 3 * HOUR,
        meta: "Audio",
    },
    {
        id: "l-02",
        name: "guitar_clean_riff.wav",
        kind: "audio",
        sizeBytes: Math.round(8.2 * MB),
        ageMinutes: 9 * HOUR,
        meta: "Audio",
    },
    {
        id: "l-03",
        name: "client_showreel.mp4",
        kind: "video",
        sizeBytes: Math.round(210.5 * MB),
        ageMinutes: 1 * DAY,
        meta: "1920×1080 · 01:42",
    },
    {
        id: "l-04",
        name: "album_cover_art.png",
        kind: "image",
        sizeBytes: Math.round(6.1 * MB),
        ageMinutes: 2 * DAY,
        meta: "3000×3000",
    },
    {
        id: "l-05",
        name: "vo_announcer_v3.mp3",
        kind: "audio",
        sizeBytes: Math.round(3.8 * MB),
        ageMinutes: 3 * DAY,
        meta: "Audio",
    },
    {
        id: "l-06",
        name: "Project_Master_2026",
        kind: "folder",
        sizeBytes: 0,
        ageMinutes: 4 * DAY,
        meta: "Folder",
    },
    {
        id: "l-07",
        name: "synth_pad_texture.wav",
        kind: "audio",
        sizeBytes: Math.round(22.0 * MB),
        ageMinutes: 5 * DAY,
        meta: "Audio",
    },
    {
        id: "l-08",
        name: "broll_city_night.mp4",
        kind: "video",
        sizeBytes: Math.round(88.7 * MB),
        ageMinutes: 1 * WEEK,
        meta: "1920×1080 · 00:58",
    },
    {
        id: "l-09",
        name: "podcast_intro_sting.flac",
        kind: "audio",
        sizeBytes: Math.round(4.9 * MB),
        ageMinutes: 1 * WEEK + 3 * DAY,
        meta: "Audio",
    },
    {
        id: "l-10",
        name: "thumbnail_wide.jpg",
        kind: "image",
        sizeBytes: Math.round(1.4 * MB),
        ageMinutes: 2 * WEEK,
        meta: "1920×1080",
    },
    {
        id: "l-11",
        name: "Field_Recordings",
        kind: "folder",
        sizeBytes: 0,
        ageMinutes: 3 * WEEK,
        meta: "Folder",
    },
    {
        id: "l-12",
        name: "foley_rain_close.wav",
        kind: "audio",
        sizeBytes: Math.round(15.3 * MB),
        ageMinutes: 4 * WEEK,
        meta: "Audio",
    },
];

/* ===================================================== */
/* TRASH                                                 */
/* ===================================================== */

export const TRASH: TrashItem[] = [
    {
        id: "t-01",
        name: "old_voiceover_draft_09.mp3",
        kind: "audio",
        sizeBytes: Math.round(5.6 * MB),
        ageMinutes: 5 * DAY,
        deletedOn: "Feb 12, 2026",
        daysUntilPurge: 18,
    },
    {
        id: "t-02",
        name: "outtake_clip_alt_01.mov",
        kind: "video",
        sizeBytes: Math.round(184.3 * MB),
        ageMinutes: 7 * DAY,
        deletedOn: "Feb 10, 2026",
        daysUntilPurge: 16,
    },
    {
        id: "t-03",
        name: "rough_beat_v2.wav",
        kind: "audio",
        sizeBytes: Math.round(14.2 * MB),
        ageMinutes: 9 * DAY,
        deletedOn: "Feb 8, 2026",
        daysUntilPurge: 14,
    },
    {
        id: "t-04",
        name: "old_logo_draft.png",
        kind: "image",
        sizeBytes: Math.round(2.1 * MB),
        ageMinutes: 12 * DAY,
        deletedOn: "Feb 5, 2026",
        daysUntilPurge: 11,
    },
    {
        id: "t-05",
        name: "Archive_2025",
        kind: "folder",
        sizeBytes: 0,
        ageMinutes: 16 * DAY,
        deletedOn: "Feb 1, 2026",
        daysUntilPurge: 7,
    },
];

/* ===================================================== */
/* QUICK TOOLS                                           */
/* ===================================================== */

export interface QuickTool {
    name: string;
    href: string;
}

/**
 * NOTE: these previously pointed at /tools/* , which does not exist —
 * all six were 404s. Corrected to the real route groups.
 */
export const QUICK_TOOLS: QuickTool[] = [
    { name: "Audio Trimmer", href: "/audiotools/trimmer" },
    { name: "Audio Merger", href: "/audiotools/merger" },
    { name: "Audio Converter", href: "/audiotools/converter" },
    { name: "Video to Audio", href: "/videotools/video-to-audio" },
    { name: "Volume Normalizer", href: "/audiotools/volume-normalizer" },
    { name: "Ringtone Maker", href: "/othertools/ringtone-maker" },
];