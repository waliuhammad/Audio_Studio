import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Sign In",
    description: "Sign in to your Audio Studio account to reach your projects, library and saved files.",
    path: "/sign-in",
    noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
