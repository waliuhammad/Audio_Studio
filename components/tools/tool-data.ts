import {
  AudioLines,
  AudioWaveform,
  Combine,
  FileAudio,
  FileVideo,
  Gauge,
  Headphones,
  Info,
  Music2,
  Scissors,
  Sparkles,
  Timer,
  Volume2,
  Waves,
} from "lucide-react";

export type ToolCategory = "Audio" | "Video" | "Other";

export type ToolVisual =
  | "waveform"
  | "split"
  | "merge"
  | "convert"
  | "bars"
  | "fade"
  | "speed"
  | "pitch"
  | "silence"
  | "video"
  | "player"
  | "ringtone"
  | "info";

export interface AudioTool {
  name: string;
  description: string;
  category: ToolCategory;
  href: string;
  icon: typeof AudioLines;
  visual: ToolVisual;
  featured?: boolean;
  badge?: string;
  keywords?: string[];
}

export const AUDIO_TOOLS: AudioTool[] = [
  {
    name: "Audio Trimmer",
    description:
      "Cut your audio precisely and keep only what you need.",
    category: "Audio",
    href: "/audiotools/trimmer",
    icon: Scissors,
    visual: "waveform",
    featured: true,
    badge: "Most used",
    keywords: [
      "trim",
      "cut",
      "crop",
      "audio",
      "mp3",
      "wav",
    ],
  },

  {
    name: "Audio Splitter",
    description:
      "Split one audio file into multiple parts.",
    category: "Audio",
    href: "/audiotools/splitter",
    icon: AudioWaveform,
    visual: "split",
    featured: true,
    keywords: [
      "split",
      "divide",
      "audio",
      "parts",
    ],
  },

  {
    name: "Audio Merger",
    description:
      "Merge multiple audio files into one seamless track.",
    category: "Audio",
    href: "/audiotools/merger",
    icon: Combine,
    visual: "merge",
    featured: true,
    keywords: [
      "merge",
      "combine",
      "join",
      "audio",
      "tracks",
    ],
  },

  {
    name: "Audio Converter",
    description:
      "Convert audio files between different formats.",
    category: "Audio",
    href: "/audiotools/converter",
    icon: FileAudio,
    visual: "convert",
    featured: true,
    keywords: [
      "convert",
      "conversion",
      "mp3",
      "wav",
      "aac",
      "flac",
      "ogg",
    ],
  },

  {
    name: "Audio Compressor",
    description:
      "Reduce file size while maintaining good quality.",
    category: "Audio",
    href: "/audiotools/compressor",
    icon: Gauge,
    visual: "bars",
    keywords: [
      "compress",
      "compression",
      "size",
      "audio",
      "quality",
    ],
  },

  {
    name: "Volume Normalizer",
    description:
      "Balance volume for a more consistent sound.",
    category: "Audio",
    href: "/audiotools/volume-normalizer",
    icon: Volume2,
    visual: "waveform",
    keywords: [
      "volume",
      "normalize",
      "loudness",
      "audio",
      "sound",
    ],
  },

  {
    name: "Fade In / Fade Out",
    description:
      "Add smooth fade effects to your audio.",
    category: "Audio",
    href: "/audiotools/fade",
    icon: Waves,
    visual: "fade",
    keywords: [
      "fade",
      "fade in",
      "fade out",
      "audio",
      "effect",
    ],
  },

  {
    name: "Speed Changer",
    description:
      "Change playback speed of your audio.",
    category: "Audio",
    href: "/audiotools/speed",
    icon: Timer,
    visual: "speed",
    keywords: [
      "speed",
      "tempo",
      "faster",
      "slower",
      "audio",
    ],
  },

  {
    name: "Pitch Changer",
    description:
      "Change the pitch without affecting the tempo.",
    category: "Audio",
    href: "/audiotools/pitch",
    icon: Music2,
    visual: "pitch",
    keywords: [
      "pitch",
      "voice",
      "tone",
      "audio",
      "music",
    ],
  },

  {
    name: "Silence Remover",
    description:
      "Remove unnecessary silent sections automatically.",
    category: "Audio",
    href: "/audiotools/silence-remover",
    icon: Sparkles,
    visual: "silence",
    keywords: [
      "silence",
      "remove",
      "pause",
      "audio",
      "voice",
    ],
  },

  {
    name: "Video to Audio",
    description:
      "Extract audio from your video files.",
    category: "Video",
    href: "/audiotools/video-to-audio",
    icon: FileVideo,
    visual: "video",
    featured: true,
    badge: "Popular",
    keywords: [
      "video",
      "audio",
      "extract",
      "mp4",
      "mp3",
    ],
  },

  {
    name: "Video Player",
    description:
      "Play and preview your video files.",
    category: "Video",
    href: "/audiotools/video-player",
    icon: FileVideo,
    visual: "player",
    keywords: [
      "video",
      "player",
      "preview",
      "play",
    ],
  },

  {
    name: "Video Converter",
    description:
      "Convert video files between different formats.",
    category: "Video",
    href: "/audiotools/video-converter",
    icon: FileVideo,
    visual: "convert",
    keywords: [
      "video",
      "convert",
      "mp4",
      "mov",
      "webm",
    ],
  },

  {
    name: "Video Trimmer",
    description:
      "Trim your video and keep the best part.",
    category: "Video",
    href: "/audiotools/video-trimmer",
    icon: Scissors,
    visual: "video",
    keywords: [
      "video",
      "trim",
      "cut",
      "crop",
    ],
  },

  {
    name: "Audio Player",
    description:
      "Play your audio with focused playback controls.",
    category: "Other",
    href: "/audiotools/audio-player",
    icon: Headphones,
    visual: "player",
    keywords: [
      "audio",
      "player",
      "play",
      "preview",
    ],
  },

  {
    name: "Waveform Viewer",
    description:
      "Visualize and analyze your audio.",
    category: "Other",
    href: "/audiotools/waveform",
    icon: AudioLines,
    visual: "waveform",
    keywords: [
      "waveform",
      "visualize",
      "analyze",
      "audio",
    ],
  },

  {
    name: "Ringtone Maker",
    description:
      "Create custom ringtones from your favorite audio.",
    category: "Other",
    href: "/audiotools/ringtone-maker",
    icon: Music2,
    visual: "ringtone",
    keywords: [
      "ringtone",
      "mobile",
      "phone",
      "audio",
      "music",
    ],
  },

  {
    name: "File Information",
    description:
      "View detailed information about your media files.",
    category: "Other",
    href: "/audiotools/file-information",
    icon: Info,
    visual: "info",
    keywords: [
      "file",
      "information",
      "metadata",
      "media",
      "details",
    ],
  },
];