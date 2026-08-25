"use client";

import type { LucideIcon } from "lucide-react";
import {
    ArrowLeftRight,
    Check,
    Crop,
    Download,
    Gauge,
    Loader2,
    Redo2,
    RotateCcw,
    Save,
    Trash2,
    TrendingDown,
    TrendingUp,
    Undo2,
    Volume2,
    Wand2,
} from "lucide-react";
import { formatBytes, formatTime, type TimeRange } from "@/lib/audio/audio-utils";
import { ToolDownloadArea } from "@/components/library/ToolDownloadArea";

export type EditAction =
    | "trim"
    | "delete"
    | "fade-in"
    | "fade-out"
    | "normalize"
    | "reverse"
    | "gain-up"
    | "gain-down";

interface EditPanelProps {
    buffer: AudioBuffer;
    fileName: string;
    selection: TimeRange | null;
    isProcessing: boolean;
    processingLabel: string | null;
    canUndo: boolean;
    canRedo: boolean;
    undoLabel: string | null;
    redoLabel: string | null;
    onAction: (action: EditAction) => void;
    onSpeedChange: (rate: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    onExport: () => void;
    exportFileName: string;
    onReset: () => void;
    /** Whether the signed-in "Save draft" button should render at all. */
    showSaveDraft?: boolean;
    onSaveDraft?: () => void;
    draftState?: "idle" | "saving" | "saved" | "error";
    draftMessage?: string | null;
    /** True once a draft project id exists for the current file. */
    draftReady?: boolean;
}

interface EditButton {
    action: EditAction;
    label: string;
    icon: LucideIcon;
    requiresSelection: boolean;
    hint: string;
}

const EDIT_BUTTONS: EditButton[] = [
    {
        action: "trim",
        label: "Trim to selection",
        icon: Crop,
        requiresSelection: true,
        hint: "Keep only the selected range",
    },
    {
        action: "delete",
        label: "Delete selection",
        icon: Trash2,
        requiresSelection: true,
        hint: "Remove the selected range and close the gap",
    },
    {
        action: "fade-in",
        label: "Fade in",
        icon: TrendingUp,
        requiresSelection: false,
        hint: "Ramp up across the selection, or the first 3 seconds",
    },
    {
        action: "fade-out",
        label: "Fade out",
        icon: TrendingDown,
        requiresSelection: false,
        hint: "Ramp down across the selection, or the last 3 seconds",
    },
    {
        action: "normalize",
        label: "Normalize",
        icon: Wand2,
        requiresSelection: false,
        hint: "Raise the loudest peak to just below clipping",
    },
    {
        action: "reverse",
        label: "Reverse",
        icon: ArrowLeftRight,
        requiresSelection: false,
        hint: "Play the selection, or the whole track, backwards",
    },
    {
        action: "gain-up",
        label: "Volume +3 dB",
        icon: Volume2,
        requiresSelection: false,
        hint: "Make the whole track louder",
    },
    {
        action: "gain-down",
        label: "Volume −3 dB",
        icon: Volume2,
        requiresSelection: false,
        hint: "Make the whole track quieter",
    },
];

const SPEED_PRESETS = [0.5, 0.75, 1.25, 1.5, 2];

const sectionLabelClass =
    "mb-2.5 font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-graphite-faint dark:text-mist-faint";

export function EditPanel({
    buffer,
    fileName,
    selection,
    isProcessing,
    processingLabel,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    onAction,
    onSpeedChange,
    onUndo,
    onRedo,
    onExport,
    exportFileName,
    onReset,
    showSaveDraft = false,
    onSaveDraft,
    draftState = "idle",
    draftMessage = null,
    draftReady = false,
}: EditPanelProps) {
    const hasSelection =
        selection !== null && Math.abs(selection.end - selection.start) > 0.001;

    // 16-bit PCM: sampleRate × channels × 2 bytes, plus a 44-byte header.
    const estimatedWavSize =
        buffer.length * buffer.numberOfChannels * 2 + 44;

    return (
        <aside
            className="
        flex
        w-full
        flex-col
        gap-5
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        p-4
        dark:border-ink-border
        dark:bg-ink-surface
        lg:w-[300px]
        lg:shrink-0
      "
        >
            {/* File summary */}
            <div>
                <p className={sectionLabelClass}>Loaded file</p>

                <p className="truncate text-[13px] font-semibold text-graphite dark:text-mist">
                    {fileName}
                </p>

                <p className="mt-1 font-mono text-[10px] tabular-nums text-graphite-muted dark:text-mist-muted">
                    {formatTime(buffer.duration, true)} ·{" "}
                    {buffer.numberOfChannels === 1 ? "Mono" : "Stereo"} ·{" "}
                    {(buffer.sampleRate / 1000).toFixed(1)} kHz
                </p>
            </div>

            {/* Undo / redo */}
            <div>
                <p className={sectionLabelClass}>History</p>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onUndo}
                        disabled={!canUndo || isProcessing}
                        title={undoLabel ? `Undo to: ${undoLabel}` : "Nothing to undo"}
                        className="
              flex
              h-9
              flex-1
              items-center
              justify-center
              gap-1.5
              rounded-full
              border
              border-paper-border
              text-[12px]
              font-medium
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
            "
                    >
                        <Undo2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Undo
                    </button>

                    <button
                        type="button"
                        onClick={onRedo}
                        disabled={!canRedo || isProcessing}
                        title={redoLabel ? `Redo: ${redoLabel}` : "Nothing to redo"}
                        className="
              flex
              h-9
              flex-1
              items-center
              justify-center
              gap-1.5
              rounded-full
              border
              border-paper-border
              text-[12px]
              font-medium
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
            "
                    >
                        <Redo2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Redo
                    </button>
                </div>
            </div>

            {/* Edits */}
            <div>
                <p className={sectionLabelClass}>Edits</p>

                <div className="flex flex-col gap-1.5">
                    {EDIT_BUTTONS.map((button) => {
                        const Icon = button.icon;
                        const disabled =
                            isProcessing || (button.requiresSelection && !hasSelection);

                        return (
                            <button
                                key={button.action}
                                type="button"
                                onClick={() => onAction(button.action)}
                                disabled={disabled}
                                title={
                                    button.requiresSelection && !hasSelection
                                        ? "Drag across the waveform to select a range first"
                                        : button.hint
                                }
                                className="
                  group
                  flex
                  items-center
                  gap-2.5
                  rounded-xl
                  border
                  border-transparent
                  px-2.5
                  py-2
                  text-left
                  transition-all
                  duration-200
                  hover:border-amber/40
                  hover:bg-amber/[0.06]
                  disabled:cursor-not-allowed
                  disabled:opacity-35
                  disabled:hover:border-transparent
                  disabled:hover:bg-transparent
                "
                            >
                                <span
                                    className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-amber/20
                    bg-amber/10
                    text-amber
                  "
                                >
                                    <Icon
                                        className={`h-3.5 w-3.5 ${button.action === "gain-down" ? "rotate-180" : ""
                                            }`}
                                        strokeWidth={1.8}
                                    />
                                </span>

                                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-graphite dark:text-mist">
                                    {button.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Speed */}
            <div>
                <p className={sectionLabelClass}>
                    <Gauge className="mr-1 inline h-3 w-3 align-[-2px]" strokeWidth={1.8} />
                    Speed
                </p>

                <div className="grid grid-cols-5 gap-1.5">
                    {SPEED_PRESETS.map((rate) => (
                        <button
                            key={rate}
                            type="button"
                            onClick={() => onSpeedChange(rate)}
                            disabled={isProcessing}
                            className="
                flex
                h-8
                items-center
                justify-center
                rounded-lg
                border
                border-paper-border
                font-mono
                text-[10px]
                font-medium
                text-graphite-muted
                transition-all
                duration-200
                hover:border-amber/50
                hover:text-amber
                disabled:cursor-not-allowed
                disabled:opacity-40
                dark:border-ink-border
                dark:text-mist-muted
              "
                        >
                            {rate}×
                        </button>
                    ))}
                </div>

                <p className="mt-2 text-[10.5px] leading-4 text-graphite-faint dark:text-mist-faint">
                    Resamples the track, so pitch shifts with it — like tape speed.
                </p>
            </div>

            {/* Export */}
            <div className="mt-auto space-y-2 border-t border-paper-border pt-4 dark:border-ink-border">
                <ToolDownloadArea
                    defaultFileName={exportFileName}
                    extension="wav"
                    fallbackBaseName="audio-edited"
                    onProcess={onExport}
                    processing={isProcessing}
                    processLabel="Export WAV"
                    processingLabel={processingLabel ?? "Working..."}
                    icon={<Download className="h-4 w-4" strokeWidth={1.9} />}
                />

                <p className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                    ≈ {formatBytes(estimatedWavSize)} · lossless
                </p>

                {showSaveDraft && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            disabled={isProcessing || !draftReady || draftState === "saving"}
                            className="
                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2
                rounded-full
                border
                border-paper-border
                bg-paper-surface
                text-[13px]
                font-medium
                text-graphite
                transition-colors
                hover:border-amber/50
                hover:text-amber
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:border-ink-border
                dark:bg-ink-surface
                dark:text-mist
                dark:hover:border-amber/50
                dark:hover:text-amber
              "
                        >
                            {draftState === "saving" ? (
                                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                            ) : draftState === "saved" ? (
                                <Check className="h-4 w-4 text-teal" strokeWidth={2.2} />
                            ) : (
                                <Save className="h-4 w-4" strokeWidth={1.8} />
                            )}
                            {draftState === "saving"
                                ? "Saving draft…"
                                : draftState === "saved"
                                    ? "Draft saved"
                                    : "Save draft"}
                        </button>

                        {draftMessage && (
                            <p
                                className={`text-[11px] ${draftState === "error" ? "text-coral" : "text-teal"
                                    }`}
                            >
                                {draftMessage}
                            </p>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={onReset}
                    disabled={isProcessing}
                    className="
            flex
            h-9
            w-full
            items-center
            justify-center
            gap-1.5
            rounded-full
            text-[12px]
            font-medium
            text-graphite-muted
            transition-colors
            duration-200
            hover:text-coral
            disabled:cursor-not-allowed
            disabled:opacity-40
            dark:text-mist-muted
          "
                >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Start over
                </button>
            </div>
        </aside>
    );
}