"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  FileVideo,
  RefreshCw,
  Download,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { OutputControls } from "@/components/tools/OutputControls";
import {
  UPLOAD_SOURCES_HINT,
  VIDEO_FILE_EXTENSIONS,
  allowFileDrop,
  droppedFiles,
  emptyDropMessage,
  isVideoFile,
  unreadableFileMessage,
} from "@/lib/client/media-files";

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Output format selection dropdown state (6+ formats including gif)
  const [targetFormat, setTargetFormat] = useState("mp4");

  // Quality dropdown selection state (4+ quality options)
  /*
   * Format and size are chosen only in the result card, as in Video Mixture.
   * The first conversion uses MP4 at 720p; changing either afterwards only
   * selects it, and Download re-converts when they no longer match the file.
   */
  const [resolution, setResolution] = useState("720p");
  const [convertedWith, setConvertedWith] = useState<{
    format: string;
    resolution: string;
  } | null>(null);

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
    setConvertedWith(null);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setConvertedFileUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [selectedFile]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // The one path for both a picked and a dropped file.
  const acceptFile = async (file: File) => {
    if (!isVideoFile(file)) {
      setErrorMessage("Please upload a video file (MP4, MOV, WEBM, MKV, AVI, M4V or MPEG).");
      return;
    }

    const unreadable = await unreadableFileMessage(file);
    if (unreadable) {
      setErrorMessage(unreadable);
      return;
    }

    setErrorMessage(null);
    clearDownloadState();
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void acceptFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    allowFileDrop(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const [droppedFile] = droppedFiles(e.dataTransfer);
    if (!droppedFile) {
      setErrorMessage(emptyDropMessage(e.dataTransfer));
      return;
    }
    void acceptFile(droppedFile);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
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
    { value: "mp4", label: "MP4" },
    { value: "webm", label: "WebM" },
    { value: "mov", label: "MOV" },
    { value: "mkv", label: "MKV" },
    { value: "avi", label: "AVI" },
    { value: "gif", label: "GIF" },
  ];

  // What the Quality dropdown offers: the converted video's height.
  const resolutionOptions = [
    { value: "720p", label: "720p · HD" },
    { value: "480p", label: "480p" },
    { value: "360p", label: "360p" },
  ];

  // A GIF is capped at this many seconds by the route, and the converter no
  // longer picks a segment, so a GIF is made from the start of the video.
  const GIF_MAX_SECONDS = 30;

  /*
   * Convert with the current format and size. Returns the file, or null when
   * it failed (the error is already on screen). An existing result card is
   * left in place, so re-converting from Download doesn't send the user back.
   */
  const runConvert = async (): Promise<Blob | null> => {
    if (!selectedFile) return null;

    const settings = { format: targetFormat, resolution };

    setErrorMessage(null);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    /*
     * The whole video is converted: with no endTime the route keeps the full
     * length. (Sending the player's duration also broke files the browser
     * can't play, such as AVI, whose duration never loads and stayed 0.)
     * GIF is the exception — the route requires a range of at most 30 s.
     */
    if (settings.format === "gif") {
      const gifEnd =
        duration > 0 ? Math.min(duration, GIF_MAX_SECONDS) : GIF_MAX_SECONDS;

      formData.append("startTime", "0");
      formData.append("endTime", gifEnd.toString());
    }
    formData.append("format", settings.format);
    // The dropdown picks a size; the route reads it as "resolution" and keeps
    // the encode level at its best.
    formData.append("resolution", settings.resolution);
    formData.append("quality", "high");

    try {
      const response = await fetch("/api/video/video-converter", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // The server says why (daily limit reached, file too large...).
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          body?.error || "Could not convert that video. Please try again."
        );
      }

      const resultBlob = await response.blob();

      if (convertedFileUrl) URL.revokeObjectURL(convertedFileUrl);
      setConvertedFileUrl(URL.createObjectURL(resultBlob));

      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "video";

      setDownloadBlob(resultBlob);
      setConvertedWith(settings);
      // Keep a name the user already typed; only its extension follows the
      // format.
      setDownloadFileName((current) => {
        const stem =
          current.replace(/\.[^/.]+$/, "").trim() || `${baseName}-converted`;

        return `${stem}.${settings.format}`;
      });

      return resultBlob;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not convert that video. Please try again."
      );

      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertAndTrimAction = async () => {
    clearDownloadState();
    await runConvert();
  };

  const needsReconvert =
    convertedWith !== null &&
    (convertedWith.format !== targetFormat ||
      convertedWith.resolution !== resolution);

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
    setTargetFormat("mp4");
    setResolution("720p");
    setConvertedWith(null);
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

  const handleFinalDownload = async () => {
    let blob = downloadBlob;
    let format = convertedWith?.format ?? targetFormat;

    if (!blob || needsReconvert) {
      blob = await runConvert();
      format = targetFormat;
    }

    if (!blob) return;

    const stem =
      downloadFileName.replace(/\.[^/.]+$/, "").trim() || "video-converted";
    const finalName = `${stem}.${format}`;

    const url = URL.createObjectURL(blob);
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
            Convert your video to another format and quality.
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
                accept={`video/*,${VIDEO_FILE_EXTENSIONS.join(",")}`}
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

              <p className="mt-1 text-sm text-muted-foreground">
                {UPLOAD_SOURCES_HINT}
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
                  <span>Preview</span>
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
                      Converting Video...
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

                    {/* Format and quality sit with the name, as in Video
                        Mixture. Changing either only selects it; Download
                        applies it. */}
                    <OutputControls
                      formatOptions={formatOptions}
                      format={targetFormat}
                      onFormatChange={setTargetFormat}
                      qualityLabel="Quality"
                      qualityOptions={resolutionOptions}
                      quality={resolution}
                      onQualityChange={setResolution}
                      disabled={isProcessing}
                    />

                    {targetFormat === "gif" && (
                      <p className="text-xs text-muted-foreground">
                        GIFs are made from the first {GIF_MAX_SECONDS} seconds of the video.
                      </p>
                    )}

                    {needsReconvert && !isProcessing && (
                      <p className="text-xs text-muted-foreground">
                        New settings selected. Download will apply them.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleFinalDownload()}
                      disabled={isProcessing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {isProcessing
                        ? "Applying..."
                        : needsReconvert
                          ? "Update & Download"
                          : "Download"}
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