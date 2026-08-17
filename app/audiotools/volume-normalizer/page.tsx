// app/audiotools/normalizer/page.tsx
"use client";

import React, {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  Loader2,
  Trash2,
  Upload,
  Volume2,
  ChevronDown,
  Play,
  Pause,
} from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const NORMALIZE_PRESETS = [
  { label: "Podcast / Standard (-16 LUFS)", value: "-16" },
  { label: "Streaming / Broadcast (-14 LUFS)", value: "-14" },
  { label: "Quiet / Soft Balance (-18 LUFS)", value: "-18" },
  { label: "Loud Master (-12 LUFS)", value: "-12" },
  { label: "Maximum Gain (-10 LUFS)", value: "-10" },
];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .trim()
      .slice(0, 100) || "audio"
  );
}

export default function VolumeNormalizerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const [targetLevel, setTargetLevel] = useState("-14");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [audioUrl, previewUrl]);

  // Generate preview whenever file or targetLevel changes
  useEffect(() => {
    let isMounted = true;

    async function generatePreview() {
      if (!file) return;

      setIsPreviewLoading(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetLevel", targetLevel);

        const response = await fetch("/api/audio/normalize", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to generate preview.");
        }

        const blob = await response.blob();
        const newUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return newUrl;
          });
        } else {
          URL.revokeObjectURL(newUrl);
        }
      } catch (err) {
        console.error("Preview generation error:", err);
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false);
        }
      }
    }

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [file, targetLevel]);

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setAudioUrl(null);
    setPreviewUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsPreviewLoading(false);
    setIsDraggingPlayhead(false);
    setLoading(false);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = (selectedFile: File) => {
    setError("");
    setSuccess("");

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File is larger than the 100 MB limit.");
      return;
    }

    const fileName = selectedFile.name.toLowerCase();

    const validExtension =
      fileName.endsWith(".mp3") ||
      fileName.endsWith(".wav") ||
      fileName.endsWith(".m4a") ||
      fileName.endsWith(".ogg") ||
      fileName.endsWith(".aac") ||
      fileName.endsWith(".flac") ||
      fileName.endsWith(".webm") ||
      fileName.endsWith(".mpeg");

    if (!validExtension) {
      setError(
        "Please upload a valid audio file (MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG)."
      );
      return;
    }

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) return;
    processFile(droppedFile);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsDraggingPlayhead(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl || isPreviewLoading) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Playback error:", err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const seekFromWaveform = (clientX: number) => {
    const waveform = waveformRef.current;
    const audio = audioRef.current;

    if (!waveform || !audio || duration <= 0 || !previewUrl || isPreviewLoading) {
      return;
    }

    const rect = waveform.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!previewUrl || duration <= 0 || isPreviewLoading) {
      return;
    }

    setIsDraggingPlayhead(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromWaveform(event.clientX);
  };

  const handleWaveformPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!isDraggingPlayhead) {
      return;
    }

    seekFromWaveform(event.clientX);
  };

  const handleWaveformPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    setIsDraggingPlayhead(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWaveformPointerCancel = () => {
    setIsDraggingPlayhead(false);
  };

  const executeNormalization = async () => {
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please upload an audio file first.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetLevel", targetLevel);

      const response = await fetch("/api/audio/normalize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Normalization failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const baseName = sanitizeFileName(file.name);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${baseName}_normalized.mp3`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 2000);

      setSuccess("Successfully normalized your audio file! Your download has started.");
    } catch (err) {
      console.error("Normalization error:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPreset = NORMALIZE_PRESETS.find((p) => p.value === targetLevel) ?? NORMALIZE_PRESETS[1];

  // Safely extract short preset name to prevent TypeScript undefined errors
  const presetShortName = selectedPreset?.label ? selectedPreset.label.split(" (")[0] : "Preview";

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15">
            <Volume2 className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Volume Normalizer
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Balance volume for a more consistent sound.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {!file && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => {
                setDragActive(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
                dragActive
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/15">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>

              <h2 className="text-lg font-semibold">Upload your audio</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your file here or click to browse
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG • Max 100 MB
              </p>
            </div>
          )}

          {file && audioUrl && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Selected Files & Preview (1)
                </h2>
                <span className="text-xs text-muted-foreground">
                  Ready for normalization
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                      <FileAudio className="h-5 w-5 text-orange-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm sm:text-base">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {formatTime(duration)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      disabled={isPreviewLoading || !previewUrl}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 transition-colors hover:bg-orange-500/25 disabled:opacity-50"
                    >
                      {isPreviewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>{isPlaying ? "Pause Preview" : "Play Preview"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={reset}
                      disabled={loading}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={previewUrl || undefined}
                  preload="metadata"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />

                {/* Waveform / Audio Preview Container */}
                <div
                  ref={waveformRef}
                  onPointerDown={handleWaveformPointerDown}
                  onPointerMove={handleWaveformPointerMove}
                  onPointerUp={handleWaveformPointerUp}
                  onPointerCancel={handleWaveformPointerCancel}
                  className={`relative mt-4 touch-none rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 sm:p-5 shadow-inner ${
                    previewUrl && duration > 0
                      ? "cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header showing preset name in brackets */}
                    <div className="flex items-center justify-between px-1">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/20 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-350">
                        ({presetShortName} Preview)
                      </span>
                      {isPreviewLoading && (
                        <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Updating...
                        </span>
                      )}
                    </div>

                    {/* Simulated Waveform Bars + Vertical Tracking Bar */}
                    <div className="relative h-12 px-2">
                      <div className="absolute inset-0 flex items-center justify-between gap-1 pointer-events-none">
                        {Array.from({ length: 42 }).map((_, i) => {
                          const heights = [
                            20, 45, 75, 40, 90, 60, 30, 85, 100, 50, 65, 35, 80,
                            95, 45, 60, 30, 70, 85, 40, 55, 90, 35, 75, 65, 45,
                            80, 50, 95, 60, 30, 85, 70, 40, 90, 55, 35, 75, 60,
                            45, 80, 30
                          ];
                          const h = heights[i % heights.length];

                          return (
                            <div
                              key={i}
                              className="w-1 rounded-full bg-orange-500/70"
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>

                      {previewUrl && duration > 0 && (
                        <div
                          className="absolute top-0 bottom-0 z-20"
                          style={{
                            left: `${Math.min(
                              100,
                              Math.max(0, (currentTime / duration) * 100)
                            )}%`,
                            transform: "translateX(-50%)",
                            pointerEvents: "none",
                          }}
                        >
                          <div
                            className={`h-full w-[3px] rounded-full bg-orange-600 dark:bg-orange-400 shadow-[0_0_7px_rgba(234,88,12,0.45)] ${
                              isDraggingPlayhead ? "w-1" : ""
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Time labels at bottom corners */}
                    <div className="flex items-center justify-between text-xs font-medium text-orange-600 dark:text-orange-400 px-1 pt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>

                    {/* Invisible range input kept for keyboard/accessibility seeking */}
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.01}
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={isPreviewLoading || !previewUrl || duration === 0}
                      aria-label="Audio playback position"
                      className="absolute bottom-0 left-0 h-1 w-full opacity-0 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-semibold">Target Volume Level</h2>
                  
                  </div>

                  <div className="w-full sm:w-80 lg:w-96 relative" ref={dropdownRef}>
                    <label
                      id="target-level-label"
                      className="mb-2 block text-xs font-medium text-muted-foreground"
                    >
                      Preset Target
                    </label>

                    <button
                      type="button"
                      aria-labelledby="target-level-label"
                      aria-haspopup="listbox"
                      aria-expanded={dropdownOpen}
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 backdrop-blur-md px-3.5 py-2.5 text-sm font-medium outline-none transition-colors hover:border-orange-500/50 focus:border-orange-500"
                    >
                      <span className="truncate pr-2">{selectedPreset?.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {dropdownOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="target-level-label"
                        className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto z-50 w-full sm:w-88 md:w-96 overflow-hidden rounded-2xl border border-border/60 bg-background/75 backdrop-blur-xl shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
                      >
                        <div className="max-h-48 overflow-y-auto p-1.5 bg-transparent rounded-2xl scrollbar-thin scrollbar-thumb-orange-500/50 scrollbar-track-transparent">
                          {NORMALIZE_PRESETS.map((preset) => {
                            const isSelected = targetLevel === preset.value;
                            return (
                              <div
                                key={preset.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setTargetLevel(preset.value);
                                  setDropdownOpen(false);
                                }}
                                className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-3 text-sm whitespace-nowrap transition-colors ${
                                  isSelected
                                    ? "bg-orange-500 text-white font-medium"
                                    : "hover:bg-muted/50 text-foreground"
                                }`}
                              >
                                <span>{preset.label}</span>
                                {isSelected && (
                                  <CheckCircle2 className="ml-3 h-4 w-4 shrink-0 text-white" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {!dropdownOpen && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={executeNormalization}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Normalizing Audio...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        Normalize & Download
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}