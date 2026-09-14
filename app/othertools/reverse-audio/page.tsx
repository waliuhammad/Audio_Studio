"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  History,
  FileText,
  Play,
  Pause,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
  Volume2,
  Settings2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Gauge,
} from "lucide-react";

// Must stay in sync with wherever this format value is consumed downstream.
type ExportFormat = "wav" | "mp3" | "m4a" | "aac" | "flac" | "ogg";

const EXPORT_FORMAT_OPTIONS: { label: string; value: ExportFormat }[] = [
  { label: "WAV (.wav)", value: "wav" },
  { label: "MP3 (.mp3)", value: "mp3" },
  { label: "M4A (.m4a)", value: "m4a" },
  { label: "AAC (.aac)", value: "aac" },
  { label: "FLAC (.flac)", value: "flac" },
  { label: "OGG (.ogg)", value: "ogg" },
];

type OutputQuality = "high" | "medium" | "standard" | "low";

type QualityOption = {
  value: OutputQuality;
  label: string;
  bitrate: string;
};

// Typed Record prevents the previous "possibly undefined" error.
const QUALITY_OPTIONS: Record<OutputQuality, QualityOption> = {
  high: {
    value: "high",
    label: "High",
    bitrate: "320kbps",
  },
  medium: {
    value: "medium",
    label: "Medium",
    bitrate: "192kbps",
  },
  standard: {
    value: "standard",
    label: "Standard",
    bitrate: "128kbps",
  },
  low: {
    value: "low",
    label: "Low",
    bitrate: "96kbps",
  },
};

