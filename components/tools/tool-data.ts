import {
  AudioLines,
  AudioWaveform,
  Combine,
  FileAudio,
  FileVideo,
  Gauge,
  Headphones,
  Info,
  Mic2,
  Music2,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Volume2,
  WandSparkles,
  Waves,
  Zap,
} from "lucide-react";

export type ToolCategory = "Audio" | "Video" | "Other";

export interface AudioTool {
  name: string;
  description: string;
  category: ToolCategory;
  href: string;
  icon: typeof AudioLines;
  visual: "waveform" | "split" | "merge" | "convert" | "bars" | "fade" | "speed" | "pitch" | "silence" | "video" | "player" | "ringtone" | "info";
  featured?: boolean;
  badge?: string;
}

export const AUDIO_TOOLS: AudioTool[] = [
  {
    name: "Audio Trimmer",
    description: "Cut your audio precisely and keep only what you need.",
    category: "Audio",
    href: "/tools/trimmer",
    icon: Scissors,
    visual: "waveform",
    featured: true,
    badge: "Most used",
  },

  {
    name: "Audio Splitter",
    description: "Split one audio file into multiple parts.",
    category: "Audio",
    href: "/tools/splitter",
    icon: AudioWaveform,
    visual: "split",
    featured: true,
  },

  {
    name: "Audio Merger",
    description: "Merge multiple audio files into one seamless track.",
    category: "Audio",
    href: "/tools/merger",
    icon: Combine,
    visual: "merge",
    featured: true,
  },

  {
    name: "Audio Converter",
    description: "Convert audio files between different formats.",
    category: "Audio",
    href: "/tools/converter",
    icon: FileAudio,
    visual: "convert",
    featured: true,
  },

  {
    name: "Audio Compressor",
    description: "Reduce file size while maintaining good quality.",
    category: "Audio",
    href: "/tools/compressor",
    icon: Gauge,
    visual: "bars",
  },

  {
    name: "Volume Normalizer",
    description: "Balance volume for a more consistent sound.",
    category: "Audio",
    href: "/tools/volume-normalizer",
    icon: Volume2,
    visual: "waveform",
  },

  {
    name: "Fade In / Fade Out",
    description: "Add smooth fade effects to your audio.",
    category: "Audio",
    href: "/tools/fade",
    icon: Waves,
    visual: "fade",
  },

  {
    name: "Speed Changer",
    description: "Change playback speed of your audio.",
    category: "Audio",
    href: "/tools/speed",
    icon: Timer,
    visual: "speed",
  },

  {
    name: "Pitch Changer",
    description: "Change the pitch without affecting the tempo.",
    category: "Audio",
    href: "/tools/pitch",
    icon: Music2,
    visual: "pitch",
  },

  {
    name: "Silence Remover",
    description: "Remove unnecessary silent sections automatically.",
    category: "Audio",
    href: "/tools/silence-remover",
    icon: Sparkles,
    visual: "silence",
  },

  {
    name: "Video to Audio",
    description: "Extract audio from your video files.",
    category: "Video",
    href: "/tools/video-to-audio",
    icon: FileVideo,
    visual: "video",
    featured: true,
    badge: "Popular",
  },

  {
    name: "Video Player",
    description: "Play and preview your video files.",
    category: "Video",
    href: "/tools/video-player",
    icon: Headphones,
    visual: "player",
  },

  {
    name: "Video Converter",
    description: "Convert video files between different formats.",
    category: "Video",
    href: "/tools/video-converter",
    icon: FileVideo,
    visual: "convert",
  },

  {
    name: "Video Trimmer",
    description: "Trim your video and keep the best part.",
    category: "Video",
    href: "/tools/video-trimmer",
    icon: Scissors,
    visual: "video",
  },

  {
    name: "Audio Player",
    description: "Play your audio with focused playback controls.",
    category: "Other",
    href: "/tools/audio-player",
    icon: Headphones,
    visual: "player",
  },

  {
    name: "Waveform Viewer",
    description: "Visualize and analyze your audio.",
    category: "Other",
    href: "/tools/waveform",
    icon: AudioLines,
    visual: "waveform",
  },

  {
    name: "Ringtone Maker",
    description: "Create custom ringtones from your favorite audio.",
    category: "Other",
    href: "/tools/ringtone-maker",
    icon: Music2,
    visual: "ringtone",
  },

  {
    name: "File Information",
    description: "View detailed information about your media files.",
    category: "Other",
    href: "/tools/file-information",
    icon: Info,
    visual: "info",
  },
];