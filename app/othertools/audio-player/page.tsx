"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  Music,
  RefreshCw,
  Check,
  Download,
  Sliders,
  Volume2,
  Gauge,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AudioPlayerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  // Inline download state (replaces the separate popup card)
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const speedDropdownRef = useRef<HTMLDivElement>(null);

  // Decorative waveform amplitude bars
  const waveformBars = Array.from({ length: 48 }, (_, i) => {
    return Math.sin(i * 0.4) * 25 + Math.cos(i * 0.2) * 15 + 45;
  });

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setSpeed(1);
      setVolume(1);
      setError("");
      setDownloadBlob(null);
      setDownloadFileName("");
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [selectedFile]);

  // Close speed dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.playbackRate = speed;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleAudioAction = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("volume", volume.toString());
    formData.append("speed", speed.toString());

    try {
      const response = await fetch("/api/other/audio-player", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Audio processing failed");

      const resultBlob = await response.blob();

      const baseName =
        selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "audio";
      const defaultFileName = `${baseName}-processed.mp3`;

      setDownloadBlob(resultBlob);
      setDownloadFileName(defaultFileName);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not process that audio. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadBlob) return;

    const trimmedName = downloadFileName.trim() || "audio-processed.mp3";
    const finalName = trimmedName.toLowerCase().endsWith(".mp3")
      ? trimmedName
      : `${trimmedName}.mp3`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const speedOptions = [
    { label: "0.5x (Half Speed)", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1.0x (Normal)", value: 1 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "2.0x (Double Speed)", value: 2 },
  ];

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/30 shadow-sm">
            <Music className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Audio Player & Studio
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Play your audio with focused playback controls, visual wave scrubbing, and real-time speed adjustments.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-white dark:bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {!selectedFile && (
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-orange-500 transition-all bg-white dark:bg-background/40">
              <input
                type="file"
                id="audio-upload"
                className="hidden"
                accept="audio/*"
                onChange={handleFileChange}
              />
              <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-semibold block">
                    Upload your audio file
                  </span>
                  <span className="text-sm text-muted-foreground block">
                    Drag and drop your file here or click to browse
                  </span>
                  <span className="text-xs text-muted-foreground/70 block pt-1">
                    MP3, WAV, AAC, OGG • Max 200 MB
                  </span>
                </div>
              </label>
            </div>
          )}

          {selectedFile && audioUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-background/60 border border-border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/30 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">Source Audio</span>
                    <span className="text-sm font-semibold truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-secondary border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Audio</span>
                </button>
              </div>

              {/* Audio Player & Waveform Panel */}
              <div className="bg-white dark:bg-background rounded-2xl overflow-hidden p-6 shadow-inner space-y-6 border border-border">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-1" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Playback Status</span>
                      <span className="text-sm font-bold">{isPlaying ? "Playing Audio" : "Paused"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block font-medium">Time Elapsed</span>
                    <span className="text-sm font-mono font-bold text-orange-500">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Interactive Waveform Scrubber — dark card, orange border, solid orange bars, corner time labels */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Interactive Waveform</span>
                    <span>Click to jump</span>
                  </div>

                  <div
                    ref={waveformRef}
                    onClick={handleWaveformClick}
                    className="relative h-28 bg-[#1c1310] rounded-2xl border border-orange-500/40 cursor-pointer overflow-hidden"
                  >
                    {/* Bars */}
                    <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-4 pt-4 pb-7">
                      {waveformBars.map((height, idx) => (
                        <div
                          key={idx}
                          className="w-[3px] rounded-full bg-orange-500 pointer-events-none"
                          style={{ height: `${Math.max(15, height)}%` }}
                        />
                      ))}
                    </div>

                    {/* Playhead */}
                    <div
                      className="absolute top-4 bottom-7 w-[2px] bg-orange-300 shadow-glow pointer-events-none transition-all z-10 rounded-full"
                      style={{ left: `${progressPercentage}%`, transform: "translateX(-50%)" }}
                    />

                    {/* Corner time labels */}
                    <span className="absolute left-4 bottom-2.5 text-[11px] font-medium text-orange-400/80">
                      0:00
                    </span>
                    <span className="absolute right-4 bottom-2.5 text-[11px] font-medium text-orange-400/80">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume & Speed Settings Panels Stacked in Full-Width Rows */}
              <div className="space-y-4">
                {/* Volume Slider Row */}
                <div className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <Volume2 className="w-4 h-4 text-orange-500" />
                      <span>Volume Level</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (audioRef.current) audioRef.current.volume = val;
                    }}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                {/* Playback Speed Custom Dropdown Row */}
                <div className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4 relative" ref={speedDropdownRef}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <Gauge className="w-4 h-4 text-orange-500" />
                      <span>Playback Speed</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">{speed}x</span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                      className="w-full bg-white dark:bg-card border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 flex items-center justify-between focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-all"
                    >
                      <span>{speedOptions.find((opt) => opt.value === speed)?.label || `${speed}x`}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isSpeedOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isSpeedOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden py-1">
                        {speedOptions.map((opt) => {
                          const isSelected = speed === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSpeed(opt.value);
                                if (audioRef.current) audioRef.current.playbackRate = opt.value;
                                setIsSpeedOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-orange-500/10 text-orange-500 font-semibold border-l-2 border-orange-500"
                                  : "hover:bg-accent hover:text-accent-foreground text-foreground"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-4 h-4 text-orange-500" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* PROCESS & INLINE DOWNLOAD PANEL */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAudioAction}
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Audio File...
                    </>
                  ) : (
                    <>
                      <Sliders className="h-4 w-4" />
                      Process Audio
                    </>
                  )}
                </button>

                {/* INLINE RENAME + DOWNLOAD PANEL — same theme as the splitter tool */}
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
                      onClick={handleDownload}
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