"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, FileAudio, Loader2, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/audio/audio-utils";

const ACCEPTED_EXTENSIONS = [
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".aac",
    ".flac",
    ".webm",
    ".mp4",
    ".mov",
];

const MAX_FILE_SIZE = 200 * 1024 * 1024;

interface EditorDropzoneProps {
    onFileSelected: (file: File) => void;
    isLoading: boolean;
    errorMessage: string | null;
}

export function EditorDropzone({
    onFileSelected,
    isLoading,
    errorMessage,
}: EditorDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateAndSend = useCallback(
        (file: File) => {
            setLocalError(null);

            const name = file.name.toLowerCase();
            const isAccepted = ACCEPTED_EXTENSIONS.some((extension) =>
                name.endsWith(extension)
            );

            if (!isAccepted) {
                setLocalError(
                    "Unsupported format. Upload MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MP4 or MOV."
                );
                return;
            }

            if (file.size === 0) {
                setLocalError("That file is empty.");
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                setLocalError(
                    `That file is ${formatBytes(file.size)}. The editor supports up to 200 MB.`
                );
                return;
            }

            onFileSelected(file);
        },
        [onFileSelected]
    );

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);

            const file = event.dataTransfer.files?.[0];
            if (file) validateAndSend(file);
        },
        [validateAndSend]
    );

    const visibleError = errorMessage ?? localError;

    return (
        <div className="mx-auto w-full max-w-3xl">
            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!isLoading) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
          relative
          flex
          flex-col
          items-center
          justify-center
          gap-5
          rounded-2xl
          border
          border-dashed
          px-6
          py-16
          text-center
          transition-all
          duration-300
          sm:px-10
          sm:py-20
          ${isDragging
                        ? "border-amber bg-amber/[0.06]"
                        : "border-paper-border bg-paper-surface dark:border-ink-border dark:bg-ink-surface"
                    }
        `}
            >
                <span
                    className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            border
            border-amber/20
            bg-amber/10
            text-amber
          "
                >
                    {isLoading ? (
                        <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.6} />
                    ) : (
                        <UploadCloud className="h-7 w-7" strokeWidth={1.6} />
                    )}
                </span>

                <div className="space-y-2">
                    <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-graphite dark:text-mist sm:text-2xl">
                        {isLoading ? "Decoding your audio…" : "Drop a file to start editing"}
                    </h2>

                    <p className="mx-auto max-w-md text-sm leading-6 text-graphite-muted dark:text-mist-muted">
                        {isLoading
                            ? "Reading the waveform. Large files can take a few seconds."
                            : "Everything happens in your browser — your file never leaves this device."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isLoading}
                    className="
            group
            inline-flex
            min-h-12
            items-center
            justify-center
            gap-2
            rounded-full
            border
            border-amber/40
            bg-amber
            px-6
            py-3
            text-sm
            font-semibold
            text-ink
            transition-all
            duration-300
            hover:-translate-y-0.5
            hover:gap-3
            hover:border-amber
            hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]
            active:translate-y-0
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-60
            disabled:hover:translate-y-0
          "
                >
                    <FileAudio className="h-4 w-4" strokeWidth={1.8} />
                    Choose a file
                </button>

                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
                    MP3 · WAV · M4A · OGG · FLAC · MP4 — up to 200 MB
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    accept="audio/*,video/*"
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) validateAndSend(file);
                        event.target.value = "";
                    }}
                />
            </div>

            {visibleError && (
                <div
                    role="alert"
                    className="
            mt-4
            flex
            items-start
            gap-2.5
            rounded-xl
            border
            border-coral/30
            bg-coral/[0.06]
            px-4
            py-3
          "
                >
                    <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-coral"
                        strokeWidth={1.8}
                    />
                    <p className="text-[13px] leading-5 text-graphite dark:text-mist">
                        {visibleError}
                    </p>
                </div>
            )}
        </div>
    );
}