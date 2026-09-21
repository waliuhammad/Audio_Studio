"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * A video with the round orange play button centred on it, as in Video
 * Trimmer. Tapping the video or the button toggles playback; while playing the
 * button fades out and comes back (as Pause) on hover.
 *
 * The page owns `src` (normally an object URL) and revokes it. Give the
 * component a `key` per clip if you swap clips and want playback to restart.
 */
export interface VideoPreviewProps {
  src: string;
  className?: string;
}

export function VideoPreview({ src, className = "" }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // A new source starts paused.
  useEffect(() => {
    setIsPlaying(false);
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  };

  return (
    <div
      className={`group relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 shadow-md dark:bg-stone-950 ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="h-full w-full cursor-pointer object-contain"
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-black/30 transition-all duration-200 hover:scale-105 hover:bg-orange-600 focus-visible:opacity-100 ${
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" fill="currentColor" />
        ) : (
          <Play className="ml-1 h-6 w-6" fill="currentColor" />
        )}
      </button>
    </div>
  );
}
