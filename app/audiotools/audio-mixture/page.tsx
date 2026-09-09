import { ComingSoon } from "@/components/tools/ComingSoon";

export const metadata = {
  title: "Audio Mixture | Audio Studio",
  description:
    "Pick and arrange segments from multiple audio files into one custom sequence.",
};

/*
 * Committed empty, which broke the production build: a page.tsx with no
 * default export cannot be prerendered, so nothing in the app could deploy.
 * The card for this tool is already live in the grid, so the route needs to
 * render something honest until the tool itself exists.
 */
export default function AudioMixturePage() {
  return (
    <ComingSoon
      eyebrow="Audio"
      title="Audio Mixture"
      description="Pick and arrange segments from multiple audio files into one custom sequence, repeating clips if you like."
      suggestions={[
        { label: "Audio Merger", href: "/audiotools/merger" },
        { label: "Audio Splitter", href: "/audiotools/splitter" },
        { label: "Audio Trimmer", href: "/audiotools/trimmer" },
      ]}
    />
  );
}
