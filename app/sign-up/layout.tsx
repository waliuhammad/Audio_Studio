import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Create Account",
    description: "Create a free Audio Studio account to save your projects and build a media library.",
    path: "/sign-up",
    noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
