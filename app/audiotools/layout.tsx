import { ToolResultProvider } from "@/components/library/ToolResult";
import { UsageMeter } from "@/components/usage/UsageMeter";
import { BackToTools } from "@/components/tools/backToTools";
import { DropGuard } from "@/components/tools/DropGuard";

export default function AudioToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolResultProvider>
      <div>
        <DropGuard />
        <BackToTools />
        <UsageMeter />

      {children}
      </div>
    </ToolResultProvider>
  );
}