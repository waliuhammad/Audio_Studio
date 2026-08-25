"use client";

import React, { useId } from "react";
import { Download, Pencil } from "lucide-react";
import { useToolResult } from "./ToolResult";
import { SaveToLibrary } from "./SaveToLibrary";
import { downloadBlob } from "@/lib/audio/audio-utils";
import { normalizeDownloadFilename } from "@/lib/download/filename";

interface ToolDownloadAreaProps {
  defaultFileName: string;
  extension: string;
  fallbackBaseName: string;
  onProcess: () => void | Promise<void>;
  processing?: boolean;
  disabled?: boolean;
  processLabel: string;
  processingLabel?: string;
  downloadLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ToolDownloadArea({
  defaultFileName,
  extension,
  fallbackBaseName,
  onProcess,
  processing = false,
  disabled = false,
  processLabel,
  processingLabel = "Processing...",
  downloadLabel = "Download Result",
  icon,
  className = "",
}: ToolDownloadAreaProps) {
  const { result, renameValue, setRenameValue } = useToolResult();
  const filenameInputId = useId();
  const outputExtension = result?.extension ?? extension;
  const outputFallbackBaseName = result?.fallbackBaseName ?? fallbackBaseName;

  const downloadName = normalizeDownloadFilename(
    result ? renameValue : defaultFileName,
    {
      extension: outputExtension,
      fallbackBaseName: outputFallbackBaseName,
    }
  );

  const handleClick = () => {
    if (result) {
      downloadBlob(result.blob, downloadName);
      return;
    }

    void onProcess();
  };

  return (
    <div className={`space-y-3 pt-2 ${className}`}>
      {result && (
        <div>
          <label
            htmlFor={filenameInputId}
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Filename
          </label>
          <div className="relative">
            <input
              id={filenameInputId}
              type="text"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background/40 px-4 pr-11 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-orange-500/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${filenameInputId}-help`}
            />
            <Pencil
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/70"
              strokeWidth={1.8}
            />
          </div>
          <p id={`${filenameInputId}-help`} className="sr-only">
            This is the name used for the downloaded file.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={processing || disabled}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {icon ?? <Download className="h-4 w-4" strokeWidth={1.9} />}
        {processing ? processingLabel : result ? downloadLabel : processLabel}
      </button>

      {result && (
        <SaveToLibrary
          getBlob={() => result.blob}
          fileName={downloadName}
          meta={result.meta}
          className="w-full"
        />
      )}
    </div>
  );
}
