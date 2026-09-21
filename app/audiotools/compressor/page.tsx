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
  Sliders,
  ChevronDown,
  Play,
  Pause,
  Download,
} from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type Option = { label: string; value: string };

// Quality = bitrate. Must stay in sync with BITRATES in the /api/audio/compress route.
const QUALITY_OPTIONS: Option[] = [
  { label: "Highest Quality (320 kbps)", value: "320" },
  { label: "High Quality (192 kbps)", value: "192" },
  { label: "Standard (128 kbps)", value: "128" },
  { label: "Compressed (96 kbps)", value: "96" },
];

const DEFAULT_QUALITY = "128";

// Compression = sample rate + channel reduction, independent of bitrate.
// Must stay in sync with COMPRESSION_LEVELS in the /api/audio/compress route.
const COMPRESSION_OPTIONS: Option[] = [
  { label: "Low (44.1 kHz, Stereo)", value: "low" },
  { label: "Medium (32 kHz, Stereo)", value: "medium" },
  { label: "High (22 kHz, Mono)", value: "high" },
  { label: "Max (16 kHz, Mono)", value: "max" },
];

const DEFAULT_COMPRESSION = "low";

type FormatOption = { label: string; value: string; ext: string; lossy: boolean };

// Output format options (6 items) — must stay in sync with FORMATS in the route.
const FORMAT_OPTIONS: FormatOption[] = [
  { label: "MP3 (.mp3)", value: "mp3", ext: "mp3", lossy: true },
  { label: "M4A / AAC (.m4a)", value: "m4a", ext: "m4a", lossy: true },
  { label: "AAC (.aac)", value: "aac", ext: "aac", lossy: true },
  { label: "OGG Vorbis (.ogg)", value: "ogg", ext: "ogg", lossy: true },
  { label: "WAV (.wav)", value: "wav", ext: "wav", lossy: false },
  { label: "FLAC (.flac)", value: "flac", ext: "flac", lossy: false },
];

const DEFAULT_FORMAT_OPTION: FormatOption = FORMAT_OPTIONS[0]!;

function getFormatOption(value: string): FormatOption {
  return FORMAT_OPTIONS.find((f) => f.value === value) ?? DEFAULT_FORMAT_OPTION;
}

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

/*
 * Inlined dropdown: owns its own open/close state and its own click-outside
 * listener (scoped to its own ref). Each instance rendered below (Format /
 * Quality / Compression) is fully independent of its siblings, so opening
 * one never affects, blocks, or is blocked by another.
 */
function Dropdown({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (nextValue: string) => {
    setOpen(false);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="mb-2 block text-xs font-medium text-muted-foreground">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors hover:border-orange-500/50 focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-500/10 ${
                  option.value === value
                    ? "font-semibold text-orange-500"
                    : "text-foreground"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AudioCompressorPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressContainerRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [format, setFormat] = useState("mp3");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [compression, setCompression] = useState(DEFAULT_COMPRESSION);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inline "ready to download" state — replaces the separate result card.
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

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
      audioRef.current.currentTime = 0;
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
    setFormat("mp3");
    setQuality(DEFAULT_QUALITY);
    setCompression(DEFAULT_COMPRESSION);

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

    const name = selectedFile.name.toLowerCase();

    const validExtension =
      name.endsWith(".mp3") ||
      name.endsWith(".wav") ||
      name.endsWith(".m4a") ||
      name.endsWith(".ogg") ||
      name.endsWith(".aac") ||
      name.endsWith(".flac") ||
      name.endsWith(".webm") ||
      name.endsWith(".mpeg");

    if (!validExtension) {
      setError(
        "Please upload a valid audio file (MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG)."
      );
      return;
    }

    setFile(selectedFile);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);

    const newUrl = URL.createObjectURL(selectedFile);
    setAudioUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return newUrl;
    });
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

  /*
   * Takes explicit overrides so a dropdown selection can re-run compression
   * immediately: setState is async, so reading state here would still see
   * the value from before the click.
   */
  const executeCompression = async (overrides?: {
    format?: string;
    quality?: string;
    compression?: string;
  }) => {
    const useFormat = overrides?.format ?? format;
    const useQuality = overrides?.quality ?? quality;
    const useCompression = overrides?.compression ?? compression;

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
      formData.append("format", useFormat);
      formData.append("bitrate", useQuality);
      formData.append("compression", useCompression);

      const response = await fetch("/api/audio/compress", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Compression failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const baseName = sanitizeFileName(file.name);
      const selectedFormat = getFormatOption(useFormat);

      setResultBlob(blob);
      setResultUrl(url);
      setFileName(`${baseName}_compressed.${selectedFormat.ext}`);
    } catch (err) {
      console.error("Compression error:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /*
   * Format / Quality / Compression each re-run compression immediately
   * if a result already exists, so the downloadable file always matches
   * whatever is currently selected — true real-time behavior, not just
   * "pick everything, then click Compress once."
   */
  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    if (resultBlob) void executeCompression({ format: newFormat });
  };

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality);
    if (resultBlob) void executeCompression({ quality: newQuality });
  };

  const handleCompressionChange = (newCompression: string) => {
    setCompression(newCompression);
    if (resultBlob) void executeCompression({ compression: newCompression });
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const selectedFormat = getFormatOption(format);
    const trimmedName = fileName.trim();
    const finalName = trimmedName || `audio-compressed.${selectedFormat.ext}`;

    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    reset();
  };

  const selectedFormat = getFormatOption(format);
  const isLossless = !selectedFormat.lossy;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <Sliders className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Audio Compressor
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Reduce file size while maintaining good quality.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {/* UPLOAD */}
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

          {file && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Selected Files & Preview (1)
                </h2>
                <span className="text-xs text-muted-foreground">
                  Ready for compression
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
                          <Pause className="h-3 w-3" /> Pause
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

                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    onLoadedMetadata={handleLoadedMetadata}
                    className="hidden"
                  />
                )}

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
                    <span />
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Format / Quality (bitrate) / Compression (sample rate +
                  channels) — three independent dropdowns, each self-managed.
                  Any of them re-compresses immediately if a result already
                  exists, so the downloadable file always matches the
                  current selection. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Dropdown
                  label="Format"
                  options={FORMAT_OPTIONS}
                  value={format}
                  onChange={handleFormatChange}
                  disabled={loading}
                />
                <Dropdown
                  label="Quality"
                  options={QUALITY_OPTIONS}
                  value={quality}
                  onChange={handleQualityChange}
                  disabled={loading}
                />
                <Dropdown
                  label="Compression"
                  options={COMPRESSION_OPTIONS}
                  value={compression}
                  onChange={handleCompressionChange}
                  disabled={loading}
                />
              </div>

              {isLossless && (
                <p className="text-xs text-muted-foreground -mt-3">
                  {selectedFormat.label} is lossless — the Quality (bitrate) preset above is ignored for this format. Compression still applies.
                </p>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Compress trigger — hidden once a result is ready */}
              {!resultBlob && (
                <button
                  type="button"
                  onClick={() => void executeCompression()}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compressing Audio...
                    </>
                  ) : (
                    <>
                      <Sliders className="h-4 w-4" />
                      Compress Audio
                    </>
                  )}
                </button>
              )}

              {/* Inline rename + download */}
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