// app/audiotools/silence-remover/page.tsx
"use client";

import React, {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  FileAudio,
  Trash2,
  Upload,
  Download,
  ChevronDown,
  Play,
  Pause,
  Scissors,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface SilencePreset {
  label: string;
  threshold: number; // dB
}

const SILENCE_PRESETS: SilencePreset[] = [
  { label: "Aggressive (-30 dB)", threshold: -30 },
  { label: "Moderate (-40 dB)", threshold: -40 },
  { label: "Sensitive (-50 dB)", threshold: -50 },
  { label: "Subtle (-60 dB)", threshold: -60 },
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SilenceRemoverPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [threshold, setThreshold] = useState<number>(-40);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /* =========================================================
     INLINE DOWNLOAD STATE
     (replaces the shared ToolDownloadArea popup — mirrors the
     Audio Splitter tool's inline rename + download panel)
  ========================================================= */

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const clearDownloadState = () => {
    setDownloadBlob(null);
    setDownloadFileName("");
  };

  // Keep the playback time synchronized with the audio element.
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      try {
        audio.currentTime = 0;
      } catch {
        // Ignore browser-specific seek errors.
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // Clean up the object URL when the component is unmounted.
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const seekToClientX = (clientX: number) => {
    const waveform = waveformRef.current;
    const audio = audioRef.current;

    if (!waveform || !audio || duration <= 0) {
      return;
    }

    const rect = waveform.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const percentage = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );

    const newTime = percentage * duration;

    setCurrentTime(newTime);

    try {
      audio.currentTime = newTime;
    } catch {
      // Ignore browser-specific seek errors.
    }
  };

  const handleWaveformPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!audioRef.current || !duration) {
      return;
    }

    setIsDraggingPlayhead(true);

    event.currentTarget.setPointerCapture(event.pointerId);

    seekToClientX(event.clientX);
  };

  const handleWaveformPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!isDraggingPlayhead) {
      return;
    }

    seekToClientX(event.clientX);
  };

  const handleWaveformPointerUp = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    setIsDraggingPlayhead(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWaveformPointerCancel = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    setIsDraggingPlayhead(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const togglePlayOriginal = () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Playback error:", err);
          setIsPlaying(false);
        });
    }
  };

  const processFile = (selectedFile: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    clearDownloadState();

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage("File size exceeds 100MB limit.");
      return;
    }

    if (
      !selectedFile.type.includes("audio") &&
      !selectedFile.name.match(/\.(m4a|mp3|wav|ogg|aac|flac|webm|mpeg)$/i)
    ) {
      setErrorMessage("Please upload a valid audio file.");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setFile(selectedFile);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const newUrl = URL.createObjectURL(selectedFile);

    setAudioUrl(newUrl);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsDraggingPlayhead(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const removeFile = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsDraggingPlayhead(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    clearDownloadState();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    setDropdownOpen(false);
    // A previously processed result no longer matches the new setting.
    clearDownloadState();
    setSuccessMessage(null);
  };

  /**
   * Detecting and cutting silent stretches is an ffmpeg silenceremove pass,
   * so the file is sent to /api/audio/silence-remover. minDuration is left to
   * the route's 0.5s default — short enough to catch real gaps, long enough
   * not to clip the pauses inside speech.
   */
  const handleDownload = async () => {
    if (!file || isProcessing) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    clearDownloadState();
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("threshold", String(threshold));

      const response = await fetch("/api/audio/silence-remover", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.error || `Silence removal failed (HTTP ${response.status}).`
        );
      }

      const baseName = file.name.replace(/\.[^./\\]+$/, "") || "audio";
      const defaultFileName = `${baseName}-no-silence.mp3`;

      const blob = await response.blob();

      setDownloadBlob(blob);
      setDownloadFileName(defaultFileName);
      setSuccessMessage(`Silence below ${threshold} dB removed.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================================================
     DOWNLOAD HANDLER
     Triggers the browser download for the processed blob,
     using whatever name the user typed in the rename field.
  ========================================================= */

  const handleFinalDownload = () => {
    if (!downloadBlob) {
      return;
    }

    const trimmedName = downloadFileName.trim() || "audio-silence-removed.mp3";
    const finalName = trimmedName.toLowerCase().endsWith(".mp3")
      ? trimmedName
      : `${trimmedName}.mp3`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    removeFile();
  };

  const selectedPreset: SilencePreset =
    (SILENCE_PRESETS.find((p) => p.threshold === threshold) ??
      SILENCE_PRESETS[1]) as SilencePreset;

  const playheadPercentage =
    duration > 0
      ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 rounded-2xl bg-orange-500/10 p-3 text-orange-500">
            <Scissors className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Silence Remover
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Remove unnecessary silent sections automatically.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
          {errorMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />

              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {successMessage && !downloadBlob ? (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />

              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          ) : null}

          {!file ? (
            /* =========================================================
               UPLOAD DROPZONE — matches the Audio Splitter tool's
               dropzone exactly (size, border, icon, spacing, copy).
            ========================================================= */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
                isDragging
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac,.flac,.webm,.mpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>

              <h2 className="text-lg font-semibold">Upload Audio File</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your audio file here, or click to browse
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                Supports MP3, M4A, WAV, AAC • Max 100 MB
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-background/40 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <FileAudio className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold">{file.name}</p>

                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {formatTime(duration)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlayOriginal}
                      disabled={!audioUrl || duration <= 0}
                      className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-500 transition-colors hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3 w-3 shrink-0" />
                          <span>Pause ({selectedPreset.label})</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 shrink-0" />
                          <span>Play ({selectedPreset.label})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={removeFile}
                      className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Hidden Audio Element */}
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const loadedDuration = e.currentTarget.duration;

                      if (
                        Number.isFinite(loadedDuration) &&
                        loadedDuration > 0
                      ) {
                        setDuration(loadedDuration);
                      }
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setCurrentTime(0);

                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                      }
                    }}
                    className="hidden"
                  />
                )}

                {/* CONTROLLABLE WAVEFORM */}
                <div
                  ref={waveformRef}
                  onPointerDown={handleWaveformPointerDown}
                  onPointerMove={handleWaveformPointerMove}
                  onPointerUp={handleWaveformPointerUp}
                  onPointerCancel={handleWaveformPointerCancel}
                  className={`relative mt-4 touch-none overflow-hidden rounded-xl border border-orange-500/40 bg-orange-500/10 p-6 shadow-inner ${
                    duration > 0
                      ? isDraggingPlayhead
                        ? "cursor-grabbing"
                        : "cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  {/* Vertical Tracking Bar */}
                  {duration > 0 && (
                    <div
                      className={`pointer-events-none absolute top-0 bottom-0 z-30 ${
                        isDraggingPlayhead
                          ? "w-1 bg-orange-600"
                          : "w-0.5 bg-orange-600"
                      }`}
                      style={{
                        left: `${playheadPercentage}%`,
                        transform: "translateX(-50%)",
                        boxShadow:
                          "0 0 8px rgba(234, 88, 12, 0.45)",
                      }}
                    />
                  )}

                  {/* Waveform Bars */}
                  <div className="relative z-10 flex items-center justify-between gap-1 py-2">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-orange-500 transition-all"
                        style={{
                          height: `${((i * 3) % 5) * 6 + 20}px`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Time Labels */}
                  <div className="relative z-10 mt-2 flex items-center justify-between px-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Silence Settings Card */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Silence Threshold
                  </h2>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-xl border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors ${
                      dropdownOpen
                        ? "border-orange-500 ring-2 ring-orange-500/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="whitespace-nowrap">{selectedPreset.label}</span>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full z-[9999] mt-2 max-h-36 w-64 space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-white p-2 text-foreground shadow-2xl dark:bg-zinc-900 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-500/40 hover:[&::-webkit-scrollbar-thumb]:bg-orange-500">
                      {SILENCE_PRESETS.map((p) => {
                        const isSelected = p.threshold === threshold;

                        return (
                          <div
                            key={p.threshold}
                            onClick={() => handleThresholdChange(p.threshold)}
                            className={`flex cursor-pointer items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="whitespace-nowrap">{p.label}</span>

                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* PROCESS & DOWNLOAD */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4" />
                      Remove Silence 
                    </>
                  )}
                </button>

                {/* INLINE RENAME + DOWNLOAD PANEL — matches Audio Splitter tool */}
                {downloadBlob && (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Your file is ready</p>
                        <p className="text-xs text-muted-foreground">
                          Choose a name for your download.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="download-filename"
                        className="mb-2 block text-xs font-medium text-muted-foreground"
                      >
                        Rename
                      </label>

                      <input
                        id="download-filename"
                        type="text"
                        value={downloadFileName}
                        onChange={(event) => setDownloadFileName(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleFinalDownload}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}