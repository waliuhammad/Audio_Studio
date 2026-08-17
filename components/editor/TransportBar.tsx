"use client";

import {
    Pause,
    Play,
    Repeat,
    Scissors,
    SkipBack,
    SkipForward,
    Square,
    Volume1,
    Volume2,
    VolumeX,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { formatTime, type TimeRange } from "@/lib/audio/audio-utils";
import type { AudioEngine } from "./useAudioEngine";

interface TransportBarProps {
    engine: AudioEngine;
    selection: TimeRange | null;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    onClearSelection: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 40;

const iconButtonClass = `
  flex
  h-10
  w-10
  shrink-0
  items-center
  justify-center
  rounded-full
  border
  border-paper-border
  text-graphite-muted
  transition-all
  duration-200
  hover:border-amber/50
  hover:text-amber
  disabled:cursor-not-allowed
  disabled:opacity-40
  disabled:hover:border-paper-border
  disabled:hover:text-graphite-muted
  dark:border-ink-border
  dark:text-mist-muted
  dark:disabled:hover:border-ink-border
  dark:disabled:hover:text-mist-muted
`;

export function TransportBar({
    engine,
    selection,
    zoom,
    onZoomChange,
    onClearSelection,
}: TransportBarProps) {
    const {
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isLooping,
        toggle,
        stop,
        seek,
        setVolume,
        toggleMute,
        toggleLoop,
    } = engine;

    const selectionLength = selection
        ? Math.abs(selection.end - selection.start)
        : 0;

    const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div
            className="
        flex
        flex-wrap
        items-center
        gap-x-4
        gap-y-3
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        px-3.5
        py-3
        dark:border-ink-border
        dark:bg-ink-surface
      "
        >
            {/* Transport controls */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => seek(0)}
                    className={iconButtonClass}
                    aria-label="Jump to start"
                >
                    <SkipBack className="h-4 w-4" strokeWidth={1.8} />
                </button>

                <button
                    type="button"
                    onClick={toggle}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            border-amber/40
            bg-amber
            text-ink
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-[0_6px_20px_rgba(245,158,11,0.28)]
            active:translate-y-0
            active:scale-[0.97]
          "
                >
                    {isPlaying ? (
                        <Pause className="h-5 w-5" strokeWidth={2} />
                    ) : (
                        <Play className="ml-0.5 h-5 w-5" strokeWidth={2} />
                    )}
                </button>

                <button
                    type="button"
                    onClick={stop}
                    className={iconButtonClass}
                    aria-label="Stop"
                >
                    <Square className="h-3.5 w-3.5" strokeWidth={2} />
                </button>

                <button
                    type="button"
                    onClick={() => seek(duration)}
                    className={iconButtonClass}
                    aria-label="Jump to end"
                >
                    <SkipForward className="h-4 w-4" strokeWidth={1.8} />
                </button>

                <button
                    type="button"
                    onClick={toggleLoop}
                    aria-pressed={isLooping}
                    aria-label="Toggle loop"
                    className={`${iconButtonClass} ${isLooping ? "border-amber/60 bg-amber/10 text-amber" : ""
                        }`}
                >
                    <Repeat className="h-4 w-4" strokeWidth={1.8} />
                </button>
            </div>

            {/* Time readout */}
            <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-lg font-medium tabular-nums text-graphite dark:text-mist">
                    {formatTime(currentTime, true)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-graphite-faint dark:text-mist-faint">
                    / {formatTime(duration)}
                </span>
            </div>

            {/* Selection readout */}
            {selection && selectionLength > 0.001 && (
                <div
                    className="
            flex
            items-center
            gap-2
            rounded-full
            border
            border-amber/30
            bg-amber/[0.07]
            py-1
            pl-3
            pr-1.5
          "
                >
                    <Scissors className="h-3.5 w-3.5 shrink-0 text-amber" strokeWidth={1.8} />

                    <span className="font-mono text-[10px] tabular-nums text-amber">
                        {formatTime(Math.min(selection.start, selection.end), true)} →{" "}
                        {formatTime(Math.max(selection.start, selection.end), true)}
                    </span>

                    <span className="font-mono text-[10px] tabular-nums text-graphite-muted dark:text-mist-muted">
                        ({selectionLength.toFixed(2)}s)
                    </span>

                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="
              rounded-full
              px-2
              py-0.5
              font-mono
              text-[9px]
              uppercase
              tracking-[0.14em]
              text-graphite-muted
              transition-colors
              duration-200
              hover:text-amber
              dark:text-mist-muted
            "
                    >
                        Clear
                    </button>
                </div>
            )}

            <div className="ml-auto flex items-center gap-4">
                {/* Zoom */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom / 1.6))}
                        disabled={zoom <= MIN_ZOOM}
                        className={iconButtonClass}
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" strokeWidth={1.8} />
                    </button>

                    <button
                        type="button"
                        onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom * 1.6))}
                        disabled={zoom >= MAX_ZOOM}
                        className={iconButtonClass}
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleMute}
                        className={iconButtonClass}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        <VolumeIcon className="h-4 w-4" strokeWidth={1.8} />
                    </button>

                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(event) => setVolume(Number(event.target.value))}
                        aria-label="Volume"
                        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-paper-border accent-amber dark:bg-ink-border"
                    />
                </div>
            </div>
        </div>
    );
}