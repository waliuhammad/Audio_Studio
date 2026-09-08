"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  Scissors,
  FileVideo,
  RefreshCw,
  Check,
  ArrowRight,
  Download,
  Sliders,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Trim time range states (in seconds)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Free-typing string states for manual text input fields
  const [startInput, setStartInput] = useState("0");
  const [endInput, setEndInput] = useState("0");

  // Output format selection dropdown state (6+ formats including gif)
  const [targetFormat, setTargetFormat] = useState("mp4");
  const [isFormatOpen, setIsFormatOpen] = useState(false);

  // Quality dropdown selection state (4+ quality options)
  const [targetQuality, setTargetQuality] = useState("1080p");
  const [isQualityOpen, setIsQualityOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedFileUrl, setConvertedFileUrl] = useState<string | null>(null);
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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(event.target as Node)) {
        setIsFormatOpen(false);
      }
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(event.target as Node)) {
        setIsQualityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setConvertedFileUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setStartTime(0);
      setStartInput("0");
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [selectedFile]);

  // Sync string inputs when startTime changes programmatically
  useEffect(() => {
    setStartInput(startTime.toFixed(1));
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
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
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

      if (isPlaying && time >= endTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
        setIsPlaying(false);
      }
    }
  };

  // Click anywhere on the progress bar to seek — same idea as the old
  // waveform click-to-seek, just against a plain track instead of bars.
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !duration) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  /* =========================================================
     TIME RULER MARKERS
     Auto-scales the tick spacing to the video's length so short
     clips get second-level marks and longer videos get
     minute-level marks, aiming for roughly 6-9 ticks total.
  ========================================================= */
  const timeMarkers = React.useMemo(() => {
    if (!duration || !isFinite(duration) || duration <= 0) return [];

    const targetMarkerCount = 8;
    const rough = duration / targetMarkerCount;
    const niceSteps: number[] = [
      1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600,
    ];
    const fallbackInterval = 3600;
    const interval: number =
      niceSteps.find((s) => rough <= s) ?? fallbackInterval;

    const marks: number[] = [];
    for (let t = 0; t <= duration; t += interval) {
      marks.push(t);
    }

    // Make sure the end of the clip is always represented, but avoid
    // crowding a duplicate label right on top of the previous one.
    const lastMark = marks.length > 0 ? marks[marks.length - 1] : undefined;
    if (lastMark === undefined || lastMark < duration - interval * 0.5) {
      marks.push(duration);
    }

    return marks;
  }, [duration]);

  const formatOptions = [
    { value: "mp4", label: "MP4 (MPEG-4 Video)" },
    { value: "webm", label: "WEBM (Web Optimized Video)" },
    { value: "mov", label: "MOV (QuickTime Video)" },
    { value: "mkv", label: "MKV (Matroska Video)" },
    { value: "avi", label: "AVI (Audio Video Interleave)" },
    { value: "gif", label: "GIF (Animated Image)" },
  ];

  const qualityOptions = [
    { value: "4k", label: "4K Ultra HD (Highest Quality)" },
    { value: "1080p", label: "1080p Full HD (Recommended)" },
    { value: "720p", label: "720p HD (Balanced Size)" },
    { value: "480p", label: "480p SD (Fastest Conversion)" },
  ];

  const handleFormatSelect = (value: string) => {
    setTargetFormat(value);
    setIsFormatOpen(false);
    // A previously converted result no longer matches the new format.
    clearDownloadState();
  };

  const handleQualitySelect = (value: string) => {
    setTargetQuality(value);
    setIsQualityOpen(false);
    // A previously converted result no longer matches the new quality.
    clearDownloadState();
  };

  const handleConvertAndTrimAction = async () => {
    if (!selectedFile) return;
    setErrorMessage(null);
    clearDownloadState();
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("startTime", startTime.toString());
    formData.append("endTime", endTime.toString());
    formData.append("format", targetFormat);
    formData.append("quality", targetQuality);

    try {
      const response = await fetch("/api/video/video-converter", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Conversion and trimming failed");

      const resultBlob = await response.blob();
      const blobUrl = URL.createObjectURL(resultBlob);
      setConvertedFileUrl(blobUrl);

      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "video";
      const defaultFileName = `${baseName}-converted.${targetFormat}`;

      setDownloadBlob(resultBlob);
      setDownloadFileName(defaultFileName);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not convert that video. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (convertedFileUrl) {
      URL.revokeObjectURL(convertedFileUrl);
    }
    setSelectedFile(null);
    setVideoUrl(null);
    setStartTime(0);
    setEndTime(0);
    setStartInput("0");
    setEndInput("0");
    setTargetFormat("mp4");
    setIsFormatOpen(false);
    setTargetQuality("1080p");
    setIsQualityOpen(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsProcessing(false);
    setConvertedFileUrl(null);
    setIsDragging(false);
    setErrorMessage(null);
    setDownloadBlob(null);
    setDownloadFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =========================================================
     DOWNLOAD HANDLER
     Triggers the browser download for the converted blob,
     using whatever name the user typed in the rename field.
  ========================================================= */

  const handleFinalDownload = () => {
    if (!downloadBlob) {
      return;
    }

    const trimmedName =
      downloadFileName.trim() || `video-converted.${targetFormat}`;
    const finalName = trimmedName.toLowerCase().endsWith(`.${targetFormat}`)
      ? trimmedName
      : `${trimmedName}.${targetFormat}`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    reset();
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/20 shadow-sm">
            <Sliders className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Video Converter
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Convert your video format and extract precisely trimmed segments with custom preview control.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-card rounded-2xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {errorMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
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

              <h2 className="text-lg font-semibold">Upload your video file</h2>

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
              <div className="flex items-center justify-between bg-card border border-border px-4 py-3 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">Source File</span>
                    <span className="text-sm font-semibold text-foreground truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setErrorMessage(null);
                    clearDownloadState();
                  }}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Video</span>
                </button>
              </div>

              {/* Video Player Panel */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden p-5 shadow-inner space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
                  <span>Trim Range ({formatTime(startTime)} - {formatTime(endTime)})</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>

                {/* Video Display Box */}
                <div className="max-w-xl mx-auto">
                  <div className="relative h-48 md:h-60 bg-muted/30 dark:bg-stone-950 rounded-xl flex flex-col items-center justify-center border border-border overflow-hidden group shadow-md">
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
                      <div className="absolute inset-0 bg-background/30 dark:bg-stone-950/40 flex items-center justify-center pointer-events-none">
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

                {/* Simple Progress Bar — fills as the video plays, click to seek */}
                <div className="max-w-xl mx-auto pt-2">
                  <div
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                    className="relative h-2 w-full rounded-full bg-muted-foreground/25 cursor-pointer overflow-hidden"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-orange-500 transition-[width] duration-150"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {/* Time Ruler — tick marks auto-scaled to video length
                      (seconds for short clips, minutes for longer ones) */}
                  {timeMarkers.length > 0 && (
                    <div className="relative h-4">
                      {timeMarkers.map((t, idx) => {
                        const pct = duration > 0 ? (t / duration) * 100 : 0;
                        return (
                          <div
                            key={idx}
                            className="absolute top-0 flex flex-col items-center"
                            style={{
                              left: `${pct}%`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            <div className="w-px h-1.5 bg-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                              {formatTime(t)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Segment Range Selection (Trim count) */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
                    <Scissors className="w-4 h-4 text-orange-500" />
                    <span>Segment Range Selection</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Selected Duration: <strong className="text-foreground">{formatTime(Math.max(0, endTime - startTime))}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {/* Start Time Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider">Start Time</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (videoRef.current) {
                            const curr = videoRef.current.currentTime;
                            setStartTime(curr);
                            if (curr > endTime) setEndTime(curr);
                          }
                        }}
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
                            setStartTime(Math.max(0, Math.min(parsed, Math.max(0, endTime - 0.1))));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(startInput);
                          if (isNaN(parsed)) {
                            setStartInput(startTime.toFixed(1));
                          } else {
                            const clamped = Math.max(0, Math.min(parsed, endTime));
                            setStartTime(clamped);
                            setStartInput(clamped.toFixed(1));
                          }
                        }}
                        className="w-full bg-card border border-border rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-semibold text-foreground focus:outline-none focus:border-orange-500 shadow-sm"
                      />
                      <span className="text-[11px] text-muted-foreground font-medium hidden md:inline">sec</span>
                    </div>
                  </div>

                  {/* End Time Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider">End Time</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (videoRef.current) {
                            const curr = videoRef.current.currentTime;
                            setEndTime(curr);
                            if (curr < startTime) setStartTime(curr);
                          }
                        }}
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
                            setEndTime(Math.min(duration, Math.max(startTime + 0.1, parsed)));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(endInput);
                          if (isNaN(parsed)) {
                            setEndInput(endTime.toFixed(1));
                          } else {
                            const clamped = Math.min(duration, Math.max(startTime + 0.1, parsed));
                            setEndTime(clamped);
                            setEndInput(clamped.toFixed(1));
                          }
                        }}
                        className="w-full bg-card border border-border rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-semibold text-foreground focus:outline-none focus:border-orange-500 shadow-sm"
                      />
                      <span className="text-[11px] text-muted-foreground font-medium hidden md:inline">sec</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Output Format & Quality Settings Panel */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-5 shadow-sm">
                
                {/* Target Output Format Custom Downward Dropdown */}
                <div className="space-y-2 relative" ref={formatDropdownRef}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Target Output Format</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormatOpen(!isFormatOpen);
                      setIsQualityOpen(false);
                    }}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold text-foreground flex items-center justify-between focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                  >
                    <span>{formatOptions.find(f => f.value === targetFormat)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isFormatOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isFormatOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-stone-900 border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {formatOptions.map((opt) => {
                        const isSelected = targetFormat === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => handleFormatSelect(opt.value)}
                            className={`px-4 py-3 text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected 
                                ? "bg-orange-500/10 text-orange-500 font-semibold" 
                                : "text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-orange-500" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Target Quality Custom Downward Dropdown */}
                <div className="space-y-2 relative pt-2 border-t border-border" ref={qualityDropdownRef}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Target Video Quality</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQualityOpen(!isQualityOpen);
                      setIsFormatOpen(false);
                    }}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold text-foreground flex items-center justify-between focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                  >
                    <span>{qualityOptions.find(q => q.value === targetQuality)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isQualityOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isQualityOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-stone-900 border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {qualityOptions.map((opt) => {
                        const isSelected = targetQuality === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => handleQualitySelect(opt.value)}
                            className={`px-4 py-3 text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected 
                                ? "bg-orange-500/10 text-orange-500 font-semibold" 
                                : "text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-orange-500" />}
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
                  onClick={handleConvertAndTrimAction}
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {`Converting  (${formatTime(startTime)} - ${formatTime(endTime)})...`}
                    </>
                  ) : (
                    <>
                      <Sliders className="h-4 w-4" />
                      Convert Video Now
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
    </div>
  );
}