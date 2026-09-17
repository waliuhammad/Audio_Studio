"use client";

/**
 * ClipTimeline — a single track of clips laid end to end, with a playhead.
 *
 * Generic on purpose: it knows nothing about video files, uploads or the API.
 * The owner keeps the sequence and passes it in; every edit comes back out as a
 * callback, so the same component can drive the Video Mixture today and the
 * Audio Video Merger (or anything else that sequences clips) later.
 *
 * Props
 * -----
 * clips           TimelineClip[] in sequence order. Each is a window
 *                 [start, end) into a source that is `min`..`max` long (min is
 *                 usually 0, max the source's duration), plus a `label` and a
 *                 CSS `color` (hex, "#rrggbb") for the block.
 * playhead        Current sequence time, seconds.
 * selectedId      The highlighted clip, or null.
 * onSelect(id)    A clip was clicked (pressed and released without dragging).
 * onSeek(time)    The playhead should move: a click on a clip, the track or the
 *                 ruler, or a drag of the playhead knob. Sequence seconds.
 * onTrim(id, start, end, edge)
 *                 A trim handle moved. `edge` says which side, so the owner can
 *                 preview the frame at that edge. Fired continuously while
 *                 dragging, and for arrow keys on a focused handle.
 * onTrimEnd(id)   The trim drag finished (optional).
 * onReorder(from, to)
 *                 A clip was dragged to a new place. `to` is its index in the
 *                 resulting list — i.e. apply moveItem(clips, from, to).
 * onScrubChange(active)
 *                 The playhead started / stopped being dragged (optional), so
 *                 the owner can pause playback meanwhile.
 * minClipLength   Shortest length a trim may leave, seconds. Default 0.1.
 * disabled        Show the track but ignore input.
 * emptyMessage    Text for an empty sequence.
 * formatTime(s)   Label formatter. Default m:ss.s.
 * className       Extra classes for the outer wrapper.
 *
 * Interaction: drag a block's left/right handle to trim it (the rest of the
 * sequence ripples when you let go of a left handle); drag a block's body to
 * move it — the other blocks slide aside and an orange line marks where it
 * will land; press the track or ruler to move the playhead, or drag its knob.
 * Pointer Events with pointer capture, so mouse, pen and touch all work. The
 * track scrolls sideways inside its own box and has a zoom slider.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
    clipLength,
    clipOffsets,
    formatClock,
    moveItem,
    sequenceLength,
    type SequenceClip,
} from "./sequence";

export interface TimelineClip extends SequenceClip {
    label: string;
    color: string;
    /** Earliest allowed in-point (normally 0). */
    min: number;
    /** Latest allowed out-point (normally the source duration). */
    max: number;
}

export interface ClipTimelineProps {
    clips: readonly TimelineClip[];
    playhead: number;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onSeek: (time: number) => void;
    onTrim: (id: string, start: number, end: number, edge: "start" | "end") => void;
    onTrimEnd?: (id: string) => void;
    onReorder: (from: number, to: number) => void;
    onScrubChange?: (active: boolean) => void;
    minClipLength?: number;
    disabled?: boolean;
    emptyMessage?: string;
    formatTime?: (seconds: number) => string;
    className?: string;
}

type Drag =
    | {
          kind: "trim";
          id: string;
          edge: "start" | "end";
          startX: number;
          origStart: number;
          origEnd: number;
      }
    | {
          kind: "move";
          id: string;
          from: number;
          startX: number;
          grabOffset: number;
          moved: boolean;
          left: number;
          to: number;
      }
    | { kind: "playhead" };

/** Horizontal breathing room so the outer handles can be grabbed. */
const PAD = 14;
const MAX_ZOOM = 12;
const NICE_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

const clamp = (value: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, value));

/** "#rrggbb" plus a two-digit alpha. */
const tint = (color: string, alpha: number) =>
    `${color}${Math.round(clamp(alpha, 0, 1) * 255)
        .toString(16)
        .padStart(2, "0")}`;

