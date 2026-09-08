
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";

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
  FileType2,
  Disc3,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type OutputFormat = "mp3" | "wav" | "m4a" | "aac" | "flac" | "ogg";

type FormatOption = {
  label: string;
  value: OutputFormat;
  lossy: boolean;
};

const FORMAT_OPTIONS: FormatOption[] = [
  {
    label: "MP3 (Most Compatible)",
    value: "mp3",
    lossy: true,
  },
  {
    label: "WAV (Uncompressed)",
    value: "wav",
    lossy: false,
  },
  {
    label: "M4A (AAC in MP4)",
    value: "m4a",
    lossy: true,
  },
  {
    label: "AAC (Raw Stream)",
    value: "aac",
    lossy: true,
  },
  {
    label: "FLAC (Lossless)",
    value: "flac",
    lossy: false,
  },
  {
    label: "OGG (Vorbis)",
    value: "ogg",
    lossy: true,
  },
];

const DEFAULT_FORMAT_OPTION: FormatOption = {
  label: "MP3 (Most Compatible)",
  value: "mp3",
  lossy: true,
};

type OutputQuality = "high" | "medium" | "standard" | "low";

type QualityOption = {
  label: string;
  value: OutputQuality;
  bitrate: string;
};

const QUALITY_OPTIONS: QualityOption[] = [
  {
    label: "High",
    value: "high",
    bitrate: "320kbps",
  },
  {
    label: "Medium",
    value: "medium",
    bitrate: "192kbps",
  },
  {
    label: "Standard",
    value: "standard",
    bitrate: "128kbps",
  },
  {
    label: "Low",
    value: "low",
    bitrate: "96kbps",
  },
];

const DEFAULT_QUALITY_OPTION: QualityOption = {
  label: "High",
  value: "high",
  bitrate: "320kbps",
};

const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
  ".webm",
];

const SPEED_OPTIONS = [
  {
    label: "0.5x (Half Speed)",
    value: 0.5,
  },
  {
    label: "0.75x",
    value: 0.75,
  },
  {
    label: "1.0x (Normal)",
    value: 1,
  },
  {
    label: "1.25x",
    value: 1.25,
  },
  {
    label: "1.5x",
    value: 1.5,
  },
  {
    label: "2.0x (Double Speed)",
    value: 2,
  },
];

const WAVEFORM_BARS = [
  12, 24, 40, 18, 32, 54, 20, 14, 22, 38, 48, 16, 28,
  60, 34, 18, 42, 24, 16, 44, 52, 20, 36, 14, 26, 48,
  30, 18, 42, 56, 22, 12, 38, 24, 46, 16, 32, 50, 20,
  14, 28, 44, 34, 18, 52, 22, 12, 40, 26, 36, 14, 24,
];

