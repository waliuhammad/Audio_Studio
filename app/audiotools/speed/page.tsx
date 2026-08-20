// app/audiotools/speed/page.tsx
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
  ChevronDown,
  Play,
  Pause,
  Gauge,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useToolResult } from "@/components/library/ToolResult";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface SpeedPreset {
  label: string;
  speed: number;
}

const SPEED_PRESETS: SpeedPreset[] = [
  { label: "0.5x", speed: 0.5 },
  { label: "0.75x", speed: 0.75 },
  { label: "Normal", speed: 1.0 },
  { label: "1.25x", speed: 1.25 },
  { label: "1.5x", speed: 1.5 },
  { label: "2.0x", speed: 2.0 },
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

export default function SpeedChangerPage() {
  const { setResult } = useToolResult();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Keep playback speed synchronized with the selected speed.
  useEffect(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.playbackRate = speed;
    }
  }, [speed, audioUrl]);

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
      audio.playbackRate = speed;

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

    // Pause currently playing audio before replacing it.
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Changing speed while keeping pitch natural is an ffmpeg atempo chain, so
   * the work happens on the server. The preview above uses playbackRate,
   * which shifts pitch too — the download must not inherit that shortcut.
   */
  const handleDownload = async () => {
    if (!file || isProcessing) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("speed", String(speed));

      const response = await fetch("/api/audio/speed", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.error || `Speed change failed (HTTP ${response.status}).`
        );
      }

      const baseName = file.name.replace(/\.[^./\\]+$/, "") || "audio";
      const defaultFileName = `${baseName}-speed${speed}x.mp3`;

      const blob = await response.blob();
      setResult({ blob, defaultFileName, extension: "mp3", fallbackBaseName: "audio-speed-changed" });

      setSuccessMessage(
        `Speed set to ${speed}×. Rename the result below when you are ready to download.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPreset: SpeedPreset =
    (SPEED_PRESETS.find((p) => p.speed === speed) ??
      SPEED_PRESETS[2]) as SpeedPreset;

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
            <Gauge className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Audio Speed Changer
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Adjust the playback speed of your audio files with custom
            multipliers.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
          {errorMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />

              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />

              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
                isDragging
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-border bg-background/50 hover:border-orange-500/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac,.flac,.webm,.mpeg"
                className="hidden"
              />

              <div className="mb-4 rounded-2xl bg-orange-500/10 p-4 text-orange-500">
                <Upload className="h-8 w-8" />
              </div>

              <h3 className="mb-1 text-lg font-semibold">
                Upload Audio File
              </h3>

              <p className="mb-4 text-sm text-muted-foreground">
                Drag and drop your audio file here, or click to browse
              </p>

              <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                Supports MP3, M4A, WAV, AAC (Max 100MB)
              </span>
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
                      className="flex items-center gap-2 rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-500 transition-colors hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Pause Preview
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Play Preview ({speed}x)
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
                          height: `${(i % 5) * 6 + 20}px`,
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

              {/* Speed Settings Card */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Playback Speed
                  </h2>

                 
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`flex items-center gap-4 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors ${
                      dropdownOpen
                        ? "border-orange-500 ring-2 ring-orange-500/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {selectedPreset.label}

                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full z-[9999] mt-2 w-56 space-y-1 rounded-2xl border border-border bg-white p-2 text-foreground shadow-2xl dark:bg-zinc-900">
                      {SPEED_PRESETS.map((p) => {
                        const isSelected = p.speed === speed;

                        return (
                          <div
                            key={p.speed}
                            onClick={() => {
                              setSpeed(p.speed);
                              setDropdownOpen(false);
                            }}
                            className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span>{p.label}</span>

                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing&hellip;
                    </>
                  ) : (
                    <>
                      <Gauge className="h-4 w-4" />
                      Apply Speed &amp; Download
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}