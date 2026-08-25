"use client";

import React from "react";
import { UploadCloud } from "lucide-react";

interface ToolUploadCardProps {
  inputRef: React.RefObject<HTMLInputElement>;
  accept?: string;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  formatsText?: string;
  maxSizeText?: string;
}

export function ToolUploadCard({
  inputRef,
  accept = "audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm",
  onFileChange,
  onDrop,
  onClick,
  title = "Upload an audio file",
  subtitle = "Drag and drop your file here or click to browse",
  formatsText = "MP3, WAV, M4A, OGG, AAC, FLAC, WEBM",
  maxSizeText = "Max 100 MB",
}: ToolUploadCardProps) {
  return (
    <div className="rounded-2xl border border-paper-border bg-paper-surface p-4 shadow-sm dark:border-ink-border dark:bg-ink-surface sm:p-5">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick ?? (() => inputRef.current?.click())}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-paper-border bg-paper-surface px-5 py-8 text-center transition-all duration-200 hover:border-orange-500/50 hover:bg-paper-raised dark:border-ink-border dark:bg-ink-surface dark:hover:border-orange-500/50 dark:hover:bg-ink-raised sm:min-h-[260px]"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFileChange}
          className="hidden"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <UploadCloud className="h-7 w-7" strokeWidth={1.7} />
        </div>

        <h2 className="mt-5 text-base font-semibold text-graphite dark:text-mist">{title}</h2>

        <p className="mt-2 text-xs leading-5 text-graphite-muted dark:text-mist-muted sm:text-sm">{subtitle}</p>

        <p className="mt-3 text-[10px] leading-5 text-graphite-faint dark:text-mist-faint sm:text-xs">
          {formatsText}
          <span className="mx-1.5">•</span>
          {maxSizeText}
        </p>
      </div>
    </div>
  );
}
