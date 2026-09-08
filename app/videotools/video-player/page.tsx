"use client";

import React, { useState, useRef, useEffect, useMemo, ChangeEvent, DragEvent } from "react";
import {
  Upload,
  Play,
  Pause,
  Film,
  Volume2,
  VolumeX,
  Maximize2,
  FileVideo,
  ChevronDown,
  RefreshCw,
  Download,
  CheckCircle2,
} from "lucide-react";

const MAX_FILE_SIZE = 500 * 1024 * 1024;

interface RulerTick {
  time: number;
  major: boolean;
}

function getMajorRulerInterval(duration: number): number {
  if (duration <= 10) return 1;
  if (duration <= 30) return 5;
  if (duration <= 60) return 10;
  if (duration <= 120) return 15;
  if (duration <= 300) return 30;
  if (duration <= 600) return 60;
  if (duration <= 1800) return 120;
  if (duration <= 3600) return 300;
  if (duration <= 7200) return 600;
  return 900;
}

export default function VideoPlayerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Server-backed stream state (set once "Initialize Video Stream" succeeds)
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  /* =========================================================
     INLINE DOWNLOAD STATE
     Mirrors the Video Trimmer tool's inline rename + download
     panel — shown once a stream is ready.
  ========================================================= */
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const clearDownloadState = () => {
    setDownloadBlob(null);
    setDownloadFileName("");
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const speedDropdownRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Create object URL when file changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackRate(1);
      setIsMuted(false);
      setStreamUrl(null);
      clearDownloadState();
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [selectedFile]);

  // Close speed dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processFile = (file: File) => {
    setError("");
    setNotice("");
    if (file.size > MAX_FILE_SIZE) {
      setError("File is larger than the 500 MB limit.");
      return;
    }

    const fileName = file.name.toLowerCase();
    const validExtension =
      fileName.endsWith(".mp4") ||
      fileName.endsWith(".mov") ||
      fileName.endsWith(".webm") ||
      fileName.endsWith(".avi") ||
      fileName.endsWith(".mkv") ||
      fileName.includes("video");

    if (!validExtension) {
      setError("Please upload a valid video file (MP4, MOV, WEBM, AVI, MKV).");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error("Playback error:", err);
        setIsPlaying(false);
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    videoRef.current.muted = newMutedState;
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      if (Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
        setDuration(videoRef.current.duration);
      }
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !videoRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const formatRulerLabel = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const rulerTicks: RulerTick[] = useMemo(() => {
    if (duration <= 0) return [];

    const majorInterval = getMajorRulerInterval(duration);
    const ticks: RulerTick[] = [];
    const epsilon = majorInterval / 100;

    for (let t = 0; t <= duration + epsilon; t += majorInterval) {
      ticks.push({ time: Math.min(t, duration), major: true });
    }

    const last = ticks[ticks.length - 1];
    if (!last || duration - last.time > epsilon) {
      ticks.push({ time: duration, major: true });
    }

    return ticks;
  }, [duration]);

  const handleAction = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError("");
    setNotice("");
    clearDownloadState();

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/video/video-player", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Playback initialization failed");
      }

      const data = await response.json();
      setNotice(data.message || "Video processed successfully.");

      // Swap to the server-backed stream (Range-request capable) and
      // preserve current playback position/state across the swap.
      if (data.streamUrl) {
        const wasPlaying = isPlaying;
        const resumeAt = currentTime;
        setStreamUrl(data.streamUrl);
        setVideoUrl(data.streamUrl);
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = resumeAt;
            if (wasPlaying) videoRef.current.play().catch(() => {});
          }
        });
      }

      // The stream is now ready — surface the download panel.
      // We already have the exact bytes client-side in selectedFile,
      // so no extra fetch is needed to build the download.
      const baseName =
        selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) ||
        selectedFile.name;
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")) || ".mp4";

      setDownloadBlob(selectedFile);
      setDownloadFileName(`${baseName}-stream${ext}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred while processing the video.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================================================
     DOWNLOAD HANDLER
     Triggers the browser download for the ready blob, using
     whatever name the user typed into the rename field.
  ========================================================= */
  const handleFinalDownload = () => {
    if (!downloadBlob) return;

    const fallbackExt = selectedFile?.name.match(/\.[^.]+$/)?.[0] || ".mp4";
    let finalName = downloadFileName.trim() || `video-stream${fallbackExt}`;
    if (!/\.[a-zA-Z0-9]+$/.test(finalName)) {
      finalName = `${finalName}${fallbackExt}`;
    }

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">

        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <FileVideo className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Video Player
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Play and preview your video files.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">

          {!selectedFile && (
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
                className="hidden"
                accept="video/*,.mp4,.mov,.webm,.avi,.mkv"
                onChange={handleFileChange}
              />
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>
              <h2 className="text-lg font-semibold">Upload your video</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your file here or click to browse
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                MP4, MOV, WEBM, AVI, MKV • Max 500 MB
              </p>
            </div>
          )}

          {selectedFile && videoUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">

              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/40 p-4 sm:p-5 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                    <FileVideo className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm sm:text-base">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {streamUrl ? "Streaming from server" : "Ready for playback"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500 shadow-sm flex-shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Upload Different Video</span>
                </button>
              </div>

              <div ref={playerContainerRef} className="relative z-50 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-inner">
                <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
                  <span>Video Preview Screen</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>

                <div className="mx-auto max-w-xl">
                  <div className="relative h-48 md:h-60 overflow-hidden rounded-xl border border-border bg-muted shadow-md flex flex-col items-center justify-center group">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      className="h-full w-full cursor-pointer object-contain"
                      onClick={togglePlay}
                    />

                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40 pointer-events-none">
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg pointer-events-auto transition-transform transform hover:scale-105 hover:bg-orange-400"
                        >
                          <Play className="h-6 w-6 fill-current ml-1 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mx-auto max-w-xl space-y-1 pt-1">
                  <div
                    ref={scrubberRef}
                    onClick={handleScrubberClick}
                    className="relative h-3 cursor-pointer overflow-hidden rounded-full bg-muted border border-border"
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 rounded-full bg-orange-500 transition-all pointer-events-none"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {duration > 0 && rulerTicks.length > 0 && (
                    <div className="relative h-4 pt-1">
                      {rulerTicks.map((tick, idx) => {
                        const pct = (tick.time / duration) * 100;
                        const isFirst = idx === 0;
                        const isLast = idx === rulerTicks.length - 1;

                        return (
                          <span
                            key={`${tick.time}-${idx}`}
                            className="absolute top-1 whitespace-nowrap text-[11px] font-medium text-sky-400"
                            style={{
                              left: `${pct}%`,
                              transform: isFirst
                                ? "translateX(0%)"
                                : isLast
                                ? "translateX(-100%)"
                                : "translateX(-50%)",
                            }}
                          >
                            {formatRulerLabel(tick.time)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mx-auto flex max-w-xl items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex items-center space-x-1.5 rounded-xl bg-orange-500 px-3 py-1.5 font-semibold text-white transition-all shadow-sm hover:bg-orange-600"
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                    </button>

                    <button
                      onClick={toggleMute}
                      type="button"
                      className="p-1 transition-colors focus:outline-none"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 text-orange-500 hover:text-orange-400" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>

                  <div className="relative flex items-center space-x-3">
                    <div className="relative" ref={speedDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                        className="flex cursor-pointer items-center space-x-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-400 transition-colors focus:outline-none focus:border-orange-400"
                      >
                        <span>{playbackRate}x</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>

                      {isSpeedOpen && (
                        <div className="absolute top-full right-0 mt-2 w-28 rounded-xl border border-border bg-white dark:bg-zinc-900 text-foreground shadow-2xl z-[99999] isolate opacity-100">
                          <div className="flex flex-col rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                            {speedOptions.map((speed) => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => {
                                  setPlaybackRate(speed);
                                  if (videoRef.current) {
                                    videoRef.current.playbackRate = speed;
                                  }
                                  setIsSpeedOpen(false);
                                }}
                                className={`w-full px-3.5 py-2 text-left text-xs font-medium transition-colors bg-white dark:bg-zinc-900 ${
                                  playbackRate === speed
                                    ? "bg-orange-500/20 font-bold text-orange-500"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <span>1080p</span>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="p-1 transition-colors focus:outline-none"
                      title="Toggle Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4 cursor-pointer hover:text-foreground" />
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <span>{error}</span>
                </div>
              )}

              {notice && !error && !downloadBlob && (
                <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 p-4 text-sm text-teal">
                  <span>{notice}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-2 relative z-10">
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                >
                  {isProcessing ? (
                    <span>Processing Video...</span>
                  ) : (
                    <>
                      <Film className="h-4 w-4" />
                      <span>Initialize Video Stream</span>
                    </>
                  )}
                </button>
              </div>

              {/* INLINE RENAME + DOWNLOAD PANEL — matches the Video Trimmer tool */}
              {downloadBlob && (
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Your stream is ready
                      </p>
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
          )}
        </div>
      </div>
    </main>
  );
}