import { ToolResultProvider } from "@/components/library/ToolResult";
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
        {children}
      </div>
    </ToolResultProvider>
  );
}