export function ClipTimeline({
    clips,
    playhead,
    selectedId,
    onSelect,
    onSeek,
    onTrim,
    onTrimEnd,
    onReorder,
    onScrubChange,
    minClipLength = 0.1,
    disabled = false,
    emptyMessage = "No clips in the sequence yet.",
    formatTime = formatClock,
    className = "",
}: ClipTimelineProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [viewWidth, setViewWidth] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [drag, setDrag] = useState<Drag | null>(null);
    const dragRef = useRef<Drag | null>(null);

    const updateDrag = (next: Drag | null) => {
        dragRef.current = next;
        setDrag(next);
    };

    useEffect(() => {
        const node = viewportRef.current;

        if (!node) return;

        const observer = new ResizeObserver(() => setViewWidth(node.clientWidth));

        observer.observe(node);
        setViewWidth(node.clientWidth);

        return () => observer.disconnect();
    }, []);

    const total = sequenceLength(clips);
    const span = Math.max(total, 1);
    const pps = viewWidth > 0 ? ((viewWidth - PAD * 2) / span) * zoom : 0;
    const contentWidth = viewWidth > 0 ? span * pps + PAD * 2 : 0;
    const xOf = useCallback((time: number) => PAD + time * pps, [pps]);

    const contentX = (clientX: number) => {
        const rect = contentRef.current?.getBoundingClientRect();

        return rect ? clientX - rect.left : 0;
    };

    const timeAt = (clientX: number) =>
        pps > 0 ? clamp((contentX(clientX) - PAD) / pps, 0, total) : 0;

    /* ---------------- layout ---------------- */

    const layout = useMemo(() => {
        let order: readonly TimelineClip[] = clips;
        let dragIndex = -1;
        let shift = 0;

        if (drag?.kind === "move" && drag.moved) {
            order = moveItem(clips, drag.from, drag.to);
        }

        if (drag?.kind === "trim" && drag.edge === "start") {
            dragIndex = clips.findIndex((clip) => clip.id === drag.id);

            const trimmed = clips[dragIndex];

            if (trimmed) shift = (trimmed.start - drag.origStart) * pps;
        }

        const offsets = clipOffsets(order);
        const lefts = new Map<string, number>();

        order.forEach((clip, index) => {
            const originalIndex =
                order === clips ? index : clips.findIndex((c) => c.id === clip.id);

            lefts.set(
                clip.id,
                PAD +
                    (offsets[index] ?? 0) * pps +
                    (dragIndex >= 0 && originalIndex >= dragIndex ? shift : 0)
            );
        });

        return lefts;
    }, [clips, drag, pps]);

    /* ---------------- ruler ---------------- */

    const ticks = useMemo(() => {
        if (pps <= 0) return [];

        const step = NICE_STEPS.find((s) => s * pps >= 64) ?? 3600;
        const marks: number[] = [];

        for (let t = 0; t <= span + 1e-6; t += step) marks.push(t);

        return marks;
    }, [pps, span]);

    /* ---------------- keep the playhead in view ---------------- */

    useEffect(() => {
        const node = viewportRef.current;

        if (!node || dragRef.current || pps <= 0) return;

        const x = xOf(playhead);

        if (x < node.scrollLeft + 8 || x > node.scrollLeft + node.clientWidth - 8) {
            node.scrollLeft = Math.max(0, x - 40);
        }
    }, [playhead, pps, xOf]);

    /* ---------------- pointer handling ---------------- */

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || pps <= 0 || event.button > 0) return;

        const target = event.target as HTMLElement;
        const edgeEl = target.closest<HTMLElement>("[data-edge]");
        const clipEl = target.closest<HTMLElement>("[data-clip]");
        const onPlayhead = target.closest("[data-playhead]");

        event.currentTarget.setPointerCapture(event.pointerId);

        if (edgeEl && clipEl) {
            const clip = clips.find((c) => c.id === clipEl.dataset.clip);

            if (!clip) return;

            updateDrag({
                kind: "trim",
                id: clip.id,
                edge: edgeEl.dataset.edge as "start" | "end",
                startX: event.clientX,
                origStart: clip.start,
                origEnd: clip.end,
            });
            onSelect(clip.id);
            return;
        }

        if (clipEl && !onPlayhead) {
            const from = clips.findIndex((c) => c.id === clipEl.dataset.clip);
            const pressed = clips[from];

            if (!pressed) return;

            const left = layout.get(pressed.id) ?? 0;

            updateDrag({
                kind: "move",
                id: pressed.id,
                from,
                startX: event.clientX,
                grabOffset: contentX(event.clientX) - left,
                moved: false,
                left,
                to: from,
            });
            return;
        }

        // Knob, ruler or empty track: move the playhead and keep following.
        updateDrag({ kind: "playhead" });
        onScrubChange?.(true);
        onSeek(timeAt(event.clientX));
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const current = dragRef.current;

        if (!current) return;

        if (current.kind === "playhead") {
            onSeek(timeAt(event.clientX));
            return;
        }

        if (current.kind === "trim") {
            const clip = clips.find((c) => c.id === current.id);

            if (!clip) return;

            const delta = (event.clientX - current.startX) / pps;

            if (current.edge === "start") {
                const start = clamp(
                    current.origStart + delta,
                    clip.min,
                    current.origEnd - minClipLength
                );

                onTrim(clip.id, start, current.origEnd, "start");
            } else {
                const end = clamp(
                    current.origEnd + delta,
                    current.origStart + minClipLength,
                    clip.max
                );

                onTrim(clip.id, current.origStart, end, "end");
            }
            return;
        }

        // Moving a clip.
        const moved = current.moved || Math.abs(event.clientX - current.startX) > 4;

        if (!moved) return;

        const dragged = clips[current.from];

        if (!dragged) return;

        const width = clipLength(dragged) * pps;
        const left = contentX(event.clientX) - current.grabOffset;
        const center = (left + width / 2 - PAD) / pps;
        const others = clips.filter((_, index) => index !== current.from);
        const otherOffsets = clipOffsets(others);
        const to = others.reduce(
            (count, clip, index) =>
                (otherOffsets[index] ?? 0) + clipLength(clip) / 2 < center ? count + 1 : count,
            0
        );

        updateDrag({ ...current, moved: true, left, to });
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const current = dragRef.current;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        updateDrag(null);

        if (!current) return;

        if (current.kind === "playhead") {
            onScrubChange?.(false);
        } else if (current.kind === "trim") {
            onTrimEnd?.(current.id);
        } else if (current.moved) {
            if (current.to !== current.from) onReorder(current.from, current.to);
            onSelect(current.id);
        } else if (event.type === "pointerup") {
            // A plain click: select the clip and put the playhead where it was pressed.
            onSelect(current.id);
            onSeek(timeAt(event.clientX));
        }
    };

    const handleEdgeKey = (
        event: React.KeyboardEvent<HTMLElement>,
        clip: TimelineClip,
        edge: "start" | "end"
    ) => {
        if (disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;

        event.preventDefault();
        event.stopPropagation();

        const step = (event.shiftKey ? 1 : 0.1) * (event.key === "ArrowLeft" ? -1 : 1);

        if (edge === "start") {
            onTrim(
                clip.id,
                clamp(clip.start + step, clip.min, clip.end - minClipLength),
                clip.end,
                "start"
            );
        } else {
            onTrim(
                clip.id,
                clip.start,
                clamp(clip.end + step, clip.start + minClipLength, clip.max),
                "end"
            );
        }
    };

    /* ---------------- render ---------------- */

    const moving = drag?.kind === "move" && drag.moved ? drag : null;
    const insertionX = moving
        ? (() => {
              const order = moveItem(clips, moving.from, moving.to);
              return xOf(clipOffsets(order)[moving.to] ?? 0);
          })()
        : null;

    const cursor =
        drag?.kind === "move" && drag.moved
            ? "cursor-grabbing"
            : drag?.kind === "trim"
              ? "cursor-ew-resize"
              : drag?.kind === "playhead"
                ? "cursor-grabbing"
                : "cursor-pointer";

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                <span className="truncate">
                    {clips.length} {clips.length === 1 ? "clip" : "clips"} ·{" "}
                    <strong className="font-semibold text-foreground">
                        {formatTime(total)}
                    </strong>
                </span>

                <label className="flex shrink-0 items-center gap-1.5">
                    <span className="sr-only">Timeline zoom</span>
                    <ZoomOut className="h-3.5 w-3.5" aria-hidden />
                    <input
                        type="range"
                        min={1}
                        max={MAX_ZOOM}
                        step={0.5}
                        value={zoom}
                        disabled={disabled || clips.length === 0}
                        onChange={(event) => setZoom(Number(event.target.value))}
                        className="h-1.5 w-20 cursor-pointer accent-orange-500 sm:w-28"
                    />
                    <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                </label>
            </div>

            <div
                ref={viewportRef}
                className="overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-muted/40 dark:bg-stone-950/60"
            >
                {clips.length === 0 ? (
                    <div className="flex h-[108px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </div>
                ) : (
                    <div
                        ref={contentRef}
                        data-timeline
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`relative h-[108px] touch-none select-none ${cursor} ${
                            disabled ? "pointer-events-none opacity-60" : ""
                        }`}
                        style={{ width: contentWidth || "100%" }}
                    >
                        {/* Track lane */}
                        <div className="absolute inset-x-0 top-3 h-16 bg-foreground/[0.03]" />

                        {clips.map((clip, index) => {
                            const width = clipLength(clip) * pps;
                            const isDragged = drag?.kind === "move" && drag.moved && drag.id === clip.id;
                            const left = isDragged && moving ? moving.left : layout.get(clip.id) ?? 0;
                            const selected = clip.id === selectedId;
                            const trimming = drag?.kind === "trim" && drag.id === clip.id;
                            const roomy = width >= 56;

                            return (
                                <div
                                    key={clip.id}
                                    data-clip={clip.id}
                                    role="button"
                                    tabIndex={disabled ? -1 : 0}
                                    aria-pressed={selected}
                                    aria-label={`Clip ${index + 1}: ${clip.label}, ${formatTime(clipLength(clip))}`}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            onSelect(clip.id);
                                            onSeek(clipOffsets(clips)[index] ?? 0);
                                        }
                                    }}
                                    className={`absolute top-3 h-16 overflow-visible rounded-lg border-2 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                                        isDragged
                                            ? "z-30 cursor-grabbing opacity-90 shadow-xl"
                                            : trimming
                                              ? "z-20"
                                              : "z-10"
                                    } ${moving && !isDragged ? "transition-[left] duration-150" : ""}`}
                                    style={{
                                        left,
                                        width: Math.max(width, 2),
                                        background: tint(clip.color, selected ? 0.42 : 0.26),
                                        borderColor: selected ? "#f97316" : tint(clip.color, 0.85),
                                        boxShadow: selected
                                            ? "0 0 0 2px rgba(249,115,22,0.35)"
                                            : undefined,
                                    }}
                                >
                                    <div className="pointer-events-none absolute inset-y-0 left-2.5 right-2.5 flex flex-col justify-center overflow-hidden">
                                        {roomy && (
                                            <>
                                                <span className="truncate text-[11px] font-semibold leading-tight text-foreground">
                                                    {clip.label}
                                                </span>
                                                <span className="truncate text-[10px] leading-tight text-muted-foreground">
                                                    {formatTime(clipLength(clip))}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {(["start", "end"] as const).map((edge) => (
                                        <div
                                            key={edge}
                                            data-edge={edge}
                                            role="slider"
                                            tabIndex={disabled ? -1 : 0}
                                            aria-label={`${edge === "start" ? "Start" : "End"} of clip ${index + 1}`}
                                            aria-valuemin={edge === "start" ? clip.min : clip.start + minClipLength}
                                            aria-valuemax={edge === "start" ? clip.end - minClipLength : clip.max}
                                            aria-valuenow={Number((edge === "start" ? clip.start : clip.end).toFixed(2))}
                                            onKeyDown={(event) => handleEdgeKey(event, clip, edge)}
                                            onKeyUp={() => onTrimEnd?.(clip.id)}
                                            className={`absolute -inset-y-0.5 z-10 flex w-3 cursor-ew-resize touch-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                                                edge === "start"
                                                    ? "-left-1 rounded-l-md"
                                                    : "-right-1 rounded-r-md"
                                            }`}
                                            style={{ background: selected ? "#f97316" : clip.color }}
                                        >
                                            <span className="pointer-events-none h-5 w-0.5 rounded-full bg-white/85" />
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {insertionX !== null && (
                            <div
                                className="pointer-events-none absolute top-1 z-40 h-20 w-1 -translate-x-1/2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                                style={{ left: insertionX }}
                            />
                        )}

                        {/* Ruler */}
                        <div className="absolute inset-x-0 bottom-0 h-7 border-t border-border/70">
                            {ticks.map((t) => (
                                <div
                                    key={t}
                                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                                    style={{ left: xOf(t) }}
                                >
                                    <div className="h-1.5 w-px bg-muted-foreground/50" />
                                    <span className="mt-0.5 whitespace-nowrap text-[9px] text-muted-foreground">
                                        {formatTime(t)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Playhead */}
                        <div
                            data-playhead
                            className="absolute bottom-0 top-0 z-40 flex w-5 -translate-x-1/2 cursor-grab justify-center active:cursor-grabbing"
                            style={{ left: xOf(clamp(playhead, 0, total)) }}
                        >
                            <span className="pointer-events-none absolute top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-orange-600 shadow" />
                            <span className="pointer-events-none mt-2 h-[calc(100%-1.75rem)] w-0.5 bg-orange-500 shadow-[0_0_4px_rgba(0,0,0,0.45)]" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