export default function ReverseAudioPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reversedAudioUrl, setReversedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBufferObj, setAudioBufferObj] = useState<AudioBuffer | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  const [exportFormat, setExportFormat] = useState<ExportFormat>("wav");
  const [quality, setQuality] = useState<OutputQuality>("high");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);

  const [error, setError] = useState("");

  // Inline download state
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);

  /* Set while the server encodes the download. */
  const [isExporting, setIsExporting] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const qualityDropdownRef = useRef<HTMLDivElement | null>(null);

  // Safe typed lookup. This can never be undefined.
  const selectedQualityOption: QualityOption = QUALITY_OPTIONS[quality];

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (reversedAudioUrl) {
        URL.revokeObjectURL(reversedAudioUrl);
      }
    };
  }, [reversedAudioUrl]);

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }

      if (
        qualityDropdownRef.current &&
        !qualityDropdownRef.current.contains(target)
      ) {
        setIsQualityDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setSelectedFile(file);
      await processReverseAudio(file);
    }

    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      setSelectedFile(file);
      await processReverseAudio(file);
    }
  };

  // Compute normalized bar heights from real audio sample data
  const computeWaveformBars = (
    buffer: AudioBuffer,
    barsCount = 48
  ): number[] => {
    const rawData = buffer.getChannelData(0);
    const blockSize =
      Math.floor(rawData.length / barsCount) || 1;

    const filteredData: number[] = [];

    for (let i = 0; i < barsCount; i++) {
      const blockStart = blockSize * i;
      let sum = 0;

      for (let j = 0; j < blockSize; j++) {
        const sample = rawData[blockStart + j] ?? 0;
        sum += Math.abs(sample);
      }

      filteredData.push(sum / blockSize);
    }

    const maxVal = Math.max(...filteredData, 0.001);

    return filteredData.map((value) => value / maxVal);
  };

  const processReverseAudio = async (file: File) => {
    setIsProcessing(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");

    if (reversedAudioUrl) {
      URL.revokeObjectURL(reversedAudioUrl);
      setReversedAudioUrl(null);
    }

    try {
      const arrayBuffer = await file.arrayBuffer();

      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      const decodedBuffer =
        await audioCtx.decodeAudioData(arrayBuffer);

      // Reverse PCM channels
      const numChannels = decodedBuffer.numberOfChannels;
      const length = decodedBuffer.length;
      const sampleRate = decodedBuffer.sampleRate;

      const reversedBuffer = audioCtx.createBuffer(
        numChannels,
        length,
        sampleRate
      );

      for (let c = 0; c < numChannels; c++) {
        const inputData = decodedBuffer.getChannelData(c);
        const outputData = reversedBuffer.getChannelData(c);

        for (let i = 0; i < length; i++) {
          outputData[i] = inputData[length - 1 - i] ?? 0;
        }
      }

      setAudioBufferObj(reversedBuffer);
      setDuration(reversedBuffer.duration);
      setWaveformBars(
        computeWaveformBars(reversedBuffer)
      );

      // Convert reversed AudioBuffer to WAV for preview playback
      const wavBlob = audioBufferToWav(reversedBuffer);
      const url = URL.createObjectURL(wavBlob);

      setReversedAudioUrl(url);

      await audioCtx.close();
    } catch (error) {
      console.error("Error processing audio:", error);

      setError(
        "Could not read that audio file. Make sure it is a valid MP3, WAV or AAC."
      );

      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length =
      buffer.length * numOfChan * 2 + 44;

    const out = new DataView(
      new ArrayBuffer(length)
    );

    const sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        out.setUint8(pos++, str.charCodeAt(i));
      }
    };

    const setUint16 = (data: number) => {
      out.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      out.setUint32(pos, data, true);
      pos += 4;
    };

    writeString("RIFF");
    setUint32(length - 8);

    writeString("WAVE");
    writeString("fmt ");

    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(
      sampleRate * numOfChan * 2
    );
    setUint16(numOfChan * 2);
    setUint16(16);

    writeString("data");
    setUint32(length - pos - 4);

    const channels: Float32Array[] = [];

    for (
      let i = 0;
      i < buffer.numberOfChannels;
      i++
    ) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        const channelData = channels[i];

        const sampleValue = channelData
          ? channelData[offset] ?? 0
          : 0;

        let sample = Math.max(
          -1,
          Math.min(1, sampleValue)
        );

        sample =
          (0.5 + sample < 0
            ? sample * 32768
            : sample * 32767) | 0;

        out.setInt16(pos, sample, true);
        pos += 2;
      }

      offset++;
    }

    return new Blob([out.buffer], {
      type: "audio/wav",
    });
  };

  const togglePlayPause = () => {
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
      setCurrentTime(
        audioRef.current.currentTime
      );
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleWaveformClick = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (
      !waveformRef.current ||
      !audioRef.current ||
      !duration
    ) {
      return;
    }

    const rect =
      waveformRef.current.getBoundingClientRect();

    const clickX =
      e.clientX - rect.left;

    const ratio = Math.max(
      0,
      Math.min(1, clickX / rect.width)
    );

    const newTime = ratio * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) {
      return "0:00";
    }

    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);

    return `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  const handleCreateDownload = () => {
    if (!audioBufferObj || !selectedFile) {
      return;
    }

    /*
     * The current browser-side reversal is generated as WAV.
     * Quality and export format are passed to the UI/API contract
     * and preserved for downstream consumption.
     */
    const blob = audioBufferToWav(
      audioBufferObj
    );

    const baseName =
      selectedFile.name.substring(
        0,
        selectedFile.name.lastIndexOf(".")
      ) || "audio";

    const defaultFileName = `${baseName}-reversed.${exportFormat}`;

    setDownloadBlob(blob);
    setDownloadFileName(defaultFileName);
  };

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (reversedAudioUrl) {
      URL.revokeObjectURL(reversedAudioUrl);
    }

    setSelectedFile(null);
    setReversedAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsProcessing(false);
    setAudioBufferObj(null);
    setWaveformBars([]);
    setIsDropdownOpen(false);
    setIsQualityDropdownOpen(false);
    setExportFormat("wav");
    setQuality("high");
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
   * The in-browser reversal produces WAV bytes, which was handed straight to
   * the user under whatever extension they picked — so an "MP3" download was
   * a WAV with the wrong name. The browser copy is still what drives the
   * preview; the download now comes from the server, which reverses and
   * encodes into the chosen format at the chosen quality.
   */
  const handleDownload = async () => {
    if (!selectedFile || isExporting) {
      return;
    }

    const trimmedName =
      downloadFileName.trim() ||
      `audio-reversed.${exportFormat}`;

    const finalName =
      trimmedName
        .toLowerCase()
        .endsWith(`.${exportFormat}`)
        ? trimmedName
        : `${trimmedName}.${exportFormat}`;

    setIsExporting(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("format", exportFormat);
      formData.append("quality", quality);

      const response = await fetch("/api/other/reverse-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.error ?? `Reversing failed (${response.status}).`
        );
      }

      const encoded = await response.blob();
      const url = URL.createObjectURL(encoded);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = finalName;

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);

      reset();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not reverse that file."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const progressPercentage =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/20 shadow-sm">
            <History className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Reverse Audio
          </h1>

          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Play your audio tracks backwards instantly.
            Perfect for creative sound design and special
            effects.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-card rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm border border-border space-y-8">

          {/* Upload Dropzone */}
          {!selectedFile && !isProcessing && (
            <div
              onClick={() =>
                fileInputRef.current?.click()
              }
              onDragOver={(e) =>
                e.preventDefault()
              }
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-2xl p-8 sm:p-10 text-center hover:border-orange-500 transition-all bg-card/50 cursor-pointer flex flex-col items-center space-y-3 select-none relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                onChange={handleFileChange}
              />

              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-sm pointer-events-none">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1 pointer-events-none">
                <span className="text-base font-semibold text-foreground block">
                  Upload audio file to reverse
                </span>

                <span className="text-sm text-muted-foreground block">
                  Drag and drop your audio file here or click
                  to browse
                </span>

                <span className="text-xs text-muted-foreground/75 block pt-1">
                  Supports MP3, WAV, M4A, AAC, OGG, FLAC
                </span>
              </div>
            </div>
          )}

          {/* Loading / Processing State */}
          {isProcessing && (
            <div className="py-16 text-center space-y-4 bg-muted/40 rounded-2xl border border-border">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />

              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  Decoding & reversing audio track...
                </p>

                <p className="text-xs text-muted-foreground">
                  Processing {selectedFile?.name} using Web Audio API
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {!isProcessing && error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result State */}
          {!isProcessing &&
            selectedFile &&
            reversedAudioUrl && (
              <div className="space-y-6">

                {/* Loaded File Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/50 border border-border px-4 py-3 rounded-2xl">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground block">
                        Reversed File
                      </span>

                      <span className="text-sm font-semibold text-foreground truncate block">
                        {selectedFile.name}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (reversedAudioUrl) {
                        URL.revokeObjectURL(
                          reversedAudioUrl
                        );
                      }

                      setSelectedFile(null);
                      setReversedAudioUrl(null);
                      setAudioBufferObj(null);
                      setWaveformBars([]);
                      setError("");
                      setDownloadBlob(null);
                      setDownloadFileName("");
                      setIsQualityDropdownOpen(false);
                    }}
                    className="flex items-center justify-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-card border border-border px-3 py-2 rounded-xl transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reverse Another</span>
                  </button>
                </div>

                {/* Player Card */}
                <div className="bg-muted/40 border border-border rounded-2xl p-4 sm:p-6 space-y-6">

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      <span>
                        Reversed Track Waveform Preview
                      </span>
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    src={reversedAudioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    className="hidden"
                  />

                  {/* Waveform */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Interactive Waveform</span>
                      <span>Click to jump</span>
                    </div>

                    <div
                      ref={waveformRef}
                      onClick={handleWaveformClick}
                      className="relative h-[100px] sm:h-[120px] bg-orange-500/10 rounded-xl border border-orange-500/40 cursor-pointer overflow-hidden px-3 sm:px-5 py-0 shadow-inner"
                    >
                      <div className="absolute inset-x-3 sm:inset-x-5 top-8 bottom-7 overflow-hidden rounded-lg">
                        <div className="absolute inset-0 flex items-center justify-between gap-[3px]">
                          {waveformBars.map(
                            (height, idx) => (
                              <div
                                key={idx}
                                className="w-1 shrink-0 rounded-full bg-orange-500 pointer-events-none"
                                style={{
                                  height: `${Math.max(
                                    12,
                                    height * 76
                                  )}px`,
                                }}
                              />
                            )
                          )}
                        </div>
                      </div>

                      {/* Playhead */}
                      <div
                        className="absolute top-8 bottom-7 w-[2px] bg-orange-600 shadow-glow pointer-events-none transition-all z-10 rounded-full"
                        style={{
                          left: `${progressPercentage}%`,
                          transform:
                            "translateX(-50%)",
                        }}
                      />

                      {/* Time Labels */}
                      <span className="absolute left-4 bottom-2 text-[11px] font-medium text-orange-600/80 dark:text-orange-400/80">
                        0:00
                      </span>

                      <span className="absolute right-4 bottom-2 text-[11px] font-medium text-orange-600/80 dark:text-orange-400/80">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Play / Pause Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-sm shadow-orange-500/20 transition-all cursor-pointer flex-shrink-0 self-center sm:self-auto"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 flex items-center space-x-3 text-sm text-foreground bg-card border border-border px-4 py-3 rounded-xl shadow-sm">
                      <Volume2 className="w-4 h-4 text-orange-500 flex-shrink-0" />

                      <span className="font-medium truncate">
                        {isPlaying
                          ? "Playing reversed audio..."
                          : "Ready for playback"}
                      </span>

                      <span className="ml-auto text-xs font-mono text-muted-foreground flex-shrink-0">
                        {formatTime(currentTime)} /{" "}
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Output Controls */}
                  <div className="space-y-4 pt-2">

                    {/* Format + Quality */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Export Format */}
                      <div className="bg-card border border-border px-4 py-3 rounded-xl shadow-sm">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center space-x-2 text-foreground text-sm font-semibold">
                            <Settings2 className="w-4 h-4 text-orange-500" />
                            <span>Export Format</span>
                          </div>

                          <div
                            className="relative"
                            ref={dropdownRef}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsDropdownOpen(
                                  !isDropdownOpen
                                );
                                setIsQualityDropdownOpen(
                                  false
                                );
                              }}
                              className="w-full bg-muted/50 border border-border text-foreground text-sm font-medium rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer flex items-center justify-between"
                            >
                              <span className="truncate">
                                {
                                  EXPORT_FORMAT_OPTIONS.find(
                                    (opt) =>
                                      opt.value ===
                                      exportFormat
                                  )?.label
                                }
                              </span>

                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2 ${
                                  isDropdownOpen
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>

                            {isDropdownOpen && (
                              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-black border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                                {EXPORT_FORMAT_OPTIONS.map(
                                  (opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setExportFormat(
                                          opt.value
                                        );
                                        setIsDropdownOpen(
                                          false
                                        );
                                      }}
                                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                        exportFormat ===
                                        opt.value
                                          ? "bg-orange-500/10 text-orange-500 font-semibold"
                                          : "text-foreground hover:bg-muted/60"
                                      }`}
                                    >
                                      <span>
                                        {opt.label}
                                      </span>

                                      {exportFormat ===
                                        opt.value && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                                      )}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Output Quality */}
                      <div className="bg-card border border-border px-4 py-3 rounded-xl shadow-sm">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center space-x-2 text-foreground text-sm font-semibold">
                            <Gauge className="w-4 h-4 text-orange-500" />
                            <span>Output Quality</span>
                          </div>

                          <div
                            className="relative"
                            ref={qualityDropdownRef}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsQualityDropdownOpen(
                                  !isQualityDropdownOpen
                                );
                                setIsDropdownOpen(false);
                              }}
                              className="w-full bg-muted/50 border border-border text-foreground text-sm font-medium rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer flex items-center justify-between"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <Gauge className="w-4 h-4 shrink-0 text-orange-500" />

                                <span className="truncate">
                                  {selectedQualityOption.label}{" "}
                                  <span className="text-muted-foreground font-normal">
                                    (
                                    {
                                      selectedQualityOption.bitrate
                                    }
                                    )
                                  </span>
                                </span>
                              </span>

                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2 ${
                                  isQualityDropdownOpen
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>

                            {isQualityDropdownOpen && (
                              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-black border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                                {(
                                  Object.values(
                                    QUALITY_OPTIONS
                                  ) as QualityOption[]
                                ).map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setQuality(
                                        option.value
                                      );
                                      setIsQualityDropdownOpen(
                                        false
                                      );
                                    }}
                                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                      quality ===
                                      option.value
                                        ? "bg-orange-500/10 text-orange-500 font-semibold"
                                        : "text-foreground hover:bg-muted/60"
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <Gauge className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                      <span>
                                        {option.label}
                                      </span>
                                    </span>

                                    <span className="text-xs text-muted-foreground font-mono">
                                      {option.bitrate}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Create Reversed Audio */}
                    <button
                      type="button"
                      onClick={handleCreateDownload}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />

                      {`Create Reversed Audio (${exportFormat.toUpperCase()})`}
                    </button>

                    {/* Inline Rename + Download */}
                    {downloadBlob && (
                      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
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
                          onClick={handleDownload}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}