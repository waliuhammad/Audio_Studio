import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";

/**
 * "Back to all tools" for every tool category layout (audio/video/other).
 *
 * Tools are usable signed-out — that's the whole pitch — so this link has to
 * serve two audiences from the same route tree. A signed-in user got here
 * from the dashboard and should land back on /dashboard/tools, inside the
 * Sidebar/Topbar shell. A signed-out visitor got here from the marketing
 * site and should land back on the landing page's tools section — sending
 * them to /dashboard/tools would just bounce them through a sign-in redirect.
 */
export async function BackToTools() {
  const user = await getSessionUser();
  const href = user ? "/dashboard/tools" : "/#tools";

  return (
    <div className="container-studio pt-6 sm:pt-8">
      <Link
        href={href}
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-medium
          text-graphite-muted
          transition-colors
          hover:text-amber
          dark:text-mist-muted
          dark:hover:text-amber
        "
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all tools
      </Link>
    </div>
  );
}