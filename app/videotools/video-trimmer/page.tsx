"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  Scissors,
  FileVideo,
  RefreshCw,
  Download,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { RangeHandleLayer } from "@/components/audio/RangeHandleLayer";

export default function VideoTrimmerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Trim / Cut time range states (in seconds)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Free-typing string states for manual text input fields
  const [startInput, setStartInput] = useState("0");
  const [endInput, setEndInput] = useState("0");

  // Quality dropdown selection state (4+ quality options)
  const [targetQuality, setTargetQuality] = useState("1080p");
  const [isQualityOpen, setIsQualityOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [trimmedFileUrl, setTrimmedFileUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close custom dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        qualityDropdownRef.current &&
        !qualityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsQualityOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Decorative waveform amplitude bars
  const waveformBars = Array.from({ length: 48 }, (_, i) => {
    return Math.sin(i * 0.4) * 25 + Math.cos(i * 0.2) * 15 + 45;
  });

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setTrimmedFileUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setStartTime(0);
      setStartInput("0");

      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [selectedFile]);

  // Sync inputs when startTime or endTime change programmatically
  useEffect(() => {
    setStartInput(startTime.toFixed(1));

    if (
      videoRef.current &&
      Math.abs(videoRef.current.currentTime - startTime) > 0.5
    ) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  }, [startTime]);

  useEffect(() => {
    setEndInput(endTime.toFixed(1));
  }, [endTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
      setEndInput(dur.toFixed(1));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setErrorMessage(null);
      clearDownloadState();
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      setErrorMessage(null);
      clearDownloadState();
      setSelectedFile(droppedFile);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (
        videoRef.current.currentTime >= endTime ||
        videoRef.current.currentTime < startTime
      ) {
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }

      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      if (time >= endTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
        setIsPlaying(false);
      }
    }
  };

  const handleWaveformClick = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!waveformRef.current || !videoRef.current || !duration) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(
      0,
      Math.min(1, clickX / rect.width)
    );
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRangeSeek = (time: number) => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleStartTimeChange = (time: number) => {
    const nextStart = Math.max(
      0,
      Math.min(time, Math.max(0, endTime - 0.1))
    );

    setStartTime(nextStart);
    setStartInput(nextStart.toFixed(1));

    if (
      videoRef.current &&
      videoRef.current.currentTime < nextStart
    ) {
      handleRangeSeek(nextStart);
    }
  };

  const handleEndTimeChange = (time: number) => {
    const nextEnd = Math.min(
      duration,
      Math.max(startTime + 0.1, time)
    );

    setEndTime(nextEnd);
    setEndInput(nextEnd.toFixed(1));

    if (
      videoRef.current &&
      videoRef.current.currentTime > nextEnd
    ) {
      handleRangeSeek(startTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";

    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);

    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const qualityOptions = [
    {
      value: "4k",
      label: "4K Ultra HD (Highest Quality)",
    },
    {
      value: "1080p",
      label: "1080p Full HD (Recommended)",
    },
    {
      value: "720p",
      label: "720p HD (Balanced Size)",
    },
    {
      value: "480p",
      label: "480p SD (Fastest Conversion)",
    },
  ];

  const handleQualitySelect = (value: string) => {
    setTargetQuality(value);
    setIsQualityOpen(false);

    // A previously trimmed result no longer matches the new quality.
    clearDownloadState();
  };

  const handleTrimAction = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    clearDownloadState();
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("startTime", startTime.toString());
    formData.append("endTime", endTime.toString());
    formData.append("quality", targetQuality);

    try {
      const response = await fetch(
        "/api/video/video-trimmer",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Trimming failed");
      }

      const resultBlob = await response.blob();
      const blobUrl = URL.createObjectURL(resultBlob);

      setTrimmedFileUrl(blobUrl);

      const baseName =
        selectedFile.name.substring(
          0,
          selectedFile.name.lastIndexOf(".")
        ) || "video";

      const defaultFileName = `${baseName}-trimmed.mp4`;

      setDownloadBlob(resultBlob);
      setDownloadFileName(defaultFileName);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not trim that video. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================================================
     DOWNLOAD HANDLER
     Triggers the browser download for the trimmed blob,
     using whatever name the user typed in the rename field.
     (Matches the original: output is always handed back as .mp4,
     regardless of the selected target format.)
  ========================================================= */

  const handleFinalDownload = () => {
    if (!downloadBlob) {
      return;
    }

    const trimmedName =
      downloadFileName.trim() || "video-trimmed.mp4";

    const finalName = trimmedName
      .toLowerCase()
      .endsWith(".mp4")
      ? trimmedName
      : `${trimmedName}.mp4`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const progressPercentage =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  const trimStartPercent =
    duration > 0
      ? (startTime / duration) * 100
      : 0;

  const trimEndPercent =
    duration > 0
      ? (endTime / duration) * 100
      : 100;

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/30 shadow-sm">
            <Scissors className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Video Trimmer
          </h1>

          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Trim your video and keep the selected segment with frame-accurate timeline control.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {errorMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {!selectedFile && (
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
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>

              <h2 className="text-lg font-semibold">
                Upload your video to trim
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your file here or click to browse
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                MP4, MOV, WEBM, MKV • Max 500 MB
              </p>
            </div>
          )}

          {selectedFile && videoUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-background/60 border border-border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/30 flex-shrink-0">
                    <FileVideo className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">
                      Source File
                    </span>

                    <span className="text-sm font-semibold truncate block">
                      {selectedFile.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setErrorMessage(null);
                    clearDownloadState();
                  }}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-secondary border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Video</span>
                </button>
              </div>

              {/* Video Player & Waveform Studio Panel */}
              <div className="bg-background rounded-2xl overflow-hidden p-5 shadow-inner space-y-4 border border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
                  <span>
                    Previewing Selected Segment (
                    {formatTime(startTime)} -{" "}
                    {formatTime(endTime)}
                    )
                  </span>

                  <span>
                    {formatTime(currentTime)} /{" "}
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Video Display Box */}
                <div className="max-w-xl mx-auto">
                  <div className="relative h-48 md:h-60 bg-muted/40 dark:bg-stone-950 rounded-xl flex flex-col items-center justify-center border border-border overflow-hidden group shadow-md">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={togglePlay}
                    />

                    {!isPlaying && (
                      <div className="absolute inset-0 bg-background/20 dark:bg-stone-950/40 flex items-center justify-center pointer-events-none">
                        <button
                          onClick={togglePlay}
                          className="w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center pointer-events-auto transition-transform transform hover:scale-105 shadow-lg"
                        >
                          <Play className="w-6 h-6 fill-current ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Waveform Scrubber */}
                <div className="max-w-xl mx-auto pt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Interactive Waveform</span>
                    <span>Click anywhere to jump position</span>
                  </div>

                  <div
                    ref={waveformRef}
                    className="relative h-16 bg-card rounded-xl border border-border px-3 flex items-center justify-between cursor-pointer overflow-hidden group touch-none"
                  >
                    <div
                      className="absolute top-0 bottom-0 bg-orange-500/20 border-x border-orange-500/50 pointer-events-none transition-all"
                      style={{
                        left: `${trimStartPercent}%`,
                        width: `${Math.max(
                          0,
                          trimEndPercent - trimStartPercent
                        )}%`,
                      }}
                    />

                    {waveformBars.map((height, idx) => {
                      const barProgress =
                        (idx / waveformBars.length) * 100;

                      const inTrimRange =
                        barProgress >= trimStartPercent &&
                        barProgress <= trimEndPercent;

                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-colors pointer-events-none ${
                            inTrimRange
                              ? "bg-orange-500 shadow-sm shadow-orange-500/50"
                              : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                          }`}
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      );
                    })}

                    <RangeHandleLayer
                      duration={duration}
                      startTime={startTime}
                      endTime={endTime}
                      currentTime={currentTime}
                      onStartChange={handleStartTimeChange}
                      onEndChange={handleEndTimeChange}
                      onSeek={handleRangeSeek}
                    />
                  </div>
                </div>
              </div>

              {/* Trimming Time Inputs Panel */}
              <div className="bg-background/60 border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <Scissors className="w-4 h-4 text-orange-500" />
                    <span>Clip Range Selection</span>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    Selected Duration:{" "}
                    <strong className="text-foreground">
                      {formatTime(
                        Math.max(0, endTime - startTime)
                      )}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">

                  {/* Start Time Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider">
                        Start Time
                      </label>

                      <button
                        type="button"
                        onClick={() => setStartTime(currentTime)}
                        className="text-orange-500 hover:underline font-medium truncate ml-1"
                      >
                        Set Current ({formatTime(currentTime)})
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={startInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartInput(val);

                          const parsed = parseFloat(val);

                          if (!isNaN(parsed)) {
                            setStartTime(
                              Math.max(
                                0,
                                Math.min(
                                  parsed,
                                  Math.max(0, endTime - 0.1)
                                )
                              )
                            );
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(startInput);

                          if (isNaN(parsed)) {
                            setStartInput(
                              startTime.toFixed(1)
                            );
                          } else {
                            const clamped = Math.max(
                              0,
                              Math.min(parsed, endTime)
                            );

                            setStartTime(clamped);
                            setStartInput(
                              clamped.toFixed(1)
                            );
                          }
                        }}
                        className="w-full bg-card border border-border rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus:border-orange-500 shadow-sm"
                      />

                      <span className="text-[11px] text-muted-foreground font-medium hidden md:inline">
                        sec
                      </span>
                    </div>
                  </div>

                  {/* End Time Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider">
                        End Time
                      </label>

                      <button
                        type="button"
                        onClick={() => setEndTime(currentTime)}
                        className="text-orange-500 hover:underline font-medium truncate ml-1"
                      >
                        Set Current ({formatTime(currentTime)})
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={endInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEndInput(val);

                          const parsed = parseFloat(val);

                          if (!isNaN(parsed)) {
                            setEndTime(
                              Math.min(
                                duration,
                                Math.max(
                                  startTime + 0.1,
                                  parsed
                                )
                              )
                            );
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(endInput);

                          if (isNaN(parsed)) {
                            setEndInput(
                              endTime.toFixed(1)
                            );
                          } else {
                            const clamped = Math.min(
                              duration,
                              Math.max(
                                startTime + 0.1,
                                parsed
                              )
                            );

                            setEndTime(clamped);
                            setEndInput(
                              clamped.toFixed(1)
                            );
                          }
                        }}
                        className="w-full bg-card border border-border rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus:border-orange-500 shadow-sm"
                      />

                      <span className="text-[11px] text-muted-foreground font-medium hidden md:inline">
                        sec
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Video Quality Settings Panel */}
              <div className="bg-background/60 border border-border rounded-2xl p-5 space-y-5 shadow-sm">

                {/* Target Quality Custom Downward Dropdown */}
                <div
                  className="space-y-2 relative pt-3 border-t border-border"
                  ref={qualityDropdownRef}
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Target Video Quality
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsQualityOpen(!isQualityOpen);
                    }}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold flex items-center justify-between focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                  >
                    <span>
                      {
                        qualityOptions.find(
                          (q) => q.value === targetQuality
                        )?.label
                      }
                    </span>
                  </button>

                  {/* Solid Adaptive Layered Dropdown Container */}
                  {isQualityOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl overflow-hidden z-50 isolate animate-in fade-in slide-in-from-top-2 duration-150">
                      {qualityOptions.map((opt) => {
                        const isSelected =
                          targetQuality === opt.value;

                        return (
                          <div
                            key={opt.value}
                            onClick={() =>
                              handleQualitySelect(opt.value)
                            }
                            className={`px-4 py-3 text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected
                                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border-l-4 border-orange-500"
                                : "hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-900 dark:text-stone-200"
                            }`}
                          >
                            <span>{opt.label}</span>

                            {isSelected && (
                              <span className="text-orange-600 dark:text-orange-400 font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* PROCESS & DOWNLOAD */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleTrimAction}
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {`Trimming & Converting Video (${formatTime(
                        startTime
                      )} - ${formatTime(endTime)})...`}
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4" />
                      Trim Video Clip Now
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
                        <p className="text-sm font-semibold">
                          Your file is ready
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
                        onChange={(event) =>
                          setDownloadFileName(
                            event.target.value
                          )
                        }
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
    </div>
  );
}