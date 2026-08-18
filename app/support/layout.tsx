import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Support",
    description: "Answers to common questions about Audio Studio's audio and video tools, plus how to reach a human.",
    path: "/support",
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
