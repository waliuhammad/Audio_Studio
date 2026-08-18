import type { Metadata } from "next";
import { ToolResultProvider } from "@/components/library/ToolResult";

export const metadata: Metadata = {
    title: "Audio Editor",
    description:
        "Trim, fade, normalize, reverse and export your audio in a full waveform editor that runs entirely in your browser.",
};

export default function EditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ToolResultProvider>{children}</ToolResultProvider>;
}