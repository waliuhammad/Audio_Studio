import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Terms of Service",
    description: "The terms that apply when you use Audio Studio.",
    path: "/terms",
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
