import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Privacy Policy",
    description: "What Audio Studio collects, what it does not, and how your files are handled.",
    path: "/privacy",
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
