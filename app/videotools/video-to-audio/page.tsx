// app/videotools/video-to-audio/page.tsx
"use client";

import React, {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  FileVideo,
  Trash2,
  Upload,
  ChevronDown,
  Play,
  Pause,
  Film,
  CheckCircle2,
  Download,
} from "lucide-react";
import { useToolResult } from "@/components/library/ToolResult";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for video

interface AudioFormat {
  label: string;
  extension: string;
}

const AUDIO_FORMATS: AudioFormat[] = [
  { label: "MP3 Audio (.mp3)", extension: "mp3" },
  { label: "WAV Audio (.wav)", extension: "wav" },
  { label: "AAC Audio (.aac)", extension: "aac" },
  { label: "OGG Audio (.ogg)", extension: "ogg" },
  { label: "FLAC Audio (.flac)", extension: "flac" },
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

export default function VideoToAudioPage() {
  const { setResult } = useToolResult();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [convertedAudioUrl, setConvertedAudioUrl] = useState<string | null>(null);
  // Mirrors convertedAudioUrl so the preview effect can revoke the previous
  // blob without taking convertedAudioUrl as a dependency (which would loop).
  const convertedAudioUrlRef = useRef<string | null>(null);
  const [isConvertingPreview, setIsConvertingPreview] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>(AUDIO_FORMATS[0] as AudioFormat);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active audio URL to use for playback (converted format if available, otherwise original extracted/source blob)
  const activeAudioUrl = convertedAudioUrl || audioUrl;

  // Replace the converted preview URL, revoking whatever it displaces.
  const replaceConvertedAudioUrl = useCallback((nextUrl: string | null) => {
    const previous = convertedAudioUrlRef.current;

    if (previous && previous !== nextUrl) {
      URL.revokeObjectURL(previous);
    }

    convertedAudioUrlRef.current = nextUrl;
    setConvertedAudioUrl(nextUrl);
  }, []);

  // Convert/prepare preview stream when format changes or file is loaded
  useEffect(() => {
    let isMounted = true;

    async function generateFormatPreview() {
      if (!file || !audioUrl) {
        replaceConvertedAudioUrl(null);
        return;
      }

      setIsConvertingPreview(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("format", selectedFormat.extension);

        const response = await fetch("/api/video/video-to-audio", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to convert audio preview");
        }

        const blob = await response.blob();
        const newBlobUrl = URL.createObjectURL(blob);

        if (isMounted) {
          replaceConvertedAudioUrl(newBlobUrl);
        } else {
          URL.revokeObjectURL(newBlobUrl);
        }
      } catch (err) {
        console.error("Preview conversion error:", err);
        if (isMounted) {
          replaceConvertedAudioUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsConvertingPreview(false);
        }
      }
    }

    generateFormatPreview();

    return () => {
      isMounted = false;
    };
  }, [file, audioUrl, selectedFormat, replaceConvertedAudioUrl]);

  // Keep the playback time synchronized with the audio element & video element.
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;

    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (video && Math.abs(video.currentTime - audio.currentTime) > 0.3) {
        video.currentTime = audio.currentTime;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      video?.play().catch(() => {});
    };

    const handlePause = () => {
      setIsPlaying(false);
      video?.pause();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      try {
        audio.currentTime = 0;
        if (video) video.currentTime = 0;
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
  }, [activeAudioUrl]);

  // Clean up the object URLs when the component is unmounted.
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (convertedAudioUrl) {
        URL.revokeObjectURL(convertedAudioUrl);
      }
    };
  }, [audioUrl, convertedAudioUrl]);

  const seekToClientX = (clientX: number) => {
    const waveform = waveformRef.current;
    const audio = audioRef.current;
    const video = videoRef.current;

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
      if (video) {
        video.currentTime = newTime;
      }
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
    const video = videoRef.current;

    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      video?.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          video?.play().catch(() => {});
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
      setErrorMessage("File size exceeds 500MB limit.");
      return;
    }

    if (
      !selectedFile.type.includes("video") &&
      !selectedFile.name.match(/\.(mp4|m4v|mov|webm|mkv|avi|ogv)$/i)
    ) {
      setErrorMessage("Please upload a valid video file.");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }

    setFile(selectedFile);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    replaceConvertedAudioUrl(null);

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
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    replaceConvertedAudioUrl(null);

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

  const handleExtractAndDownload = async () => {
    if (!audioUrl || !file) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", selectedFormat.extension);

      const response = await fetch("/api/video/video-to-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to extract audio from video.");
      }

      const blob = await response.blob();
      const baseName = file ? (file.name.substring(0, file.name.lastIndexOf(".")) || file.name) : "audio";

      const defaultFileName = `${baseName}-extracted.${selectedFormat.extension}`;

      // Hand the finished file to the save-to-library bar in the layout.
      setResult({ blob, defaultFileName, extension: selectedFormat.extension, fallbackBaseName: "audio-extracted" });
    } catch (err) {
      console.error(err);

      /**
       * The old fallback downloaded the in-page preview URL under the
       * extracted filename, so a failed extraction still produced a file —
       * the wrong one, silently, in the wrong format. Reporting the failure
       * is the only honest option: there is nothing extracted to hand over.
       */
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not extract the audio. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const playheadPercentage =
    duration > 0
      ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-6 lg:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 rounded-2xl bg-orange-500/10 p-3 text-orange-500">
            <Film className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
            Video to Audio
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-md">
            Extract crystal-clear audio from your video files seamlessly.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 sm:p-8 shadow-sm">
          {errorMessage && (
            <div className="mb-4 sm:mb-6 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-3 sm:p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs sm:text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-12 text-center transition-colors ${
                isDragging
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-border bg-background/50 hover:border-orange-500/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.ogv"
                className="hidden"
              />

              <div className="mb-3 sm:mb-4 rounded-2xl bg-orange-500/10 p-3 sm:p-4 text-orange-500">
                <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>

              <h3 className="mb-1 text-base sm:text-lg font-semibold">
                Upload Video File
              </h3>

              <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground max-w-xs sm:max-w-none">
                Drag and drop your video file here, or tap/click to browse
              </p>

              <span className="rounded-full bg-muted px-3 py-1.5 text-[10px] sm:text-xs text-muted-foreground">
                Supports MP4, MOV, WEBM, MKV, AVI (Max 500MB)
              </span>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl border border-border bg-background/40 p-3 sm:p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <FileVideo className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm sm:text-base font-semibold">{file.name}</p>

                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {formatTime(duration)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 border-t pt-2 sm:border-t-0 sm:pt-0 border-border/60">
                    <button
                      type="button"
                      onClick={togglePlayOriginal}
                      disabled={!audioUrl || duration <= 0 || isConvertingPreview}
                      className="flex flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-500/10 px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-orange-500 transition-colors hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isConvertingPreview ? (
                        <span>Updating...</span>
                      ) : isPlaying ? (
                        <>
                          <Pause className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">Pause {selectedFormat.extension.toUpperCase()} preview</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">Play {selectedFormat.extension.toUpperCase()} preview</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={removeFile}
                      className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Video Preview Element */}
                {audioUrl && (
                  <div className="mb-4 overflow-hidden rounded-xl border border-border bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center shadow-inner max-h-[320px]">
                    <video
                      ref={videoRef}
                      src={audioUrl}
                      className="max-h-[300px] w-auto object-contain rounded-lg pointer-events-none"
                      muted
                      playsInline
                    />
                  </div>
                )}

                {/* Hidden Audio Element */}
                {activeAudioUrl && (
                  <audio
                    ref={audioRef}
                    src={activeAudioUrl}
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
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
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
                  className={`relative mt-4 touch-none overflow-hidden rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 sm:p-6 shadow-inner ${
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
                        boxShadow: "0 0 8px rgba(234, 88, 12, 0.45)",
                      }}
                    />
                  )}

                  {/* Waveform Bars */}
                  <div className="relative z-10 flex items-center justify-between gap-1 py-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-orange-500 transition-all"
                        style={{
                          height: `${(((i * 7) % 5) * 5 + 16)}px`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Time Labels */}
                  <div className="relative z-10 mt-2 flex items-center justify-between px-1 text-[11px] sm:text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Output Format Settings Card */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-foreground">
                    Output Audio Format
                  </h2>
                </div>

                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`flex w-full sm:w-auto items-center justify-between gap-3 whitespace-nowrap rounded-xl border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors ${
                      dropdownOpen
                        ? "border-orange-500 ring-2 ring-orange-500/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="truncate">{selectedFormat.label}</span>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 sm:right-0 top-full z-[9999] mt-2 max-h-40 w-full sm:w-64 space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-white p-2 text-foreground shadow-2xl dark:bg-zinc-900 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#FFFDD0] hover:[&::-webkit-scrollbar-thumb]:bg-[#FFFDD0]">
                      {AUDIO_FORMATS.map((fmt) => {
                        const isSelected = fmt.extension === selectedFormat.extension;

                        return (
                          <div
                            key={fmt.extension}
                            onClick={() => {
                              setSelectedFormat(fmt);
                              setDropdownOpen(false);
                            }}
                            className={`flex cursor-pointer items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="truncate">{fmt.label}</span>

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

              {/* Bottom Action Button */}
              <div className="flex flex-col sm:flex-row justify-end pt-2">
                <button
                  type="button"
                  onClick={handleExtractAndDownload}
                  disabled={isProcessing}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {isProcessing ? "Extracting Audio..." : "Extract & Download Audio"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}