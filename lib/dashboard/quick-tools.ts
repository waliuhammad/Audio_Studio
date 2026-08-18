/**
 * Shortcuts shown on the dashboard.
 *
 * This is static configuration, not data — it belongs in the codebase rather
 * than in Firestore, because the set only changes when a tool ships.
 */

export interface QuickTool {
    name: string;
    href: string;
}

export const QUICK_TOOLS: QuickTool[] = [
    { name: "Audio Trimmer", href: "/audiotools/trimmer" },
    { name: "Audio Merger", href: "/audiotools/merger" },
    { name: "Audio Converter", href: "/audiotools/converter" },
    { name: "Video to Audio", href: "/videotools/video-to-audio" },
    { name: "Volume Normalizer", href: "/audiotools/volume-normalizer" },
    { name: "Ringtone Maker", href: "/othertools/ringtone-maker" },
];
