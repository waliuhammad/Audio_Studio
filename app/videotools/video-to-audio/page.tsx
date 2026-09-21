// app/videotools/video-to-audio/page.tsx
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
  FileVideo,
  Trash2,
  Upload,
  Play,
  Pause,
  Film,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { OutputControls } from "@/components/tools/OutputControls";
import { TimelineScrubber } from "@/components/video/TimelineScrubber";
import {
  UPLOAD_SOURCES_HINT,
  VIDEO_FILE_EXTENSIONS,
  allowFileDrop,
  droppedFiles,
  emptyDropMessage,
  isVideoFile,
  unreadableFileMessage,
} from "@/lib/client/media-files";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>(AUDIO_FORMATS[0] as AudioFormat);

  /* Encode quality; the route maps it to a bitrate for the chosen format. */
  const [quality, setQuality] = useState("high");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /* =========================================================
     INLINE DOWNLOAD STATE
     (replaces the shared ToolDownloadArea popup — mirrors the
     Audio Splitter tool's inline rename + download panel)
  ========================================================= */

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  // The extension the finished blob was actually encoded as, so the download
  // name can never disagree with its bytes.
  const [downloadExtension, setDownloadExtension] = useState("");

  const clearDownloadState = () => {
    setDownloadBlob(null);
    setDownloadFileName("");
    setDownloadExtension("");
  };


  /*
   * The video element is the player: its play/pause/time drive the scrubber.
   *
   * There used to be a separate hidden <audio> fed by an automatic "preview"
   * conversion, run on every file load and every format or quality change.
   * Each of those was a full server conversion that used up one of the
   * user's daily runs before they had pressed anything.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      try {
        video.currentTime = 0;
      } catch {
        // Ignore browser-specific seek errors.
      }
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // Clean up the object URLs when the component is unmounted.
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);






  const togglePlay = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => {
        console.error("Playback error:", err);
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  };

  const processFile = async (selectedFile: File) => {
    setErrorMessage(null);
    clearDownloadState();

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage("File size exceeds 500MB limit.");
      return;
    }

    if (!isVideoFile(selectedFile)) {
      setErrorMessage("Please upload a valid video file.");
      return;
    }

    const unreadable = await unreadableFileMessage(selectedFile);

    if (unreadable) {
      setErrorMessage(unreadable);
      return;
    }

    if (videoRef.current) {
      videoRef.current.pause();
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
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      void processFile(selectedFile);
    }

    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    allowFileDrop(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const [droppedFile] = droppedFiles(e.dataTransfer);

    if (!droppedFile) {
      setErrorMessage(emptyDropMessage(e.dataTransfer));
      return;
    }

    void processFile(droppedFile);
  };

  const removeFile = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setErrorMessage(null);
    clearDownloadState();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // A finished file no longer matches once format or quality changes.
  const handleFormatChange = (value: string) => {
    const next = AUDIO_FORMATS.find((fmt) => fmt.extension === value);

    if (!next) return;

    setSelectedFormat(next);
    clearDownloadState();
  };

  const handleQualityChange = (value: string) => {
    setQuality(value);
    clearDownloadState();
  };

  const handleConvert = async () => {
    if (!audioUrl || !file) return;

    setErrorMessage(null);
    clearDownloadState();
    setIsProcessing(true);

    const extension = selectedFormat.extension;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", extension);
      // Quality was never sent here, so every download came out at "high"
      // whatever was picked.
      formData.append("quality", quality);

      const response = await fetch("/api/video/video-to-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Show the server's reason (daily limit reached, file too large, no
        // audio track...) rather than one generic sentence for all of them.
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          body?.error || "Could not convert the audio. Please try again."
        );
      }

      const blob = await response.blob();
      const baseName =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      setDownloadBlob(blob);
      setDownloadExtension(extension);
      setDownloadFileName(`${baseName}-audio.${extension}`);
    } catch (err) {
      console.error(err);

      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not convert the audio. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================================================
     DOWNLOAD HANDLER
     Triggers the browser download for the extracted blob,
     using whatever name the user typed in the rename field.
  ========================================================= */

  const handleFinalDownload = () => {
    if (!downloadBlob) {
      return;
    }

    const extension = downloadExtension || selectedFormat.extension;
    const trimmedName =
      downloadFileName.trim() || `audio.${extension}`;
    const finalName = trimmedName.toLowerCase().endsWith(`.${extension}`)
      ? trimmedName
      : `${trimmedName}.${extension}`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    removeFile();
  };


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
            /* =========================================================
               UPLOAD DROPZONE — matches the Audio Splitter tool's
               dropzone design (border, icon, spacing, copy layout).
            ========================================================= */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-12 ${
                isDragging
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={`video/*,${VIDEO_FILE_EXTENSIONS.join(",")}`}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>

              <h2 className="text-base font-semibold sm:text-lg">
                Upload Video File
              </h2>

              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                Drag and drop your video file here, or tap/click to browse
              </p>

              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {UPLOAD_SOURCES_HINT}
              </p>

              <p className="mt-3 text-[10px] text-muted-foreground sm:text-xs">
                Supports MP4, MOV, WEBM, MKV, AVI • Max 500 MB
              </p>
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
                      onClick={removeFile}
                      className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Video player: tap the video or the button to play. */}
                {audioUrl && (
                  <div className="relative mb-4 flex max-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-border bg-zinc-100 shadow-inner dark:bg-zinc-950">
                    <video
                      ref={videoRef}
                      src={audioUrl}
                      preload="metadata"
                      playsInline
                      onClick={togglePlay}
                      onLoadedMetadata={(e) => {
                        const loadedDuration = e.currentTarget.duration;

                        if (
                          Number.isFinite(loadedDuration) &&
                          loadedDuration > 0
                        ) {
                          setDuration(loadedDuration);
                        }
                      }}
                      className="max-h-[300px] w-auto cursor-pointer rounded-lg object-contain"
                    />

                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause video" : "Play video"}
                      className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-black/30 transition-opacity duration-200 hover:bg-orange-600 focus-visible:opacity-100 sm:h-16 sm:w-16 ${
                        isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" />
                      ) : (
                        <Play className="ml-1 h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" />
                      )}
                    </button>
                  </div>
                )}

                {/* Scrubber: press or drag to move through the video. */}
                <TimelineScrubber
                  className="mt-3"
                  duration={duration}
                  currentTime={currentTime}
                  onSeek={(time) => {
                    if (videoRef.current) {
                      try {
                        videoRef.current.currentTime = time;
                      } catch {
                        // Ignore browser-specific seek errors.
                      }
                    }
                    setCurrentTime(time);
                  }}
                />
              </div>

              {/* Output settings: the only place format and quality are
                  chosen. Changing either clears a finished file. */}
              <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
                  Output Audio Format
                </h2>

                <OutputControls
                  formatOptions={AUDIO_FORMATS.map((fmt) => ({
                    label: fmt.label,
                    value: fmt.extension,
                  }))}
                  format={selectedFormat.extension}
                  onFormatChange={handleFormatChange}
                  quality={quality}
                  onQualityChange={handleQualityChange}
                />
              </div>

              {/* PROCESS & DOWNLOAD */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Converting Audio...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Convert Audio
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
    </main>
  );
}