import type { Metadata } from "next";
import { AUDIO_TOOLS } from "@/components/tools/tool-data";

/**
 * Central SEO config.
 *
 * Tool page titles/descriptions are derived from AUDIO_TOOLS so there is a
 * single source of truth — adding a tool to tool-data.ts gives it correct
 * metadata automatically.
 */

export const SITE = {
    name: "Audio Studio",
    /** Update this to your real domain before launch. */
    url: "https://audiostudio.app",
    description:
        "A fast, focused audio and video toolkit for trimming, merging, converting, and shaping sound — right in your browser.",
    locale: "en_US",
} as const;

/** Longer, search-friendly copy for the highest-traffic tools. */
const TOOL_SEO_OVERRIDES: Record<string, string> = {
    "/audiotools/trimmer":
        "Trim MP3, WAV and M4A files online. Cut the exact section you need with a visual waveform — free, no signup, and your file never leaves your browser.",
    "/audiotools/splitter":
        "Split an audio file into multiple parts online. Set your own split points, preview each segment, and download them all as a ZIP.",
    "/audiotools/merger":
        "Merge multiple audio files into one track online. Reorder, trim each clip, and export a single seamless file.",
    "/audiotools/converter":
        "Convert audio between MP3, WAV, AAC, FLAC and OGG online. Fast, free, and no watermark on your output.",
    "/videotools/video-to-audio":
        "Extract the audio track from any MP4, MOV or WEBM video and download it as MP3, WAV, AAC or FLAC.",
    "/othertools/ringtone-maker":
        "Make a custom ringtone from any song. Pick your section, export as MP3, M4R for iPhone, or WAV.",
};

export function buildToolMetadata(href: string): Metadata {
    const tool = AUDIO_TOOLS.find((entry) => entry.href === href);

    if (!tool) {
        return {
            title: SITE.name,
            description: SITE.description,
        };
    }

    const description = TOOL_SEO_OVERRIDES[href] ?? tool.description;
    const title = `${tool.name} — Free Online ${tool.category} Tool`;

    return {
        title,
        description,
        keywords: tool.keywords,
        alternates: {
            canonical: href,
        },
        openGraph: {
            title: `${tool.name} — ${SITE.name}`,
            description,
            url: `${SITE.url}${href}`,
            siteName: SITE.name,
            type: "website",
            locale: SITE.locale,
        },
        twitter: {
            card: "summary_large_image",
            title: `${tool.name} — ${SITE.name}`,
            description,
        },
    };
}

/** Metadata for non-tool pages (about, support, legal...). */
export function buildPageMetadata({
    title,
    description,
    path,
    noIndex = false,
}: {
    title: string;
    description: string;
    path: string;
    noIndex?: boolean;
}): Metadata {
    return {
        title,
        description,
        alternates: { canonical: path },
        robots: noIndex ? { index: false, follow: false } : undefined,
        openGraph: {
            title: `${title} — ${SITE.name}`,
            description,
            url: `${SITE.url}${path}`,
            siteName: SITE.name,
            type: "website",
            locale: SITE.locale,
        },
        twitter: {
            card: "summary_large_image",
            title: `${title} — ${SITE.name}`,
            description,
        },
    };
}

/** Every public route, for the sitemap. */
export const PUBLIC_ROUTES: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/editor", priority: 0.9 },
    { path: "/about", priority: 0.5 },
    { path: "/support", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    ...AUDIO_TOOLS.map((tool) => ({ path: tool.href, priority: 0.8 })),
];

/** Routes that must never be indexed (auth + private dashboard area). */
export const PRIVATE_ROUTES = [
    "/dashboard",
    "/library",
    "/trash",
    "/settings",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
];