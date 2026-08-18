import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Reset Password",
    description: "Send yourself a link to reset your Audio Studio password.",
    path: "/forgot-password",
    noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
