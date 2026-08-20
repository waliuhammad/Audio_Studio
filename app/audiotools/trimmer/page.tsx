"use client";

import {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
<<<<<<< HEAD
=======

>>>>>>> e11bd0d (new features added)
import {
  CheckCircle2,
  FileAudio,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  UploadCloud,
  X,
} from "lucide-react";

import { useToolResult } from "@/components/library/ToolResult";

const ALLOWED_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".aac",
  ".flac",
  ".webm",
];

function isValidAudioFile(file: File) {
  const name = file.name.toLowerCase();

  const validExtension = ALLOWED_EXTENSIONS.some((ext) =>
    name.endsWith(ext)
  );

  const validMime =
    file.type.startsWith("audio/") ||
    file.type === "video/webm" ||
    file.type === "video/mp4";

  return validExtension || validMime;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function parseTime(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");

    if (parts.length !== 2) {
      return null;
    }

    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);

    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }

    if (minutes < 0 || seconds < 0 || seconds >= 60) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  const seconds = Number(cleaned);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Removes invalid filesystem characters.
 *
 * This is NEVER called while the user is typing.
 */
function cleanFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
}

export default function AudioTrimmerPage() {
  const { setResult } = useToolResult();

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  const animationRef = useRef<number | null>(null);

  const selectionDragRef =
    useRef<"start" | "end" | null>(null);

  /**
   * =========================================================
   * STATE
   * =========================================================
   */

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");

  const [documentName, setDocumentName] = useState("");

  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [currentTime, setCurrentTime] = useState(0);

  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /**
   * =========================================================
   * CLEANUP
   * =========================================================
   */

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  /**
   * =========================================================
   * PLAYBACK TRACKER
   * =========================================================
   */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !isPlaying) {
      return;
    }

    const update = () => {
      if (!audioRef.current) {
        return;
      }

      const time = audioRef.current.currentTime;

      setCurrentTime(time);

      if (time >= endTime) {
        audioRef.current.pause();
        audioRef.current.currentTime = startTime;

        setCurrentTime(startTime);
        setIsPlaying(false);

        animationRef.current = null;
        return;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, startTime, endTime]);

  /**
   * =========================================================
   * FILE HANDLING
   * =========================================================
   */

  const handleFile = (selectedFile: File) => {
    setError("");
    setMessage("");

    if (!isValidAudioFile(selectedFile)) {
      setError(
        "Please select a valid audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC."
      );
      return;
    }

    if (selectedFile.size === 0) {
      setError("The selected audio file is empty.");
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError("The maximum allowed file size is 100 MB.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(selectedFile);

    const baseName = selectedFile.name.replace(
      /\.[^/.]+$/,
      ""
    );

    setFile(selectedFile);
    setDocumentName(baseName);
    setAudioUrl(url);

    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);

    setStartInput("00:00");
    setEndInput("00:00");

    setIsPlaying(false);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  /**
   * =========================================================
   * AUDIO METADATA
   * =========================================================
   */

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const audioDuration = audio.duration;

    if (
      !Number.isFinite(audioDuration) ||
      audioDuration <= 0
    ) {
      setError(
        "Unable to read the duration of this audio file."
      );
      return;
    }

    setDuration(audioDuration);

    setStartTime(0);
    setEndTime(audioDuration);
    setCurrentTime(0);

    setStartInput("00:00");
    setEndInput(formatTime(audioDuration));
  };

  /**
   * =========================================================
   * PLAYBACK
   * =========================================================
   */

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio || !duration) {
      return;
    }

    setError("");

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (
      audio.currentTime < startTime ||
      audio.currentTime >= endTime
    ) {
      audio.currentTime = startTime;
      setCurrentTime(startTime);
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error(err);

      setError("Unable to play this audio file.");
      setIsPlaying(false);
    }
  };

  /**
   * =========================================================
   * START INPUT
   * =========================================================
   */

  const handleStartInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    setStartInput(value);
    setError("");

    if (!value.trim()) {
      return;
    }

    const parsed = parseTime(value);

    if (parsed === null) {
      return;
    }

    const nextStart = clamp(
      parsed,
      0,
      Math.max(0, endTime - 0.1)
    );

    setStartTime(nextStart);

    if (audioRef.current) {
      if (
        audioRef.current.currentTime < nextStart ||
        audioRef.current.currentTime > endTime
      ) {
        audioRef.current.currentTime = nextStart;
        setCurrentTime(nextStart);
      }
    }
  };

  const handleStartBlur = () => {
    if (!startInput.trim()) {
      setStartInput(formatTime(startTime));
      return;
    }

    const parsed = parseTime(startInput);

    if (parsed === null) {
      setStartInput(formatTime(startTime));
      return;
    }

    const nextStart = clamp(
      parsed,
      0,
      Math.max(0, endTime - 0.1)
    );

    setStartTime(nextStart);
    setStartInput(formatTime(nextStart));
  };

  /**
   * =========================================================
   * END INPUT
   * =========================================================
   */

  const handleEndInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    setEndInput(value);
    setError("");

    if (!value.trim()) {
      return;
    }

    const parsed = parseTime(value);

    if (parsed === null) {
      return;
    }

    const nextEnd = clamp(
      parsed,
      Math.min(duration, startTime + 0.1),
      duration
    );

    setEndTime(nextEnd);

    if (
      audioRef.current &&
      audioRef.current.currentTime > nextEnd
    ) {
      audioRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  };

  const handleEndBlur = () => {
    if (!endInput.trim()) {
      setEndInput(formatTime(endTime));
      return;
    }

    const parsed = parseTime(endInput);

    if (parsed === null) {
      setEndInput(formatTime(endTime));
      return;
    }

    const nextEnd = clamp(
      parsed,
      Math.min(duration, startTime + 0.1),
      duration
    );

    setEndTime(nextEnd);
    setEndInput(formatTime(nextEnd));
  };

  /**
   * =========================================================
   * DOCUMENT NAME
   * =========================================================
   */

  const handleDocumentNameChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setDocumentName(event.target.value);
  };

  /**
   * =========================================================
   * WAVEFORM TIME
   * =========================================================
   */

  const getWaveformTime = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!duration || !waveformRef.current) {
      return null;
    }

    const rect =
      waveformRef.current.getBoundingClientRect();

    const x = clamp(
      event.clientX - rect.left,
      0,
      rect.width
    );

    return clamp(
      (x / rect.width) * duration,
      0,
      duration
    );
  };

  /**
   * =========================================================
   * WAVEFORM SELECTION
   * =========================================================
   */

  const handleWaveformSelectionPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!duration || !waveformRef.current) {
      return;
    }

    const time = getWaveformTime(event);

    if (time === null) {
      return;
    }

    const startDistance = Math.abs(time - startTime);
    const endDistance = Math.abs(time - endTime);

    const threshold = Math.max(
      duration * 0.025,
      0.15
    );

    if (
      startDistance <= threshold ||
      endDistance <= threshold
    ) {
      selectionDragRef.current =
        startDistance <= endDistance
          ? "start"
          : "end";
    } else {
      selectionDragRef.current =
        startDistance <= endDistance
          ? "start"
          : "end";
    }

    waveformRef.current.setPointerCapture(
      event.pointerId
    );

    event.preventDefault();
  };

  const handleWaveformSelectionPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (
      !selectionDragRef.current ||
      !waveformRef.current?.hasPointerCapture(
        event.pointerId
      )
    ) {
      return;
    }

    const time = getWaveformTime(event);

    if (time === null) {
      return;
    }

    if (selectionDragRef.current === "start") {
      const nextStart = clamp(
        time,
        0,
        Math.max(0, endTime - 0.1)
      );

      setStartTime(nextStart);
      setStartInput(formatTime(nextStart));

      if (
        audioRef.current &&
        audioRef.current.currentTime < nextStart
      ) {
        audioRef.current.currentTime = nextStart;
        setCurrentTime(nextStart);
      }
    } else {
      const nextEnd = clamp(
        time,
        Math.min(duration, startTime + 0.1),
        duration
      );

      setEndTime(nextEnd);
      setEndInput(formatTime(nextEnd));

      if (
        audioRef.current &&
        audioRef.current.currentTime > nextEnd
      ) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
    }
  };

  const handleWaveformSelectionPointerUp = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (
      waveformRef.current?.hasPointerCapture(
        event.pointerId
      )
    ) {
      waveformRef.current.releasePointerCapture(
        event.pointerId
      );
    }

    selectionDragRef.current = null;
  };

  /**
   * =========================================================
   * SEEK
   * =========================================================
   */

  const seekWaveform = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!duration || !waveformRef.current) {
      return;
    }

    const rect =
      waveformRef.current.getBoundingClientRect();

    const x = clamp(
      event.clientX - rect.left,
      0,
      rect.width
    );

    const nextTime =
      (x / rect.width) * duration;

    const clampedTime = clamp(
      nextTime,
      0,
      duration
    );

    if (audioRef.current) {
      audioRef.current.currentTime = clampedTime;
    }

    setCurrentTime(clampedTime);
  };

  /**
   * =========================================================
   * RESET
   * =========================================================
   */

  const resetSelection = () => {
    if (!duration) {
      return;
    }

    setStartTime(0);
    setEndTime(duration);

    setStartInput("00:00");
    setEndInput(formatTime(duration));

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    setCurrentTime(0);
    setIsPlaying(false);

    setError("");
    setMessage("");
  };

  /**
   * =========================================================
   * REMOVE FILE
   * =========================================================
   */

  const removeFile = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(null);
    setDocumentName("");
    setAudioUrl("");

    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);

    setStartInput("00:00");
    setEndInput("00:00");

    setIsPlaying(false);

    setError("");
    setMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /**
   * =========================================================
   * TRIM AUDIO
   * =========================================================
   */

  const trimAudio = async () => {
    if (!file) {
      setError("Please upload an audio file first.");
      return;
    }

    if (!duration) {
      setError(
        "Audio duration is not available yet."
      );
      return;
    }

    if (endTime <= startTime) {
      setError(
        "End time must be greater than start time."
      );
      return;
    }

    setIsProcessing(true);
    setError("");
    setMessage("");

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlaying(false);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("start", String(startTime));
      formData.append("end", String(endTime));

      const response = await fetch(
        "/api/audio/trim",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let errorMessage =
          "Unable to trim the audio.";

        try {
          const data = await response.json();

          if (data?.error) {
            errorMessage = data.error;
          }
        } catch {
          // Ignore invalid JSON.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error(
          "The trimmed audio file is empty."
        );
      }

      const originalName =
        documentName.trim() ||
        file.name.replace(
          /\.[^/.]+$/,
          ""
        );

      const cleanedOriginal =
        cleanFileName(originalName);

      const defaultName = cleanedOriginal
        ? `${cleanedOriginal}-trimmed`
        : "audio-trimmed";

      setResult({
        blob,
        defaultFileName: `${defaultName}.mp3`,
        extension: "mp3",
        fallbackBaseName: "audio-trimmed",
      });

      setMessage(
        "Audio trimmed successfully. Customize the filename below before downloading."
      );
    } catch (err) {
      console.error(
        "Trim request failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to trim the audio."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * =========================================================
   * WAVEFORM MARKERS
   * =========================================================
   */

  const getMarkerStep = () => {
    if (!duration) {
      return 1;
    }

    if (duration <= 10) {
      return 1;
    }

    if (duration <= 30) {
      return 5;
    }

    if (duration <= 60) {
      return 10;
    }

    if (duration <= 180) {
      return 30;
    }

    if (duration <= 600) {
      return 60;
    }

    return 120;
  };

  const markerStep = getMarkerStep();

  const markers: number[] = [];

  if (duration > 0) {
    for (
      let time = 0;
      time <= duration;
      time += markerStep
    ) {
      markers.push(
        Math.min(time, duration)
      );
    }

    if (
      markers.length === 0 ||
      markers[markers.length - 1] !== duration
    ) {
      markers.push(duration);
    }
  }

  const playheadPercent =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  const startPercent =
    duration > 0
      ? (startTime / duration) * 100
      : 0;

  const endPercent =
    duration > 0
      ? (endTime / duration) * 100
      : 100;

  return (
    <main className="min-h-screen bg-[#24143D]">
      <div className="container-studio px-4 py-8 sm:py-10 lg:py-12">

        {/* HEADER */}
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-500">
            <FileAudio
              className="h-7 w-7"
              strokeWidth={1.8}
            />
          </div>

          <p className="mt-4 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-500">
            Audio Tool
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-graphite dark:text-mist sm:text-4xl">
            Audio Trimmer
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-graphite-muted dark:text-mist-muted">
            Cut your audio precisely and keep only
            the part you need.
          </p>
        </div>

        {/* MAIN */}
        <div className="mx-auto mt-8 max-w-4xl sm:mt-10">
          {!file ? (
            /* UPLOAD */
            <div className="rounded-2xl border border-paper-border bg-paper-surface p-4 shadow-sm dark:border-ink-border dark:bg-ink-surface sm:p-5">
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  inputRef.current?.click()
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(event) =>
                  event.preventDefault()
                }
                onDrop={handleDrop}
                className="flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-paper-border bg-paper-surface px-5 py-8 text-center transition-all duration-200 hover:border-orange-500/50 hover:bg-paper-raised dark:border-ink-border dark:bg-ink-surface dark:hover:border-orange-500/50 dark:hover:bg-ink-raised sm:min-h-[260px]"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                  <UploadCloud
                    className="h-7 w-7"
                    strokeWidth={1.7}
                  />
                </div>

                <h2 className="mt-5 text-base font-semibold text-graphite dark:text-mist">
                  Upload an audio file
                </h2>

                <p className="mt-2 text-xs leading-5 text-graphite-muted dark:text-mist-muted sm:text-sm">
                  Drag and drop your file here or click
                  to browse
                </p>

                <p className="mt-3 text-[10px] leading-5 text-graphite-faint dark:text-mist-faint sm:text-xs">
                  MP3, WAV, M4A, OGG, AAC, FLAC, WEBM
                  <span className="mx-1.5">•</span>
                  Max 100 MB
                </p>
              </div>
            </div>
          ) : (
            /* TRIMMER */
            <div className="rounded-2xl border border-paper-border bg-paper-surface p-4 dark:border-ink-border dark:bg-ink-surface sm:p-6">

              {/* FILE HEADER */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                  <FileAudio className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-graphite dark:text-mist">
                    {file.name}
                  </p>

                  <p className="mt-0.5 text-xs text-graphite-muted dark:text-mist-muted">
                    {(file.size / 1024 / 1024).toFixed(2)}{" "}
                    MB
                    {duration > 0 &&
                      ` · ${formatTime(duration)}`}
                  </p>

                  <input
                    type="text"
                    value={documentName}
                    onChange={handleDocumentNameChange}
                    aria-label="Document name"
                    placeholder="Document name"
                    className="mt-2 w-full max-w-[320px] rounded-lg border border-paper-border bg-paper-surface px-2.5 py-1.5 text-xs font-medium text-graphite outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-ink-border dark:bg-ink-surface dark:text-mist"
                  />
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  aria-label="Remove file"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-graphite-faint transition-colors hover:bg-paper-raised hover:text-orange-500 dark:text-mist-faint dark:hover:bg-ink-raised dark:hover:text-orange-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(startTime);
                }}
                className="hidden"
              />

              {/* WAVEFORM */}
              <div className="mt-6 overflow-hidden rounded-xl border border-paper-border bg-paper-raised dark:border-ink-border dark:bg-ink-raised">
                <div
                  ref={waveformRef}
                  onPointerDown={
                    handleWaveformSelectionPointerDown
                  }
                  onPointerMove={
                    handleWaveformSelectionPointerMove
                  }
                  onPointerUp={
                    handleWaveformSelectionPointerUp
                  }
                  onPointerCancel={
                    handleWaveformSelectionPointerUp
                  }
                  className="relative h-[150px] cursor-ew-resize touch-none select-none px-3 py-4 sm:h-[170px] sm:px-5"
                >

                  {/* TIME MARKERS */}
                  {duration > 0 && (
                    <div className="absolute inset-x-3 top-2 flex h-5 items-start justify-between sm:inset-x-5">
                      {markers.map(
                        (time, index) => {
                          const percent =
                            (time / duration) * 100;

                          return (
                            <span
                              key={`${time}-${index}`}
                              className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[8px] leading-none text-graphite-muted dark:text-mist-muted sm:text-[9px]"
                              style={{
                                left: `${percent}%`,
                              }}
                            >
                              {formatTime(time)}
                            </span>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* WAVEFORM */}
                  <div
                    className="absolute inset-x-3 top-8 bottom-7 overflow-hidden rounded-lg sm:inset-x-5"
                    onPointerDown={(event) => {
                      waveformRef.current?.setPointerCapture(
                        event.pointerId
                      );

                      seekWaveform(event);
                    }}
                    onPointerMove={(event) => {
                      if (
                        waveformRef.current?.hasPointerCapture(
                          event.pointerId
                        )
                      ) {
                        seekWaveform(event);
                      }
                    }}
                    onPointerUp={(event) => {
                      if (
                        waveformRef.current?.hasPointerCapture(
                          event.pointerId
                        )
                      ) {
                        waveformRef.current.releasePointerCapture(
                          event.pointerId
                        );
                      }
                    }}
                  >
                    <div className="absolute inset-0 flex items-center gap-[2px]">
                      {Array.from({
                        length: 100,
                      }).map((_, index) => {
                        const value =
                          Math.sin(index * 0.73) *
                            0.5 +
                          0.5;

                        const secondWave =
                          Math.sin(index * 1.91) *
                            0.25 +
                          0.25;

                        const height =
                          20 +
                          value * 50 +
                          secondWave * 30;

                        return (
                          <div
                            key={index}
                            className="min-w-[2px] max-w-[7px] flex-1 rounded-full bg-orange-500/70"
                            style={{
                              height: `${Math.min(
                                height,
                                95
                              )}%`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* SELECTED REGION */}
                    {duration > 0 && (
                      <div
                        className="pointer-events-none absolute top-0 bottom-0 z-10 border border-orange-500/50 bg-orange-500/10"
                        style={{
                          left: `${startPercent}%`,
                          width: `${Math.max(
                            0,
                            endPercent -
                              startPercent
                          )}%`,
                        }}
                      />
                    )}

                    {/* START HANDLE */}
                    {duration > 0 && (
                      <div
                        className="pointer-events-none absolute top-[-3px] bottom-[-3px] z-20 w-3 -translate-x-1/2 rounded-full bg-orange-500 shadow-sm"
                        style={{
                          left: `${startPercent}%`,
                        }}
                      >
                        <div className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                      </div>
                    )}

                    {/* END HANDLE */}
                    {duration > 0 && (
                      <div
                        className="pointer-events-none absolute top-[-3px] bottom-[-3px] z-20 w-3 -translate-x-1/2 rounded-full bg-orange-500 shadow-sm"
                        style={{
                          left: `${endPercent}%`,
                        }}
                      >
                        <div className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                      </div>
                    )}

                    {/* PLAYHEAD */}
                    {duration > 0 && (
                      <div
                        className="pointer-events-none absolute top-[-8px] bottom-[-8px] z-30 w-[2px] rounded-full bg-orange-500"
                        style={{
                          left: `${playheadPercent}%`,
                        }}
                      >
                        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500" />
                      </div>
                    )}
                  </div>

                  {/* BOTTOM LABELS */}
                  <div className="absolute inset-x-3 bottom-2 flex items-center justify-between sm:inset-x-5">
                    <span className="font-mono text-[8px] text-graphite-muted dark:text-mist-muted sm:text-[9px]">
                      00:00
                    </span>

                    <span className="font-mono text-[8px] font-semibold text-orange-500 sm:text-[9px]">
                      {formatTime(currentTime)}
                    </span>

                    <span className="font-mono text-[8px] text-graphite-muted dark:text-mist-muted sm:text-[9px]">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* START / END */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label
                    htmlFor="start-time"
                    className="mb-2 block text-xs font-medium text-graphite-muted dark:text-mist-muted"
                  >
                    Start
                  </label>

                  <input
                    id="start-time"
                    type="text"
                    inputMode="decimal"
                    value={startInput}
                    onChange={
                      handleStartInputChange
                    }
                    onBlur={handleStartBlur}
                    placeholder="00:00"
                    className="w-full rounded-xl border border-paper-border bg-paper-surface px-3 py-3 font-mono text-sm font-semibold text-graphite outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-ink-border dark:bg-ink-surface dark:text-mist"
                  />

                  <p className="mt-1.5 text-[9px] text-graphite-faint dark:text-mist-faint">
                    mm:ss or seconds
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="end-time"
                    className="mb-2 block text-xs font-medium text-graphite-muted dark:text-mist-muted"
                  >
                    End
                  </label>

                  <input
                    id="end-time"
                    type="text"
                    inputMode="decimal"
                    value={endInput}
                    onChange={
                      handleEndInputChange
                    }
                    onBlur={handleEndBlur}
                    placeholder="00:00"
                    className="w-full rounded-xl border border-paper-border bg-paper-surface px-3 py-3 font-mono text-sm font-semibold text-graphite outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-ink-border dark:bg-ink-surface dark:text-mist"
                  />

                  <p className="mt-1.5 text-[9px] text-graphite-faint dark:text-mist-faint">
                    mm:ss or seconds
                  </p>
                </div>
              </div>

              {/* SELECTION INFO */}
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-paper-border bg-paper-raised px-4 py-3 dark:border-ink-border dark:bg-ink-raised">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-graphite dark:text-mist">
                    Selected audio
                  </p>

                  <p className="mt-1 truncate font-mono text-[10px] text-graphite-muted dark:text-mist-muted sm:text-[11px]">
                    {formatTime(startTime)}
                    {" → "}
                    {formatTime(endTime)}
                  </p>
                </div>

                <p className="shrink-0 font-mono text-xs font-semibold text-orange-500">
                  {formatTime(
                    Math.max(
                      0,
                      endTime - startTime
                    )
                  )}
                </p>
              </div>

              {/* PREVIEW / RESET */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={togglePlayback}
                  disabled={!duration}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper-border bg-paper-surface px-3 py-3 text-xs font-semibold text-graphite transition-all hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-border dark:bg-ink-surface dark:text-mist sm:text-sm"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Preview
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={!duration}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper-border px-3 py-3 text-xs font-semibold text-graphite-muted transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-border dark:text-mist-muted sm:text-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              {/* TRIM */}
              <button
                type="button"
                onClick={trimAudio}
                disabled={
                  isProcessing ||
                  !duration ||
                  endTime <= startTime
                }
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Trimming audio...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    Trim Audio
                  </>
                )}
              </button>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* MESSAGE */}
          {message && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-xs text-graphite dark:text-mist">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />

              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}