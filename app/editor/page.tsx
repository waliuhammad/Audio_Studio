"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Keyboard } from "lucide-react";
import { Navbar } from "@/components/navbar/Navbar";
import { EditorDropzone } from "@/components/editor/EditorDropzone";
import { WaveformCanvas } from "@/components/editor/WaveformCanvas";
import { TransportBar } from "@/components/editor/TransportBar";
import { EditPanel, type EditAction } from "@/components/editor/EditPanel";
import { useAudioEngine } from "@/components/editor/useAudioEngine";
import { useToolResult } from "@/components/library/ToolResult";
import { useEditorHistory } from "@/components/editor/useEditorHistory";
import {
    audioBufferToWav,
    decodeAudioFile,
    downloadBlob,
    type TimeRange,
} from "@/lib/audio/audio-utils";
import {
    applyFadeIn,
    applyFadeOut,
    applyGain,
    changeSpeed,
    decibelsToGain,
    deleteRange,
    normalize,
    reverse,
    trimToRange,
} from "@/lib/audio/audio-edits";

const DEFAULT_FADE_SECONDS = 3;

export default function EditorPage() {
    const { setResult } = useToolResult();

    const [fileName, setFileName] = useState<string>("");
    const [isDecoding, setIsDecoding] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selection, setSelection] = useState<TimeRange | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingLabel, setProcessingLabel] = useState<string | null>(null);

    const history = useEditorHistory<AudioBuffer>();
    const buffer = history.current;

    // Loop playback across the selection when one exists.
    const playbackRegion = useMemo<TimeRange | null>(() => {
        if (!selection) return null;

        const start = Math.min(selection.start, selection.end);
        const end = Math.max(selection.start, selection.end);

        return end - start > 0.01 ? { start, end } : null;
    }, [selection]);

    const engine = useAudioEngine(buffer, playbackRegion);
    const { toggle, seek, currentTime, duration, isPlaying } = engine;

    const handleFileSelected = useCallback(
        async (file: File) => {
            setIsDecoding(true);
            setErrorMessage(null);

            try {
                const decoded = await decodeAudioFile(file);

                history.reset(decoded, "Original file");
                setFileName(file.name);
                setSelection(null);
                setZoom(1);
            } catch {
                setErrorMessage(
                    "Could not decode that file. It may be corrupted, or in a codec this browser doesn't support — try converting it to MP3 or WAV first."
                );
            } finally {
                setIsDecoding(false);
            }
        },
        [history]
    );

    /** Wrap an edit so the UI stays responsive and history records a label. */
    const runEdit = useCallback(
        async (
            label: string,
            operation: (input: AudioBuffer) => AudioBuffer | Promise<AudioBuffer>
        ) => {
            if (!buffer) return;

            setIsProcessing(true);
            setProcessingLabel(label);
            setErrorMessage(null);

            // Yield a frame so the spinner paints before we block on the audio math.
            await new Promise((resolve) => window.setTimeout(resolve, 16));

            try {
                const result = await operation(buffer);

                history.commit(result, label);
                setSelection(null);
            } catch {
                setErrorMessage(`Something went wrong while applying "${label}".`);
            } finally {
                setIsProcessing(false);
                setProcessingLabel(null);
            }
        },
        [buffer, history]
    );

    const handleAction = useCallback(
        (action: EditAction) => {
            if (!buffer) return;

            const start = selection
                ? Math.min(selection.start, selection.end)
                : null;
            const end = selection ? Math.max(selection.start, selection.end) : null;
            const hasRange = start !== null && end !== null && end - start > 0.001;

            switch (action) {
                case "trim":
                    if (!hasRange) return;
                    void runEdit("Trim to selection", (input) =>
                        trimToRange(input, start, end)
                    );
                    return;

                case "delete":
                    if (!hasRange) return;
                    void runEdit("Delete selection", (input) =>
                        deleteRange(input, start, end)
                    );
                    return;

                case "fade-in": {
                    const fadeStart = hasRange ? start : 0;
                    const fadeEnd = hasRange
                        ? end
                        : Math.min(DEFAULT_FADE_SECONDS, buffer.duration);

                    void runEdit("Fade in", (input) =>
                        applyFadeIn(input, fadeStart, fadeEnd)
                    );
                    return;
                }

                case "fade-out": {
                    const fadeStart = hasRange
                        ? start
                        : Math.max(0, buffer.duration - DEFAULT_FADE_SECONDS);
                    const fadeEnd = hasRange ? end : buffer.duration;

                    void runEdit("Fade out", (input) =>
                        applyFadeOut(input, fadeStart, fadeEnd)
                    );
                    return;
                }

                case "normalize":
                    void runEdit("Normalize", (input) => normalize(input));
                    return;

                case "reverse":
                    void runEdit("Reverse", (input) =>
                        hasRange ? reverse(input, start, end) : reverse(input)
                    );
                    return;

                case "gain-up":
                    void runEdit("Volume +3 dB", (input) =>
                        applyGain(input, decibelsToGain(3))
                    );
                    return;

                case "gain-down":
                    void runEdit("Volume −3 dB", (input) =>
                        applyGain(input, decibelsToGain(-3))
                    );
                    return;

                default:
                    return;
            }
        },
        [buffer, runEdit, selection]
    );

    const handleSpeedChange = useCallback(
        (rate: number) => {
            void runEdit(`Speed ${rate}×`, (input) => changeSpeed(input, rate));
        },
        [runEdit]
    );

    const handleExport = useCallback(() => {
        if (!buffer) return;

        const baseName =
            fileName.replace(/\.[^./\\]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") ||
            "audio";

        const exportName = `${baseName}-edited.wav`;
        const wav = audioBufferToWav(buffer);

        downloadBlob(wav, exportName);

        // Offer the same file to the library, so an export can be kept rather
        // than only landing in the downloads folder.
        setResult({
            blob: wav,
            fileName: exportName,
            meta: `WAV · ${Math.round(buffer.duration)}s`,
        });
    }, [buffer, fileName, setResult]);

    const handleReset = useCallback(() => {
        history.clear();
        setFileName("");
        setSelection(null);
        setZoom(1);
        setErrorMessage(null);
    }, [history]);

    // Keyboard shortcuts — skipped while the user is typing in a field.
    useEffect(() => {
        if (!buffer) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)
            ) {
                return;
            }

            const isModified = event.metaKey || event.ctrlKey;

            if (isModified && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) {
                    history.redo();
                } else {
                    history.undo();
                }
                return;
            }

            switch (event.key) {
                case " ":
                    event.preventDefault();
                    toggle();
                    return;
                case "Home":
                    event.preventDefault();
                    seek(0);
                    return;
                case "End":
                    event.preventDefault();
                    seek(duration);
                    return;
                case "ArrowLeft":
                    event.preventDefault();
                    seek(currentTime - (event.shiftKey ? 5 : 1));
                    return;
                case "ArrowRight":
                    event.preventDefault();
                    seek(currentTime + (event.shiftKey ? 5 : 1));
                    return;
                case "Escape":
                    setSelection(null);
                    return;
                default:
                    return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [buffer, currentTime, duration, history, seek, toggle]);

    return (
        <>
            <Navbar />

            <main className="container-studio pb-20 pt-8 sm:pt-10">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <Link
                            href="/"
                            className="
                group
                mb-3
                inline-flex
                items-center
                gap-1.5
                font-mono
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-graphite-muted
                transition-colors
                duration-200
                hover:text-amber
                dark:text-mist-muted
              "
                        >
                            <ArrowLeft
                                className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5"
                                strokeWidth={2}
                            />
                            Back to home
                        </Link>

                        <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite dark:text-mist sm:text-4xl">
                            Audio Editor
                        </h1>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-graphite-muted dark:text-mist-muted">
                            Cut, shape and export your track on a real timeline. Processing
                            runs locally in your browser — nothing is uploaded.
                        </p>
                    </div>

                    {buffer && (
                        <div
                            className="
                hidden
                items-center
                gap-2
                rounded-xl
                border
                border-paper-border
                px-3
                py-2
                dark:border-ink-border
                sm:flex
              "
                        >
                            <Keyboard
                                className="h-3.5 w-3.5 shrink-0 text-amber"
                                strokeWidth={1.8}
                            />
                            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                                Space play · ←→ seek · ⌘Z undo · Esc clear
                            </p>
                        </div>
                    )}
                </div>

                {!buffer ? (
                    <EditorDropzone
                        onFileSelected={(file) => void handleFileSelected(file)}
                        isLoading={isDecoding}
                        errorMessage={errorMessage}
                    />
                ) : (
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex min-w-0 flex-1 flex-col gap-4">
                            <WaveformCanvas
                                buffer={buffer}
                                currentTime={currentTime}
                                isPlaying={isPlaying}
                                selection={selection}
                                zoom={zoom}
                                onSeek={seek}
                                onSelectionChange={setSelection}
                            />

                            <TransportBar
                                engine={engine}
                                selection={selection}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                onClearSelection={() => setSelection(null)}
                            />

                            {errorMessage && (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-coral/30 bg-coral/[0.06] px-4 py-3 text-[13px] text-graphite dark:text-mist"
                                >
                                    {errorMessage}
                                </p>
                            )}

                            {history.label && (
                                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
                                    Step {history.stepIndex + 1} of {history.steps.length} ·{" "}
                                    {history.label}
                                </p>
                            )}
                        </div>

                        <EditPanel
                            buffer={buffer}
                            fileName={fileName}
                            selection={selection}
                            isProcessing={isProcessing}
                            processingLabel={processingLabel}
                            canUndo={history.canUndo}
                            canRedo={history.canRedo}
                            undoLabel={history.undoLabel}
                            redoLabel={history.redoLabel}
                            onAction={handleAction}
                            onSpeedChange={handleSpeedChange}
                            onUndo={history.undo}
                            onRedo={history.redo}
                            onExport={handleExport}
                            onReset={handleReset}
                        />
                    </div>
                )}
            </main>
        </>
    );
}