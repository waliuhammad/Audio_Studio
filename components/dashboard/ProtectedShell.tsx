import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";
import { ensureUserProfile, listProjects } from "@/lib/firebase/firestore";
import { toAccountSummary } from "@/lib/dashboard/account";
import { SessionProvider } from "@/components/providers/SessionProvider";

/**
 * Server-side wrapper for every signed-in screen.
 *
 * Middleware already bounces anonymous visitors, but it only INSPECTS the
 * cookie — it cannot verify it. This is where the signature is actually
 * checked, so a forged cookie gets no further than here.
 *
 * It also resolves the account once per navigation and hands it to the client
 * tree, which is why the dashboard, settings and trash screens can all render
 * the real user without each fetching it themselves.
 */
export async function ProtectedShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getSessionUser();

    if (!user) redirect("/sign-in");

    const [profile, projects] = await Promise.all([
        ensureUserProfile(user),
        listProjects(user.uid),
    ]);

    return (
        <SessionProvider account={toAccountSummary(profile, projects.length)}>
            {children}
        </SessionProvider>
    );
}
