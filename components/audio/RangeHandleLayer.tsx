"use client";

import { useCallback, useRef } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type DragTarget = "start" | "end" | "seek" | null;

interface RangeHandleLayerProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime?: number;
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
  onSeek?: (time: number) => void;
  className?: string;
}

export function RangeHandleLayer({
  duration,
  startTime,
  endTime,
  currentTime = 0,
  onStartChange,
  onEndChange,
  onSeek,
  className = "",
}: RangeHandleLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<DragTarget>(null);

  const timeFromPointer = useCallback(
    (clientX: number) => {
      const layer = layerRef.current;
      if (!layer || duration <= 0) return null;

      const rect = layer.getBoundingClientRect();
      if (rect.width <= 0) return null;

      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return ratio * duration;
    },
    [duration]
  );

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const time = timeFromPointer(clientX);
      const target = dragTargetRef.current;
      if (time === null || !target) return;

      if (target === "start") {
        onStartChange(clamp(time, 0, Math.max(0, endTime - 0.1)));
      } else if (target === "end") {
        onEndChange(clamp(time, Math.min(duration, startTime + 0.1), duration));
      } else if (target === "seek") {
        onSeek?.(time);
      }
    },
    [duration, endTime, onEndChange, onSeek, onStartChange, startTime, timeFromPointer]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    const time = timeFromPointer(event.clientX);
    if (time === null) return;

    const threshold = Math.max(duration * 0.025, 0.15);
    const startDistance = Math.abs(time - startTime);
    const endDistance = Math.abs(time - endTime);

    if (Math.min(startDistance, endDistance) <= threshold) {
      dragTargetRef.current = startDistance <= endDistance ? "start" : "end";
    } else {
      dragTargetRef.current = "seek";
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
    updateFromPointer(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !dragTargetRef.current ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateFromPointer(event.clientX);
  };

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragTargetRef.current = null;
  };

  const startPercent = duration > 0 ? clamp((startTime / duration) * 100, 0, 100) : 0;
  const endPercent = duration > 0 ? clamp((endTime / duration) * 100, 0, 100) : 100;
  const playheadPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;

  return (
    <div
      ref={layerRef}
      className={`absolute inset-0 z-20 touch-none select-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      aria-label="Timeline. Drag the start or end handle to change the selected range."
    >
      <div
        className="pointer-events-none absolute inset-y-0 border-x-2 border-orange-500 bg-orange-500/15"
        style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }}
      />

      <div
        className="pointer-events-none absolute inset-y-[-3px] w-3 -translate-x-1/2 rounded-full bg-orange-500 shadow-sm"
        style={{ left: `${startPercent}%` }}
      >
        <div className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
      </div>

      <div
        className="pointer-events-none absolute inset-y-[-3px] w-3 -translate-x-1/2 rounded-full bg-orange-500 shadow-sm"
        style={{ left: `${endPercent}%` }}
      >
        <div className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
      </div>

      <div
        className="pointer-events-none absolute inset-y-[-8px] z-30 w-[2px] rounded-full bg-orange-500"
        style={{ left: `${playheadPercent}%` }}
      >
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500" />
      </div>
    </div>
  );
}
