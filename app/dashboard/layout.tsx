import { ProtectedShell } from "@/components/dashboard/ProtectedShell";

/** Verifies the session server-side and provides the account to the tree. */
export default function Layout({ children }: { children: React.ReactNode }) {
    return <ProtectedShell>{children}</ProtectedShell>;
}
