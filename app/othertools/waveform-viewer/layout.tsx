import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

/**
 * The page itself is a client component and cannot export metadata, so it
 * lives here. Copy comes from tool-data.ts via buildToolMetadata(), keeping
 * one source of truth for every tool's name, description and keywords.
 */
export const metadata: Metadata = buildToolMetadata("/othertools/waveform-viewer");

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
