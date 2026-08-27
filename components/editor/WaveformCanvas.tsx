"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
    clamp,
    computePeaks,
    formatTime,
    type TimeRange,
} from "@/lib/audio/audio-utils";

const RULER_HEIGHT = 28;
const WAVE_HEIGHT = 208;
const TOTAL_HEIGHT = RULER_HEIGHT + WAVE_HEIGHT;
const CLICK_THRESHOLD_PX = 4;

interface WaveformCanvasProps {
    buffer: AudioBuffer;
    currentTime: number;
    isPlaying: boolean;
    selection: TimeRange | null;
    zoom: number;
    onSeek: (time: number) => void;
    onSelectionChange?: (selection: TimeRange | null) => void;
    interactionMode?: "selection" | "seek";
    markers?: Array<{ id: string | number; time: number; label?: string }>;
    onMarkerChange?: (index: number, time: number) => void;
    compact?: boolean;
}

interface Palette {
    ruler: string;
    rulerText: string;
    grid: string;
    waveTop: string;
    waveBottom: string;
    waveMuted: string;
    centerLine: string;
    selectionFill: string;
    selectionEdge: string;
    playhead: string;
}

const DARK_PALETTE: Palette = {
    ruler: "#0F1420",
    rulerText: "#5B6478",
    grid: "#242B3D",
    waveTop: "#F2A65A",
    waveBottom: "#E0863A",
    waveMuted: "#3A4256",
    centerLine: "#242B3D",
    selectionFill: "rgba(242, 166, 90, 0.14)",
    selectionEdge: "rgba(242, 166, 90, 0.75)",
    playhead: "#F2A65A",
};

const LIGHT_PALETTE: Palette = {
    ruler: "#F7F5F0",
    rulerText: "#8C90A0",
    grid: "#E4E1D8",
    waveTop: "#E0863A",
    waveBottom: "#C56F2C",
    waveMuted: "#D8D3C6",
    centerLine: "#E4E1D8",
    selectionFill: "rgba(242, 166, 90, 0.18)",
    selectionEdge: "rgba(224, 134, 58, 0.8)",
    playhead: "#E0863A",
};

/** Pick a ruler tick interval that keeps labels readable at any zoom. */
function chooseTickInterval(pixelsPerSecond: number): number {
    const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const minimumSpacing = 68;

    for (const candidate of candidates) {
        if (candidate * pixelsPerSecond >= minimumSpacing) {
            return candidate;
        }
    }

    return candidates[candidates.length - 1] ?? 600;
}

