import Link from "next/link";
import { ToolResultProvider } from "@/components/library/ToolResult";
import { ArrowLeft } from "lucide-react";

export default function OtherToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolResultProvider>
      <div>
      <div className="container-studio pt-6 sm:pt-8">
        <Link
          href="/#tools"
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
      {children}
      </div>
    </ToolResultProvider>
  );
}