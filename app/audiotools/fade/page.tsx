// app/audiotools/fader/page.tsx
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
  Download,
  FileAudio,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  Sliders,
  ChevronDown,
  Activity,
  Play,
  Pause,
} from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const FADE_PRESETS = [
  { label: "smooth", fadeIn: "1", fadeOut: "1" },
  { label: "standard", fadeIn: "2", fadeOut: "3" },
  { label: "slow", fadeIn: "5", fadeOut: "5" },
  { label: "fade in only", fadeIn: "3", fadeOut: "0" },
  { label: "fade out only", fadeIn: "0", fadeOut: "4" },
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

export default function FadeAudioPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const [fadeIn, setFadeIn] = useState("2");
  const [fadeOut, setFadeOut] = useState("3");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inline "ready to download" state — replaces the separate result card.
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

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
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  const clearResult = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultBlob(null);
    setResultUrl(null);
    setFileName("");
  };

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    clearResult();

    setFile(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsDraggingPlayhead(false);
    setLoading(false);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = (selectedFile: File) => {
    setError("");
    clearResult();

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
      setCurrentTime(audio.currentTime);
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

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;

    if (!audio || !audioUrl || duration <= 0) {
      return;
    }

    if (audio.paused) {
      void audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Playback error:", error);
          setIsPlaying(false);
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seekFromWaveform = (clientX: number) => {
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

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (duration <= 0) {
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

  const handlePresetSelect = (nextFadeIn: string, nextFadeOut: string) => {
    setFadeIn(nextFadeIn);
    setFadeOut(nextFadeOut);
    setDropdownOpen(false);
    clearResult();
  };

  const handleFadeInChange = (value: string) => {
    setFadeIn(value);
    clearResult();
  };

  const handleFadeOutChange = (value: string) => {
    setFadeOut(value);
    clearResult();
  };

  const executeFade = async () => {
    setError("");
    clearResult();

    if (!file) {
      setError("Please upload an audio file first.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fadeIn", fadeIn);
      formData.append("fadeOut", fadeOut);
      formData.append("duration", duration.toString());

      const response = await fetch("/api/audio/fade", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fade processing failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const baseName = sanitizeFileName(file.name);

      setResultBlob(blob);
      setResultUrl(url);
      setFileName(`${baseName}_fade.mp3`);
    } catch (err) {
      console.error("Fade processing error:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const trimmedName = fileName.trim();
    const finalName = trimmedName || "audio-fade.mp3";

    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const selectedPreset =
    FADE_PRESETS.find((p) => p.fadeIn === fadeIn && p.fadeOut === fadeOut) ??
    FADE_PRESETS[1];

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <Activity className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Fade In / Fade Out
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Add smooth fade effects to your audio.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {/* UPLOAD — matches the splitter/compressor/normalizer inline dropzone */}
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

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
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
                  Ready for fade processing
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
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

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      disabled={loading || duration <= 0}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isPlaying
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:text-orange-400"
                      }`}
                      aria-label={isPlaying ? "Pause Preview" : "Play Preview"}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
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
                  src={audioUrl}
                  preload="metadata"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />

                <div
                  ref={waveformRef}
                  onPointerDown={handleWaveformPointerDown}
                  onPointerMove={handleWaveformPointerMove}
                  onPointerUp={handleWaveformPointerUp}
                  onPointerCancel={() => setIsDraggingPlayhead(false)}
                  className={`relative mt-4 touch-none rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 sm:p-5 shadow-inner ${
                    duration > 0
                      ? "cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  <div className="relative h-[76px]">
                    <div className="absolute inset-0 flex items-center justify-between gap-1 px-1">
                      {[
                        12, 24, 40, 18, 32, 54, 20, 14, 22, 38, 48, 16, 28,
                        60, 34, 18, 42, 24, 16, 44, 52, 20, 36, 14, 26, 48,
                        30, 18, 42, 56, 22, 12, 38, 24, 46, 16, 32, 50, 20,
                        14, 28, 44, 34, 18, 52, 22, 12, 40, 26, 36, 14, 24,
                      ].map((height, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-orange-500 transition-all"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>

                    {duration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 z-20 w-[3px] rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.55)] dark:bg-orange-400"
                        style={{
                          left: `${Math.min(
                            100,
                            Math.max(0, (currentTime / duration) * 100)
                          )}%`,
                          transform: "translateX(-50%)",
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-orange-600/70 dark:text-orange-400/70 mt-2 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span className="tracking-[0.2em]">
                      WAVEFORM PREVIEW
                    </span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 relative space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-semibold">Fade Duration Settings</h2>
                    
                  </div>

                  <div className="w-full sm:w-64 relative" ref={dropdownRef}>
                    <label
                      id="fade-preset-label"
                      className="mb-2 block text-xs font-medium text-muted-foreground"
                    >
                      Fade Preset
                    </label>

                    <button
                      type="button"
                      aria-labelledby="fade-preset-label"
                      aria-haspopup="listbox"
                      aria-expanded={dropdownOpen}
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 backdrop-blur-md px-3.5 py-2.5 text-sm font-medium outline-none transition-colors hover:border-orange-500/50 focus:border-orange-500"
                    >
                      <span className="truncate pr-2 whitespace-nowrap capitalize">{selectedPreset?.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {dropdownOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="fade-preset-label"
                        className="absolute top-full mt-2 left-0 z-50 w-full min-w-[12rem] overflow-hidden rounded-2xl border border-border/60 bg-background/75 backdrop-blur-xl shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
                      >
                        <div className="max-h-48 overflow-y-auto p-1.5 bg-transparent rounded-2xl scrollbar-thin scrollbar-thumb-orange-500/50 scrollbar-track-transparent">
                          {FADE_PRESETS.map((preset) => {
                            const isSelected =
                              fadeIn === preset.fadeIn &&
                              fadeOut === preset.fadeOut;
                            return (
                              <div
                                key={preset.label}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handlePresetSelect(preset.fadeIn, preset.fadeOut)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-3 text-sm whitespace-nowrap capitalize transition-colors ${
                                  isSelected
                                    ? "bg-orange-500 text-white font-medium"
                                    : "hover:bg-muted/50 text-foreground"
                                }`}
                              >
                                <span className="whitespace-nowrap">{preset.label}</span>
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

                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 backdrop-blur-md">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Fade In Duration: <span className="text-orange-500 font-semibold">{fadeIn}s</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={fadeIn}
                      onChange={(e) => handleFadeInChange(e.target.value)}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 backdrop-blur-md">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Fade Out Duration: <span className="text-orange-500 font-semibold">{fadeOut}s</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={fadeOut}
                      onChange={(e) => handleFadeOutChange(e.target.value)}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Apply Fade trigger — hidden once a result is ready */}
              {!dropdownOpen && !resultBlob && (
                <button
                  type="button"
                  onClick={executeFade}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying Fade Effects...
                    </>
                  ) : (
                    <>
                      <Sliders className="h-4 w-4" />
                      Apply Fade
                    </>
                  )}
                </button>
              )}

              {/* Inline rename + download — same panel style as the other tools */}
              {resultBlob && resultUrl && (
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
                      htmlFor="resultFileName"
                      className="mb-2 block text-xs font-medium text-muted-foreground"
                    >
                      Rename
                    </label>
                    <input
                      id="resultFileName"
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:flex-none"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}