export function WaveformCanvas({
    buffer,
    currentTime,
    isPlaying,
    selection,
    zoom,
    onSeek,
    onSelectionChange,
    interactionMode = "selection",
    markers = [],
    onMarkerChange,
    compact = false,
}: WaveformCanvasProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [viewportWidth, setViewportWidth] = useState(0);
    const dragAnchorRef = useRef<{ time: number; x: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [edgeDrag, setEdgeDrag] = useState<"start" | "end" | null>(null);
    const MIN_SELECTION_SECONDS = 0.02;

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const palette = useMemo<Palette>(
        () => (mounted && resolvedTheme === "light" ? LIGHT_PALETTE : DARK_PALETTE),
        [mounted, resolvedTheme]
    );

    const duration = buffer.duration;
    const contentWidth = Math.max(1, Math.round(viewportWidth * zoom));

    // Track the container width so the canvas can fill it at zoom = 1.
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setViewportWidth(entry.contentRect.width);
        });

        observer.observe(element);
        setViewportWidth(element.clientWidth);

        return () => observer.disconnect();
    }, []);

    // One peak per CSS pixel — recomputed only when the buffer or width changes.
    const peaks = useMemo(
        () => computePeaks(buffer, contentWidth),
        [buffer, contentWidth]
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || contentWidth <= 1) return;

        const rulerHeight = compact ? 0 : RULER_HEIGHT;
        const waveHeight = compact ? 160 : WAVE_HEIGHT;
        const totalHeight = rulerHeight + waveHeight;

        const context = canvas.getContext("2d");
        if (!context) return;

        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(contentWidth * ratio);
        canvas.height = Math.floor(totalHeight * ratio);
        canvas.style.width = `${contentWidth}px`;
        canvas.style.height = `${totalHeight}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, contentWidth, totalHeight);

        const pixelsPerSecond = duration > 0 ? contentWidth / duration : 0;

        // ---- Ruler band -------------------------------------------------------
        if (!compact) {
            context.fillStyle = palette.ruler;
            context.fillRect(0, 0, contentWidth, rulerHeight);

            context.strokeStyle = palette.grid;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(0, rulerHeight + 0.5);
            context.lineTo(contentWidth, rulerHeight + 0.5);
            context.stroke();
        }

        if (!compact && pixelsPerSecond > 0) {
            const interval = chooseTickInterval(pixelsPerSecond);
            const showMilliseconds = interval < 1;

            context.fillStyle = palette.rulerText;
            context.font =
                '500 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
            context.textBaseline = "middle";

            for (let time = 0; time <= duration + 0.0001; time += interval) {
                const x = Math.round(time * pixelsPerSecond) + 0.5;

                context.strokeStyle = palette.grid;
                context.beginPath();
                context.moveTo(x, RULER_HEIGHT - 7);
                context.lineTo(x, RULER_HEIGHT);
                context.stroke();

                // Faint vertical grid line down through the waveform.
                context.strokeStyle = palette.grid;
                context.globalAlpha = 0.45;
                context.beginPath();
                context.moveTo(x, RULER_HEIGHT);
                context.lineTo(x, TOTAL_HEIGHT);
                context.stroke();
                context.globalAlpha = 1;

                if (x + 42 < contentWidth) {
                    context.fillStyle = palette.rulerText;
                    context.fillText(
                        formatTime(time, showMilliseconds),
                        x + 5,
                        RULER_HEIGHT / 2
                    );
                }
            }
        }

        // ---- Waveform ---------------------------------------------------------
        const centerY = compact ? 66 : rulerHeight + waveHeight / 2;
        const halfHeight = compact ? 42 : (waveHeight / 2) * 0.88;

        const selectionStart = selection
            ? Math.min(selection.start, selection.end)
            : null;
        const selectionEnd = selection
            ? Math.max(selection.start, selection.end)
            : null;

        for (let x = 0; x < peaks.length; x += 1) {
            const peak = peaks[x];
            if (!peak) continue;

            const time = pixelsPerSecond > 0 ? x / pixelsPerSecond : 0;

            const insideSelection =
                selectionStart !== null &&
                selectionEnd !== null &&
                time >= selectionStart &&
                time <= selectionEnd;

            const dimmed =
                selectionStart !== null && selectionEnd !== null && !insideSelection;

            const top = centerY - peak.max * halfHeight;
            const bottom = centerY - peak.min * halfHeight;

            context.fillStyle = dimmed
                ? palette.waveMuted
                : peak.max >= Math.abs(peak.min)
                    ? palette.waveTop
                    : palette.waveBottom;

            context.fillRect(x, top, 1, Math.max(1, bottom - top));
        }

        // Center reference line
        context.strokeStyle = palette.centerLine;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, centerY + 0.5);
        context.lineTo(contentWidth, centerY + 0.5);
        context.stroke();

        // ---- Selection overlay ------------------------------------------------
        if (selectionStart !== null && selectionEnd !== null && pixelsPerSecond > 0) {
            const startX = selectionStart * pixelsPerSecond;
            const endX = selectionEnd * pixelsPerSecond;

            context.fillStyle = palette.selectionFill;
            context.fillRect(startX, rulerHeight, Math.max(1, endX - startX), waveHeight);

            context.strokeStyle = palette.selectionEdge;
            context.lineWidth = 1.5;

            for (const edgeX of [startX, endX]) {
                context.beginPath();
                context.moveTo(edgeX, rulerHeight);
                context.lineTo(edgeX, totalHeight);
                context.stroke();
            }
        }

        // ---- Playhead ---------------------------------------------------------
        if (pixelsPerSecond > 0) {
            const playheadX = Math.round(currentTime * pixelsPerSecond) + 0.5;

            context.strokeStyle = palette.playhead;
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(playheadX, 0);
            context.lineTo(playheadX, totalHeight);
            context.stroke();

            context.fillStyle = palette.playhead;
            context.beginPath();
            context.moveTo(playheadX - 5, 0);
            context.lineTo(playheadX + 5, 0);
            context.lineTo(playheadX, 8);
            context.closePath();
            context.fill();
        }
    }, [compact, contentWidth, currentTime, duration, palette, peaks, selection]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Keep the playhead in view while playing at high zoom levels.
    useEffect(() => {
        if (!isPlaying || zoom <= 1) return;

        const element = scrollRef.current;
        if (!element || duration <= 0) return;

        const playheadX = (currentTime / duration) * contentWidth;
        const left = element.scrollLeft;
        const right = left + element.clientWidth;

        if (playheadX < left + 40 || playheadX > right - 80) {
            element.scrollLeft = Math.max(0, playheadX - element.clientWidth / 2);
        }
    }, [contentWidth, currentTime, duration, isPlaying, zoom]);

    const timeFromEvent = useCallback(
        (clientX: number): number => {
            const canvas = canvasRef.current;
            if (!canvas || duration <= 0) return 0;

            const rect = canvas.getBoundingClientRect();
            const ratio = (clientX - rect.left) / rect.width;

            return clamp(ratio * duration, 0, duration);
        },
        [duration]
    );

    // Precise drag for an existing selection's start/end edge handle.
    const handleEdgePointerDown = useCallback(
        (edge: "start" | "end") =>
            (event: React.PointerEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setEdgeDrag(edge);
            },
        []
    );

    const handleEdgePointerMove = useCallback(
        (edge: "start" | "end") =>
            (event: React.PointerEvent<HTMLButtonElement>) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                event.preventDefault();
                event.stopPropagation();
                if (!selection) return;

                const time = timeFromEvent(event.clientX);
                const start = Math.min(selection.start, selection.end);
                const end = Math.max(selection.start, selection.end);

                if (edge === "start") {
                    onSelectionChange?.({
                        start: clamp(time, 0, end - MIN_SELECTION_SECONDS),
                        end,
                    });
                } else {
                    onSelectionChange?.({
                        start,
                        end: clamp(time, start + MIN_SELECTION_SECONDS, duration),
                    });
                }
            },
        [duration, onSelectionChange, selection, timeFromEvent]
    );

    const handleEdgePointerUp = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setEdgeDrag(null);
        },
        []
    );

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            event.currentTarget.setPointerCapture(event.pointerId);

            dragAnchorRef.current = {
                time: timeFromEvent(event.clientX),
                x: event.clientX,
            };
            setIsDragging(true);
        },
        [timeFromEvent]
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const anchor = dragAnchorRef.current;
            if (!anchor) return;

            if (Math.abs(event.clientX - anchor.x) < CLICK_THRESHOLD_PX) return;

            if (interactionMode === "selection") {
                onSelectionChange?.({
                    start: anchor.time,
                    end: timeFromEvent(event.clientX),
                });
            }
        },
        [interactionMode, onSelectionChange, timeFromEvent]
    );

    const handlePointerUp = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const anchor = dragAnchorRef.current;

            dragAnchorRef.current = null;
            setIsDragging(false);

            if (!anchor) return;

            // A tap (rather than a drag) clears the selection and moves the playhead.
            if (Math.abs(event.clientX - anchor.x) < CLICK_THRESHOLD_PX) {
                if (interactionMode === "selection") {
                    onSelectionChange?.(null);
                }
                onSeek(anchor.time);
            }
        },
        [interactionMode, onSeek, onSelectionChange]
    );

    const handlePointerCancel = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            dragAnchorRef.current = null;
            setIsDragging(false);

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
        },
        []
    );

    return (
                <div className={compact
                        ? "relative overflow-hidden rounded-2xl border border-orange-500/60 bg-orange-500/5 dark:bg-orange-950/20"
                        : "overflow-hidden rounded-xl border border-paper-border bg-paper-surface dark:border-ink-border dark:bg-ink-surface"}>
            <div ref={scrollRef} className="w-full overflow-x-auto overflow-y-hidden">
                <div className="relative" style={{ width: contentWidth, height: compact ? 160 : TOTAL_HEIGHT }}>
                    <canvas
                        ref={canvasRef}
                        role="img"
                        aria-label={`Audio waveform, ${formatTime(duration)} long`}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        className={`block touch-none select-none ${isDragging ? "cursor-grabbing" : "cursor-text"
                            }`}
                        style={{ height: compact ? 160 : TOTAL_HEIGHT }}
                    />

                    {markers.map((marker, index) => {
                        const percent = clamp(marker.time / duration, 0, 1) * 100;

                        return (
                            <button
                                key={marker.id}
                                type="button"
                                aria-label={marker.label ?? `Move split point ${index + 1}`}
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.currentTarget.setPointerCapture(event.pointerId);
                                    onMarkerChange?.(index, timeFromEvent(event.clientX));
                                }}
                                onPointerMove={(event) => {
                                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onMarkerChange?.(index, timeFromEvent(event.clientX));
                                }}
                                onPointerUp={(event) => {
                                    event.stopPropagation();
                                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                        event.currentTarget.releasePointerCapture(event.pointerId);
                                    }
                                }}
                                onPointerCancel={(event) => {
                                    event.stopPropagation();
                                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                        event.currentTarget.releasePointerCapture(event.pointerId);
                                    }
                                }}
                                className="absolute inset-y-0 z-20 w-5 -translate-x-1/2 cursor-ew-resize touch-none"
                                style={{ left: `${percent}%` }}
                            >
                                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
                                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500" />
                            </button>
                        );
                    })}

                    {!compact &&
                        selection &&
                        interactionMode === "selection" &&
                        duration > 0 &&
                        (["start", "end"] as const).map((edge) => {
                            const time =
                                edge === "start"
                                    ? Math.min(selection.start, selection.end)
                                    : Math.max(selection.start, selection.end);
                            const percent = clamp(time / duration, 0, 1) * 100;

                            return (
                                <button
                                    key={edge}
                                    type="button"
                                    aria-label={
                                        edge === "start"
                                            ? "Adjust selection start"
                                            : "Adjust selection end"
                                    }
                                    onPointerDown={handleEdgePointerDown(edge)}
                                    onPointerMove={handleEdgePointerMove(edge)}
                                    onPointerUp={handleEdgePointerUp}
                                    onPointerCancel={handleEdgePointerUp}
                                    className={`absolute z-20 w-4 -translate-x-1/2 touch-none cursor-ew-resize ${edgeDrag === edge ? "cursor-grabbing" : ""
                                        }`}
                                    style={{
                                        left: `${percent}%`,
                                        top: RULER_HEIGHT,
                                        height: WAVE_HEIGHT,
                                    }}
                                >
                                    <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
                                    <span className="absolute left-1/2 top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-sm">
                                        <span className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                                    </span>
                                </button>
                            );
                        })}

                    {compact && (
                        <div className="pointer-events-none absolute inset-x-5 bottom-3 z-30 flex items-center justify-between font-mono text-xs font-semibold text-orange-600/80 dark:text-orange-400/80">
                            <span>{formatTime(0)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    )}
                </div>
            </div>

            {!compact && <div
                className="
          flex
          flex-wrap
          items-center
          justify-between
          gap-2
          border-t
          border-paper-border
          px-3.5
          py-2
          dark:border-ink-border
        "
            >
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
                    Drag to select · Click to move playhead
                </p>

                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
                    {buffer.numberOfChannels === 1 ? "Mono" : "Stereo"} ·{" "}
                    {(buffer.sampleRate / 1000).toFixed(1)} kHz · {zoom.toFixed(1)}×
                </p>
            </div>}
        </div>
    );
}