export default function AudioPlayerPage() {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);

  const [isSpeedOpen, setIsSpeedOpen] = useState(false);

  const [format, setFormat] =
    useState<OutputFormat>("mp3");

  const [isFormatOpen, setIsFormatOpen] = useState(false);

  const [quality, setQuality] =
    useState<OutputQuality>("high");

  const [isQualityOpen, setIsQualityOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [downloadBlob, setDownloadBlob] =
    useState<Blob | null>(null);

  const [downloadFileName, setDownloadFileName] =
    useState("");

  const [downloadFormat, setDownloadFormat] =
    useState<OutputFormat>("mp3");

  const audioRef = useRef<HTMLAudioElement>(null);

  const waveformRef =
    useRef<HTMLDivElement>(null);

  const speedDropdownRef =
    useRef<HTMLDivElement>(null);

  const formatDropdownRef =
    useRef<HTMLDivElement>(null);

  const qualityDropdownRef =
    useRef<HTMLDivElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * Guaranteed format option.
   *
   * The explicit fallback object means TypeScript
   * can never consider this value undefined.
   */
  const selectedFormatOption: FormatOption =
    FORMAT_OPTIONS.find(
      (option) => option.value === format
    ) ?? DEFAULT_FORMAT_OPTION;

  /*
   * Guaranteed boolean.
   *
   * This is the line that replaces the problematic:
   *
   * const isLossless = !selectedFormatOption.lossy;
   */
  const isLossless: boolean =
    selectedFormatOption.lossy === false;

  /*
   * Guaranteed quality option.
   */
  const selectedQualityOption: QualityOption =
    QUALITY_OPTIONS.find(
      (option) => option.value === quality
    ) ?? DEFAULT_QUALITY_OPTION;

  /*
   * Create local audio URL.
   */
  useEffect(() => {
    if (!selectedFile) {
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);

    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSpeed(1);
    setVolume(1);
    setFormat("mp3");
    setQuality("high");
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");
    setDownloadFormat("mp3");

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  /*
   * Close dropdowns when clicking outside.
   */
  useEffect(() => {
    const handleClickOutside = (
      event: globalThis.MouseEvent
    ) => {
      const target = event.target as Node;

      if (
        speedDropdownRef.current &&
        !speedDropdownRef.current.contains(target)
      ) {
        setIsSpeedOpen(false);
      }

      if (
        formatDropdownRef.current &&
        !formatDropdownRef.current.contains(target)
      ) {
        setIsFormatOpen(false);
      }

      if (
        qualityDropdownRef.current &&
        !qualityDropdownRef.current.contains(target)
      ) {
        setIsQualityOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (!audio) return;

    const loadedDuration = Number.isFinite(audio.duration)
      ? audio.duration
      : 0;

    setDuration(loadedDuration);

    audio.volume = volume;
    audio.playbackRate = speed;
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be 200 MB or less.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const fileName = file.name.toLowerCase();

    const hasValidExtension =
      ALLOWED_EXTENSIONS.some((extension) =>
        fileName.endsWith(extension)
      );

    const isAudioFile =
      file.type.startsWith("audio/") ||
      file.type === "video/webm";

    if (!hasValidExtension && !isAudioFile) {
      setError(
        "Please select a supported audio file such as MP3, WAV, M4A, AAC, FLAC, OGG, or WEBM."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setError("Unable to play this audio file.");
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;

    if (!audio) return;

    setCurrentTime(audio.currentTime);
  };

  const handleWaveformClick = (
    event: MouseEvent<HTMLDivElement>
  ) => {
    const waveform = waveformRef.current;
    const audio = audioRef.current;

    if (!waveform || !audio || !duration) return;

    const rect =
      waveform.getBoundingClientRect();

    if (rect.width <= 0) return;

    const clickX =
      event.clientX - rect.left;

    const percentage = Math.max(
      0,
      Math.min(1, clickX / rect.width)
    );

    const newTime =
      percentage * duration;

    audio.currentTime = newTime;

    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (
      !Number.isFinite(secs) ||
      secs < 0
    ) {
      return "0:00";
    }

    const minutes =
      Math.floor(secs / 60);

    const seconds =
      Math.floor(secs % 60);

    return `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  const handleAudioAction = async () => {
    if (!selectedFile || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");

    const formData = new FormData();

    formData.append(
      "file",
      selectedFile
    );

    formData.append(
      "volume",
      volume.toString()
    );

    formData.append(
      "speed",
      speed.toString()
    );

    formData.append(
      "format",
      format
    );

    formData.append(
      "quality",
      quality
    );

    try {
      const response = await fetch(
        "/api/other/audio-player",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let message =
          "Audio processing failed.";

        try {
          const contentType =
            response.headers.get(
              "content-type"
            ) ?? "";

          if (
            contentType.includes(
              "application/json"
            )
          ) {
            const data =
              (await response.json()) as {
                error?: string;
                message?: string;
              };

            message =
              data.error ||
              data.message ||
              message;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const resultBlob =
        await response.blob();

      if (!resultBlob.size) {
        throw new Error(
          "The processed audio file is empty."
        );
      }

      const lastDotIndex =
        selectedFile.name.lastIndexOf(".");

      const baseName =
        lastDotIndex > 0
          ? selectedFile.name.substring(
              0,
              lastDotIndex
            )
          : selectedFile.name ||
            "audio";

      const defaultFileName =
        `${baseName}-processed.${format}`;

      setDownloadBlob(resultBlob);
      setDownloadFileName(
        defaultFileName
      );
      setDownloadFormat(format);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not process that audio. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      audio.playbackRate = 1;
    }

    setSelectedFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setSpeed(1);
    setFormat("mp3");
    setQuality("high");

    setIsSpeedOpen(false);
    setIsFormatOpen(false);
    setIsQualityOpen(false);

    setIsProcessing(false);
    setError("");

    setDownloadBlob(null);
    setDownloadFileName("");
    setDownloadFormat("mp3");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = () => {
    if (!downloadBlob) return;

    const extension =
      `.${downloadFormat}`;

    const trimmedName =
      downloadFileName.trim() ||
      `audio-processed${extension}`;

    const finalName =
      trimmedName
        .toLowerCase()
        .endsWith(extension)
        ? trimmedName
        : `${trimmedName}${extension}`;

    const url =
      URL.createObjectURL(
        downloadBlob
      );

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);

    reset();
  };

  const progressPercentage =
    duration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (currentTime / duration) *
              100
          )
        )
      : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/30 shadow-sm">
            <Music className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Audio Player & Studio
          </h1>

          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Play your audio with focused playback controls,
            visual wave scrubbing, and real-time speed
            adjustments.
          </p>
        </div>

        {/* Outer Card */}
        <div className="bg-white dark:bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {!selectedFile && (
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-orange-500 transition-all bg-white dark:bg-background/40">

              <input
                ref={fileInputRef}
                type="file"
                id="audio-upload"
                className="hidden"
                accept="audio/*,.webm"
                onChange={handleFileChange}
              />

              <label
                htmlFor="audio-upload"
                className="cursor-pointer flex flex-col items-center space-y-3"
              >
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

              {/* Loaded File */}
              <div className="flex items-center justify-between bg-white dark:bg-background/60 border border-border px-4 py-3 rounded-2xl">

                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/30 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">
                      Source Audio
                    </span>

                    <span className="text-sm font-semibold truncate block">
                      {selectedFile.name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                    }

                    setSelectedFile(null);
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setDuration(0);
                    setDownloadBlob(null);
                    setDownloadFileName("");
                    setError("");

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-secondary border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Audio</span>
                </button>
              </div>

              {/* Player */}
              <div className="bg-white dark:bg-background rounded-2xl overflow-hidden p-6 shadow-inner space-y-6 border border-border">

                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={
                    handleLoadedMetadata
                  }
                  onEnded={() =>
                    setIsPlaying(false)
                  }
                />

                <div className="flex items-center justify-between">

                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
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
                      <span className="text-xs text-muted-foreground block font-medium">
                        Playback Status
                      </span>

                      <span className="text-sm font-bold">
                        {isPlaying
                          ? "Playing Audio"
                          : "Paused"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block font-medium">
                      Time Elapsed
                    </span>

                    <span className="text-sm font-mono font-bold text-orange-500">
                      {formatTime(
                        currentTime
                      )}{" "}
                      /{" "}
                      {formatTime(
                        duration
                      )}
                    </span>
                  </div>
                </div>

                {/* Waveform */}
                <div className="space-y-2 pt-2">

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Interactive Waveform
                    </span>

                    <span>
                      Click to jump
                    </span>
                  </div>

                  <div
                    ref={waveformRef}
                    onClick={
                      handleWaveformClick
                    }
                    className="relative h-[100px] bg-orange-500/10 rounded-xl border border-orange-500/40 cursor-pointer overflow-hidden px-3 py-0 shadow-inner sm:h-[120px] sm:px-5"
                  >

                    <div className="absolute inset-x-3 top-8 bottom-7 overflow-hidden rounded-lg sm:inset-x-5">

                      <div className="absolute inset-0 flex items-center justify-between gap-[3px]">

                        {WAVEFORM_BARS.map(
                          (
                            height,
                            index
                          ) => (
                            <div
                              key={`${height}-${index}`}
                              className="w-1 shrink-0 rounded-full bg-orange-500 pointer-events-none"
                              style={{
                                height: `${height}px`,
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

                    <span className="absolute left-3 bottom-2 text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:left-5">
                      0:00
                    </span>

                    <span className="absolute right-3 bottom-2 text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:right-5">
                      {formatTime(
                        duration
                      )}
                    </span>

                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">

                {/* Volume */}
                <div className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4">

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <Volume2 className="w-4 h-4 text-orange-500" />
                      <span>
                        Volume Level
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground font-semibold">
                      {Math.round(
                        volume * 100
                      )}
                      %
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(event) => {
                      const value =
                        Number.parseFloat(
                          event.target.value
                        );

                      setVolume(value);

                      if (
                        audioRef.current
                      ) {
                        audioRef.current.volume =
                          value;
                      }
                    }}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                {/* Speed */}
                <div
                  ref={
                    speedDropdownRef
                  }
                  className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4 relative"
                >

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <Gauge className="w-4 h-4 text-orange-500" />
                      <span>
                        Playback Speed
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground font-semibold">
                      {speed}x
                    </span>
                  </div>

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() =>
                        setIsSpeedOpen(
                          (previous) =>
                            !previous
                        )
                      }
                      className="w-full bg-white dark:bg-card border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 flex items-center justify-between focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-all"
                    >
                      <span>
                        {SPEED_OPTIONS.find(
                          (option) =>
                            option.value ===
                            speed
                        )?.label ??
                          `${speed}x`}
                      </span>

                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isSpeedOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {isSpeedOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden py-1">

                        {SPEED_OPTIONS.map(
                          (option) => {
                            const isSelected =
                              speed ===
                              option.value;

                            return (
                              <button
                                key={
                                  option.value
                                }
                                type="button"
                                onClick={() => {
                                  setSpeed(
                                    option.value
                                  );

                                  if (
                                    audioRef.current
                                  ) {
                                    audioRef.current.playbackRate =
                                      option.value;
                                  }

                                  setIsSpeedOpen(
                                    false
                                  );
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-orange-500 text-white font-semibold"
                                    : "hover:bg-orange-500/10 hover:text-orange-600 text-foreground"
                                }`}
                              >
                                <span>
                                  {
                                    option.label
                                  }
                                </span>

                                {isSelected && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </button>
                            );
                          }
                        )}

                      </div>
                    )}
                  </div>
                </div>

                {/* Format */}
                <div
                  ref={
                    formatDropdownRef
                  }
                  className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4 relative"
                >

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <FileType2 className="w-4 h-4 text-orange-500" />
                      <span>
                        Output Format
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground font-semibold uppercase">
                      {format}
                    </span>
                  </div>

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() =>
                        setIsFormatOpen(
                          (previous) =>
                            !previous
                        )
                      }
                      className="w-full bg-white dark:bg-card border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 flex items-center justify-between focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-all"
                    >
                      <span>
                        {
                          selectedFormatOption.label
                        }
                      </span>

                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isFormatOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {isFormatOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden py-1">

                        {FORMAT_OPTIONS.map(
                          (option) => {
                            const isSelected =
                              format ===
                              option.value;

                            return (
                              <button
                                key={
                                  option.value
                                }
                                type="button"
                                onClick={() => {
                                  setFormat(
                                    option.value
                                  );

                                  setIsFormatOpen(
                                    false
                                  );
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-orange-500 text-white font-semibold"
                                    : "hover:bg-orange-500/10 hover:text-orange-600 text-foreground"
                                }`}
                              >
                                <span>
                                  {
                                    option.label
                                  }
                                </span>

                                {isSelected && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </button>
                            );
                          }
                        )}

                      </div>
                    )}
                  </div>
                </div>

                {/* Quality */}
                <div
                  ref={
                    qualityDropdownRef
                  }
                  className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4 relative"
                >

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <Disc3 className="w-4 h-4 text-orange-500" />
                      <span>
                        Output Quality
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground font-semibold">
                      {isLossless
                        ? "Lossless"
                        : selectedQualityOption.bitrate}
                    </span>
                  </div>

                  <div className="relative">

                    <button
                      type="button"
                      disabled={isLossless}
                      onClick={() =>
                        setIsQualityOpen(
                          (previous) =>
                            !previous
                        )
                      }
                      className="w-full bg-white dark:bg-card border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 flex items-center justify-between focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        {isLossless
                          ? "Lossless (no bitrate to set)"
                          : `${selectedQualityOption.label} · ${selectedQualityOption.bitrate}`}
                      </span>

                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isQualityOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {isQualityOpen &&
                      !isLossless && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden py-1">

                          {QUALITY_OPTIONS.map(
                            (option) => {
                              const isSelected =
                                quality ===
                                option.value;

                              return (
                                <button
                                  key={
                                    option.value
                                  }
                                  type="button"
                                  onClick={() => {
                                    setQuality(
                                      option.value
                                    );

                                    setIsQualityOpen(
                                      false
                                    );
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? "bg-orange-500 text-white font-semibold"
                                      : "hover:bg-orange-500/10 hover:text-orange-600 text-foreground"
                                  }`}
                                >
                                  <span>
                                    {
                                      option.label
                                    }{" "}
                                    ·{" "}
                                    {
                                      option.bitrate
                                    }
                                  </span>

                                  {isSelected && (
                                    <Check className="w-4 h-4 text-white" />
                                  )}
                                </button>
                              );
                            }
                          )}

                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* Process & Download */}
              <div className="space-y-3 pt-2">

                <button
                  type="button"
                  onClick={
                    handleAudioAction
                  }
                  disabled={
                    isProcessing
                  }
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

                {/* Download Panel */}
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
                          Choose a name for your{" "}
                          {downloadFormat.toUpperCase()}{" "}
                          download.
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
                        value={
                          downloadFileName
                        }
                        onChange={(event) =>
                          setDownloadFileName(
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleDownload
                      }
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
