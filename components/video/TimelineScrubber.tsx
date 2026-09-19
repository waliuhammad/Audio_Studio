"use client";

import {
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/*
 * The orange scrubber used under video previews (Video to Audio, Video
 * Converter, Video Trimmer): a time ruler across the top, decorative
 * waveform bars, and a start / current → total / end row underneath.
 *
 * Two ways to drive it:
 * - Pass `onSeek` and it handles the pointer itself: press or drag anywhere
 *   on the bars to scrub, and it draws the playhead.
 * - Pass `children` instead to lay your own interactive layer over the bars
 *   (the Trimmer's clip handles and playhead). The layer fills the bar area
 *   and owns the pointer; the scrubber just draws the frame around it.
 */

interface TimelineScrubberProps {
  duration: number;
  currentTime: number;
  /** Seek to a time, in seconds. Omit when `children` handles the pointer. */
  onSeek?: (time: number) => void;
  /** Called once when a drag starts, e.g. to pause playback. */
  onSeekStart?: () => void;
  /** An interactive layer drawn over the bars. */
  children?: ReactNode;
  /** A taller bar area, for layers with handles to grab. */
  tall?: boolean;
  className?: string;
}

const BAR_COUNT = 35;

/** mm:ss; hours roll into minutes, as elsewhere on the site. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const total = Math.floor(seconds + 1e-6);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Spacing between labelled ticks, chosen so there are roughly 6–10. */
function majorInterval(duration: number): number {
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

  return steps.find((step) => duration / step <= 10) ?? 3600;
}

export function TimelineScrubber({
  duration,
  currentTime,
  onSeek,
  onSeekStart,
  children,
  tall = false,
  className = "",
}: TimelineScrubberProps) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  /*
   * Ticks are placed at exact multiples of the interval (k * step), never by
   * adding the step up repeatedly: that drifted, so the 2-second tick sat at
   * 1.9999 s and was labelled "00:01" a second time.
   */
  const ticks = useMemo(() => {
    if (!(duration > 0)) return [];

    const step = majorInterval(duration);
    const list: number[] = [];

    for (let k = 0; k * step <= duration + 1e-6; k++) list.push(k * step);

    // Always label the end. It replaces the last tick when the two would be
    // crowded together or read the same (8 s and 8.5 s both say "00:08").
    const last = list[list.length - 1] ?? 0;
    const sameLabel = formatClock(last) === formatClock(duration);

    if (!sameLabel && duration - last > step * 0.4) list.push(duration);
    else list[list.length - 1] = duration;

    return list;
  }, [duration]);

  const percent =
    duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  const timeAt = (clientX: number) => {
    const area = areaRef.current;
    if (!area || !(duration > 0)) return 0;

    const rect = area.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    return ratio * duration;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onSeek || !(duration > 0)) return;

    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onSeekStart?.();
    onSeek(timeAt(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current && onSeek) onSeek(timeAt(event.clientX));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const interactive = Boolean(onSeek) && duration > 0;

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 shadow-inner sm:px-4">
        {/* Ruler */}
        <div className="pointer-events-none relative mb-1.5 h-4">
          {ticks.map((time, index) => {
            const isFirst = index === 0;
            const isLast = index === ticks.length - 1;

            return (
              <span
                key={`${time}-${index}`}
                className="absolute top-0 whitespace-nowrap text-[10px] font-semibold leading-none text-orange-500 dark:text-orange-400 sm:text-[11px]"
                style={{
                  left: `${(time / duration) * 100}%`,
                  transform: isFirst
                    ? "translateX(0)"
                    : isLast
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                }}
              >
                {formatClock(time)}
              </span>
            );
          })}
        </div>

        {/* Bars, with the playhead or the caller's layer on top */}
        <div
          ref={areaRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative touch-none select-none ${tall ? "h-12" : ""} ${
            interactive ? "cursor-pointer" : ""
          }`}
        >
          <div
            className={`relative z-0 flex items-center justify-between gap-1 ${
              tall ? "h-full" : "py-0.5"
            }`}
          >
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div
                key={i}
                className="w-1 shrink-0 rounded-full bg-orange-500"
                style={{ height: `${((i * 7) % 5) * 3 + 8}px` }}
              />
            ))}
          </div>

          {!children && interactive && (
            <div
              className="pointer-events-none absolute -bottom-2 -top-2 z-10 w-0.5 -translate-x-1/2 bg-orange-600"
              style={{
                left: `${percent}%`,
                boxShadow: "0 0 8px rgba(234, 88, 12, 0.45)",
              }}
            />
          )}

          {children && <div className="absolute inset-0 z-10">{children}</div>}
        </div>
      </div>

      {/* Start / current → total / end */}
      <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 sm:text-xs">
        <span>{formatClock(0)}</span>
        <span className="font-medium text-muted-foreground">
          {formatClock(currentTime)} <span className="mx-1">→</span> {formatClock(duration)}
        </span>
        <span>{formatClock(duration)}</span>
      </div>
    </div>
  );
}
