import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

/**
 * The page is a client component and cannot export metadata, so it lives
 * here, built from tool-data.ts like the other tool layouts.
 */
export const metadata: Metadata = buildToolMetadata("/videotools/audio-video-merger");

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
