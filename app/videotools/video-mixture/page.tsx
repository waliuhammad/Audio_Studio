import { ComingSoon } from "@/components/tools/ComingSoon";

export const metadata = {
  title: "Video Mixture | Audio Studio",
  description:
    "Pick and arrange segments from multiple videos into one custom sequence.",
};

/* Committed empty — see the note in the audio-mixture page. */
export default function VideoMixturePage() {
  return (
    <ComingSoon
      eyebrow="Video"
      title="Video Mixture"
      description="Pick and arrange segments from multiple videos into one custom sequence, repeating clips if you like."
      suggestions={[
        { label: "Video Merger", href: "/videotools/video-merger" },
        { label: "Video Trimmer", href: "/videotools/video-trimmer" },
        { label: "Video Converter", href: "/videotools/video-converter" },
      ]}
    />
  );
}
