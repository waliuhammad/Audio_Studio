import { ToolResultProvider } from "@/components/library/ToolResult";
import { BackToTools } from "@/components/tools/backToTools";

export default function AudioToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolResultProvider>
      <div>
        <BackToTools />
        {children}
      </div>
    </ToolResultProvider>
  );
}