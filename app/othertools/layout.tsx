import { ToolResultProvider } from "@/components/library/ToolResult";
import { UsageMeter } from "@/components/usage/UsageMeter";
import { BackToTools } from "@/components/tools/backToTools";

export default function OtherToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolResultProvider>
      <div>
        <BackToTools />
        <UsageMeter />

      {children}
      </div>
    </ToolResultProvider>
  );
}