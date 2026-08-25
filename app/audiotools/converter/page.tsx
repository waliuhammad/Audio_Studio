// app/audiotools/converter/page.tsx
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
  RefreshCw,
  ChevronDown,
  Play,
  Pause,
  Download,
} from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const SUPPORTED_FORMATS = [
  { label: "MP3", value: "mp3" },
  { label: "WAV", value: "wav" },
  { label: "OGG", value: "ogg" },
  { label: "AAC", value: "aac" },
  { label: "FLAC", value: "flac" },
  { label: "M4A", value: "m4a" },
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

export default function AudioConverterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const progressContainerRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [targetFormat, setTargetFormat] = useState("mp3");
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error("Playback error:", err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = progressContainerRef.current;
    if (!audio || !container || duration <= 0) return;

    const rect = container.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

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

    const fileNameLower = selectedFile.name.toLowerCase();

    const validExtension =
      fileNameLower.endsWith(".mp3") ||
      fileNameLower.endsWith(".wav") ||
      fileNameLower.endsWith(".m4a") ||
      fileNameLower.endsWith(".ogg") ||
      fileNameLower.endsWith(".aac") ||
      fileNameLower.endsWith(".flac") ||
      fileNameLower.endsWith(".webm") ||
      fileNameLower.endsWith(".mpeg");

    if (!validExtension) {
      setError(
        "Please upload a valid audio file (MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG)."
      );
      return;
    }

    setFile(selectedFile);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
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

  // Changing the target format invalidates any previous result.
  const handleFormatSelect = (value: string) => {
    setTargetFormat(value);
    setDropdownOpen(false);
    clearResult();
  };

  const executeConversion = async () => {
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
      formData.append("format", targetFormat);

      const response = await fetch("/api/audio/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Conversion failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const baseName = sanitizeFileName(file.name);

      setResultBlob(blob);
      setResultUrl(url);
      setFileName(`${baseName}-converted.${targetFormat}`);
    } catch (err) {
      console.error("Conversion error:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const trimmedName = fileName.trim();
    const finalName = trimmedName || `audio-converted.${targetFormat}`;

    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <FileAudio className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Audio Converter
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Convert audio files between different formats quickly and securely.
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
                  Ready for conversion
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
                      onClick={togglePlay}
                      className="flex items-center gap-2 rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-500 hover:bg-orange-500/20 transition-colors"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3 w-3" /> Pause Preview
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Play Preview
                        </>
                      )}
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
                  className="hidden"
                />

                <div
                  ref={progressContainerRef}
                  onClick={handleSeek}
                  className="relative mt-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 sm:p-5 shadow-inner cursor-pointer group overflow-hidden"
                >
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-orange-600 z-20 pointer-events-none transition-all"
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-1 opacity-90 py-2 pointer-events-none">
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

                  <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-orange-600/70 dark:text-orange-400/70 mt-2 px-1 pointer-events-none">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-semibold">Output format</h2>
                  </div>

                  <div className="w-full sm:w-48 relative" ref={dropdownRef}>
                    <label
                      id="targetFormat-label"
                      className="mb-2 block text-xs font-medium text-muted-foreground"
                    >
                      Convert to
                    </label>

                    <button
                      type="button"
                      aria-labelledby="targetFormat-label"
                      aria-haspopup="listbox"
                      aria-expanded={dropdownOpen}
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium outline-none transition-colors hover:border-orange-500/50 focus:border-orange-500"
                    >
                      <span>{targetFormat.toUpperCase()}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {dropdownOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="targetFormat-label"
                        className="absolute top-full mt-2 left-0 z-50 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
                      >
                        <div className="max-h-60 overflow-y-auto p-1 bg-card">
                          {SUPPORTED_FORMATS.map((fmt) => {
                            const isSelected = targetFormat === fmt.value;
                            return (
                              <div
                                key={fmt.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleFormatSelect(fmt.value)}
                                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                  isSelected
                                    ? "bg-orange-500 text-white font-medium"
                                    : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <span>{fmt.label}</span>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-white" />
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

              {/* Convert trigger — hidden once a result is ready, mirrors the
                  full-width orange "Split & Download ZIP" button styling. */}
              {!dropdownOpen && !resultBlob && (
                <button
                  type="button"
                  onClick={executeConversion}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Converting Audio...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Convert & Download ({targetFormat.toUpperCase()})
                    </>
                  )}
                </button>
              )}

              {/* Inline rename + download — replaces the separate result card.
                  Sits inside the same flow instead of popping a new block. */}
              {resultBlob && resultUrl && (
                <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="font-medium">
                      Converted to {targetFormat.toUpperCase()} — ready to download.
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="resultFileName"
                      className="mb-1.5 block text-xs font-medium text-muted-foreground"
                    >
                      Rename
                    </label>
                    <input
                      id="resultFileName"
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium outline-none transition-colors focus:border-orange-500"
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  
                     <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
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