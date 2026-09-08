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

/*
 * Eight, laid out four to a row on wide screens — so the card fills two even
 * rows rather than leaving a ragged gap.
 *
 * Ordered audio first, then video, matching the ordering of the full tools
 * grid in components/tools/tool-data.ts.
 */
export const QUICK_TOOLS: QuickTool[] = [
    { name: "Audio Trimmer", href: "/audiotools/trimmer" },
    { name: "Audio Splitter", href: "/audiotools/splitter" },
    { name: "Audio Merger", href: "/audiotools/merger" },
    { name: "Audio Converter", href: "/audiotools/converter" },
    { name: "Volume Normalizer", href: "/audiotools/volume-normalizer" },
    { name: "Ringtone Maker", href: "/othertools/ringtone-maker" },
    { name: "Video to Audio", href: "/videotools/video-to-audio" },
    { name: "Video Trimmer", href: "/videotools/video-trimmer" },
];
