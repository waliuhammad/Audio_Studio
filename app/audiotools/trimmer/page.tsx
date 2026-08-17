"use client";

import {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileAudio,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  UploadCloud,
  X,
} from "lucide-react";

const ALLOWED_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".aac",
  ".flac",
  ".webm",
  ".mpeg",
  ".mpga",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function isValidAudioFile(file: File) {
  const name = file.name.toLowerCase();

  const validExtension = ALLOWED_EXTENSIONS.some((ext) =>
    name.endsWith(ext)
  );

  const validMime =
    file.type.startsWith("audio/") ||
    file.type === "video/mpeg" ||
    file.type === "application/octet-stream";

  return validExtension || validMime;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${remaining
    .toString()
    .padStart(2, "0")}`;
}

function formatInputTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "";
  }

  return Number(seconds.toFixed(2)).toString();
}

function parseTime(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");

    if (parts.length !== 2) {
      return null;
    }

    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);

    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  const valueNumber = Number(trimmed);

  if (!Number.isFinite(valueNumber)) {
    return null;
  }

  return valueNumber;
}

function getTimeMarks(duration: number) {
  if (!duration || duration <= 0) {
    return [];
  }

  let step = 1;

  if (duration > 60) {
    step = 10;
  } else if (duration > 30) {
    step = 5;
  } else if (duration > 15) {
    step = 2;
  }

  const marks: number[] = [];

  for (let time = 0; time <= duration; time += step) {
    marks.push(Math.min(time, duration));
  }

  if (marks[marks.length - 1] !== duration) {
    marks.push(duration);
  }

  return marks;
}

export default function AudioTrimmerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [duration, setDuration] = useState(0);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isDraggingPlayhead, setIsDraggingPlayhead] =
    useState(false);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [audioUrl, downloadUrl]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      const time = audio.currentTime;

      setCurrentTime(time);

      if (isPlaying && endTime > startTime && time >= endTime) {
        audio.pause();
        audio.currentTime = startTime;
        setCurrentTime(startTime);
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );
    };
  }, [isPlaying, startTime, endTime]);

  const handleFile = (selectedFile: File) => {
    setError("");
    setMessage("");
    setDownloadUrl("");
    setDownloadName("");

    if (!isValidAudioFile(selectedFile)) {
      setError(
        "Please select a valid audio file such as MP3, WAV, M4A, OGG, AAC, FLAC, or WEBM."
      );
      return;
    }

    if (selectedFile.size === 0) {
      setError("The selected audio file is empty.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("The maximum allowed file size is 100 MB.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setAudioUrl(url);

    setDuration(0);
    setStartTime(0);
    setEndTime(0);

    setStartInput("0");
    setEndInput("");

    setCurrentTime(0);
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

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

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

    setStartInput("0");
    setEndInput(formatInputTime(audioDuration));
  };

  const updateAudioPosition = (time: number) => {
    const safeTime = Math.max(
      0,
      Math.min(duration, time)
    );

    if (audioRef.current) {
      audioRef.current.currentTime = safeTime;
    }

    setCurrentTime(safeTime);
  };

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
    } catch (playError) {
      console.error("Playback error:", playError);

      setError("Unable to play this audio file.");
    }
  };

  const applyStartValue = (value: string) => {
    setStartInput(value);

    if (!value.trim()) {
      return;
    }

    const parsed = parseTime(value);

    if (parsed === null) {
      return;
    }

    const maxStart = Math.max(0, endTime - 0.01);

    const nextStart = Math.max(
      0,
      Math.min(parsed, maxStart)
    );

    setStartTime(nextStart);

    if (audioRef.current) {
      if (
        audioRef.current.currentTime < nextStart ||
        audioRef.current.currentTime > endTime
      ) {
        updateAudioPosition(nextStart);
      }
    }
  };

  const applyEndValue = (value: string) => {
    setEndInput(value);

    if (!value.trim()) {
      return;
    }

    const parsed = parseTime(value);

    if (parsed === null) {
      return;
    }

    const minEnd = Math.min(
      duration,
      startTime + 0.01
    );

    const nextEnd = Math.max(
      minEnd,
      Math.min(parsed, duration)
    );

    setEndTime(nextEnd);

    if (audioRef.current) {
      if (audioRef.current.currentTime > nextEnd) {
        updateAudioPosition(startTime);
      }
    }
  };

  const handleStartBlur = () => {
    if (!startInput.trim()) {
      setStartInput(formatInputTime(startTime));
      return;
    }

    const parsed = parseTime(startInput);

    if (parsed === null) {
      setStartInput(formatInputTime(startTime));
      return;
    }

    const maxStart = Math.max(0, endTime - 0.01);

    const nextStart = Math.max(
      0,
      Math.min(parsed, maxStart)
    );

    setStartTime(nextStart);
    setStartInput(formatInputTime(nextStart));
  };

  const handleEndBlur = () => {
    if (!endInput.trim()) {
      setEndInput(formatInputTime(endTime));
      return;
    }

    const parsed = parseTime(endInput);

    if (parsed === null) {
      setEndInput(formatInputTime(endTime));
      return;
    }

    const minEnd = Math.min(
      duration,
      startTime + 0.01
    );

    const nextEnd = Math.max(
      minEnd,
      Math.min(parsed, duration)
    );

    setEndTime(nextEnd);
    setEndInput(formatInputTime(nextEnd));
  };

  const seekFromPointer = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    const waveform = waveformRef.current;

    if (!waveform || !duration) {
      return;
    }

    const rect = waveform.getBoundingClientRect();

    const x = Math.max(
      0,
      Math.min(
        rect.width,
        event.clientX - rect.left
      )
    );

    const percentage = x / rect.width;

    const nextTime = percentage * duration;

    updateAudioPosition(nextTime);
  };

  const handleWaveformPointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!duration) {
      return;
    }

    setIsDraggingPlayhead(true);

    waveformRef.current?.setPointerCapture(
      event.pointerId
    );

    seekFromPointer(event);
  };

  const handleWaveformPointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!isDraggingPlayhead) {
      return;
    }

    seekFromPointer(event);
  };

  const handleWaveformPointerUp = (
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

    setIsDraggingPlayhead(false);
  };

  const resetSelection = () => {
    if (!duration) {
      return;
    }

    setStartTime(0);
    setEndTime(duration);

    setStartInput("0");
    setEndInput(formatInputTime(duration));

    updateAudioPosition(0);

    setMessage("");
    setError("");
  };

  const removeFile = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setFile(null);
    setAudioUrl("");

    setDownloadUrl("");
    setDownloadName("");

    setDuration(0);
    setStartTime(0);
    setEndTime(0);

    setStartInput("");
    setEndInput("");

    setCurrentTime(0);
    setIsPlaying(false);

    setError("");
    setMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

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
        setIsPlaying(false);
      }

      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "start",
        startTime.toString()
      );
      formData.append(
        "end",
        endTime.toString()
      );

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
          // Ignore JSON parsing errors.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const originalName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

      const filename =
        `${originalName || "audio"}-trimmed.mp3`;

      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }

      setDownloadUrl(url);
      setDownloadName(filename);

      setMessage(
        "Audio trimmed successfully."
      );
    } catch (trimError) {
      console.error(
        "Trim request failed:",
        trimError
      );

      setError(
        trimError instanceof Error
          ? trimError.message
          : "Unable to trim the audio."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const timeMarks = getTimeMarks(duration);

  const playheadPercentage = duration
    ? (currentTime / duration) * 100
    : 0;

  const startPercentage = duration
    ? (startTime / duration) * 100
    : 0;

  const endPercentage = duration
    ? (endTime / duration) * 100
    : 100;

  return (
    <main className="min-h-screen bg-paper-surface dark:bg-ink-surface">
      <div className="container-studio px-4 py-8 sm:py-10 lg:py-12">
        {/* Back */}
        <Link
          href="/"
          className="
            inline-flex
            items-center
            gap-2
            text-xs
            font-medium
            text-graphite-muted
            transition-colors
            hover:text-orange-500
            dark:text-mist-muted
            dark:hover:text-orange-500
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tools
        </Link>

        {/* Header */}
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-xl
              border
              border-orange-500/20
              bg-orange-500/10
              text-orange-500
            "
          >
            <FileAudio
              className="h-7 w-7"
              strokeWidth={1.8}
            />
          </div>

          <p
            className="
              mt-4
              font-mono
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-orange-500
            "
          >
            Audio Tool
          </p>

          <h1
            className="
              mt-2
              text-3xl
              font-semibold
              tracking-tight
              text-graphite
              dark:text-mist
              sm:text-4xl
            "
          >
            Audio Trimmer
          </h1>

          <p
            className="
              mx-auto
              mt-3
              max-w-lg
              text-sm
              leading-6
              text-graphite-muted
              dark:text-mist-muted
            "
          >
            Cut your audio precisely and keep only
            the part you need.
          </p>
        </div>

        {/* Main */}
        <div className="mx-auto mt-8 max-w-4xl sm:mt-10">
          {!file ? (
            <div
              className="
                rounded-2xl
                border
                border-paper-border
                bg-paper-surface
                p-4
                shadow-sm
                dark:border-ink-border
                dark:bg-ink-surface
                sm:p-5
              "
            >
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
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={handleDrop}
                className="
                  flex
                  min-h-[250px]
                  cursor-pointer
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-dashed
                  border-paper-border
                  bg-paper-surface
                  px-5
                  py-8
                  text-center
                  transition-all
                  duration-200
                  hover:border-orange-500/50
                  hover:bg-paper-raised
                  dark:border-ink-border
                  dark:bg-ink-surface
                  dark:hover:border-orange-500/50
                  dark:hover:bg-ink-raised
                  sm:min-h-[280px]
                  sm:px-8
                  sm:py-10
                "
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg,.mpga"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div
                  className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500/10
                    text-orange-500
                  "
                >
                  <UploadCloud
                    className="h-7 w-7"
                    strokeWidth={1.7}
                  />
                </div>

                <h2
                  className="
                    mt-5
                    text-base
                    font-semibold
                    text-graphite
                    dark:text-mist
                  "
                >
                  Upload an audio file
                </h2>

                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                    text-graphite-muted
                    dark:text-mist-muted
                    sm:text-sm
                  "
                >
                  Drag and drop your file here or click
                  to browse
                </p>

                <p
                  className="
                    mt-3
                    text-[10px]
                    leading-5
                    text-graphite-faint
                    dark:text-mist-faint
                    sm:text-xs
                  "
                >
                  MP3, WAV, M4A, OGG, AAC, FLAC, WEBM,
                  MPEG
                  <span className="mx-1.5">•</span>
                  Max 100 MB
                </p>
              </div>
            </div>
          ) : (
            <div
              className="
                rounded-2xl
                border
                border-paper-border
                bg-paper-surface
                p-4
                dark:border-ink-border
                dark:bg-ink-surface
                sm:p-6
              "
            >
              {/* File header */}
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500/10
                    text-orange-500
                  "
                >
                  <FileAudio className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-graphite
                      dark:text-mist
                    "
                  >
                    {file.name}
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-graphite-muted
                      dark:text-mist-muted
                    "
                  >
                    {(file.size / 1024 / 1024).toFixed(2)}{" "}
                    MB
                    {duration > 0 &&
                      ` · ${formatTime(duration)}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    text-graphite-faint
                    transition-colors
                    hover:bg-paper-raised
                    hover:text-orange-500
                    dark:text-mist-faint
                    dark:hover:bg-ink-raised
                    dark:hover:text-orange-500
                  "
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={
                  handleLoadedMetadata
                }
                className="hidden"
              />

              {/* Waveform */}
              <div
                className="
                  mt-6
                  overflow-hidden
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-raised
                  dark:border-ink-border
                  dark:bg-ink-raised
                "
              >
                <div
                  ref={waveformRef}
                  className="
                    relative
                    h-32
                    w-full
                    cursor-pointer
                    touch-none
                    select-none
                    sm:h-36
                  "
                  onPointerDown={
                    handleWaveformPointerDown
                  }
                  onPointerMove={
                    handleWaveformPointerMove
                  }
                  onPointerUp={
                    handleWaveformPointerUp
                  }
                  onPointerCancel={
                    handleWaveformPointerUp
                  }
                  aria-label="Audio playback timeline"
                >
                  {/* Selection background */}
                  {duration > 0 && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        inset-y-3
                        rounded-lg
                        border
                        border-orange-500/30
                        bg-orange-500/5
                      "
                      style={{
                        left: `${startPercentage}%`,
                        width: `${Math.max(
                          0,
                          endPercentage -
                            startPercentage
                        )}%`,
                      }}
                    />
                  )}

                  {/* Waveform bars */}
                  <div
                    className="
                      absolute
                      inset-x-2
                      top-1/2
                      flex
                      h-20
                      -translate-y-1/2
                      items-center
                      gap-[2px]
                      overflow-hidden
                      sm:inset-x-3
                    "
                  >
                    {Array.from({
                      length: 100,
                    }).map((_, index) => {
                      const wave =
                        Math.sin(index * 0.73) *
                          0.5 +
                        0.5;

                      const wave2 =
                        Math.sin(index * 1.91) *
                          0.5 +
                        0.5;

                      const height =
                        18 +
                        wave * 48 +
                        wave2 * 22;

                      const position =
                        duration > 0
                          ? index / 99
                          : 0;

                      const selected =
                        position >=
                          startTime /
                            Math.max(
                              duration,
                              1
                            ) &&
                        position <=
                          endTime /
                            Math.max(
                              duration,
                              1
                            );

                      return (
                        <div
                          key={index}
                          className={`
                            flex-1
                            min-w-0
                            rounded-full
                            transition-colors
                            ${
                              selected
                                ? "bg-orange-500"
                                : "bg-orange-500/30"
                            }
                          `}
                          style={{
                            height: `${Math.min(
                              90,
                              height
                            )}%`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Playhead */}
                  {duration > 0 && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        bottom-1
                        top-1
                        z-20
                        w-[2px]
                        rounded-full
                        bg-orange-500
                        shadow-[0_0_8px_rgba(249,115,22,0.35)]
                      "
                      style={{
                        left: `${playheadPercentage}%`,
                      }}
                    >
                      <div
                        className="
                          absolute
                          left-1/2
                          top-0
                          h-2.5
                          w-2.5
                          -translate-x-1/2
                          rounded-full
                          bg-orange-500
                        "
                      />
                    </div>
                  )}
                </div>

                {/* Time labels */}
                {duration > 0 && (
                  <div
                    className="
                      relative
                      mx-2
                      mb-2
                      h-4
                      overflow-hidden
                      sm:mx-3
                    "
                  >
                    {timeMarks.map(
                      (time, index) => {
                        const percentage =
                          duration > 0
                            ? (time /
                                duration) *
                              100
                            : 0;

                        const isFirst =
                          index === 0;

                        const isLast =
                          index ===
                          timeMarks.length - 1;

                        return (
                          <span
                            key={`${time}-${index}`}
                            className="
                              absolute
                              top-0
                              -translate-x-1/2
                              whitespace-nowrap
                              font-mono
                              text-[8px]
                              text-graphite-faint
                              dark:text-mist-faint
                              sm:text-[9px]
                            "
                            style={{
                              left: `${percentage}%`,
                              transform: isFirst
                                ? "translateX(0)"
                                : isLast
                                ? "translateX(-100%)"
                                : "translateX(-50%)",
                            }}
                          >
                            {formatTime(time)}
                          </span>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* Start / End fields */}
              <div
                className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-3
                  sm:gap-4
                "
              >
                {/* Start */}
                <div>
                  <label
                    htmlFor="start-time"
                    className="
                      mb-2
                      block
                      text-xs
                      font-medium
                      text-graphite-muted
                      dark:text-mist-muted
                    "
                  >
                    Start
                  </label>

                  <div
                    className="
                      flex
                      items-center
                      rounded-xl
                      border
                      border-paper-border
                      bg-paper-raised
                      px-3
                      focus-within:border-orange-500
                      dark:border-ink-border
                      dark:bg-ink-raised
                    "
                  >
                    <input
                      id="start-time"
                      type="text"
                      inputMode="decimal"
                      value={startInput}
                      onChange={(event) =>
                        applyStartValue(
                          event.target.value
                        )
                      }
                      onBlur={handleStartBlur}
                      placeholder="0"
                      aria-label="Start time"
                      className="
                        min-w-0
                        w-full
                        bg-transparent
                        py-2.5
                        font-mono
                        text-sm
                        font-semibold
                        text-graphite
                        outline-none
                        placeholder:text-graphite-faint
                        dark:text-mist
                        dark:placeholder:text-mist-faint
                      "
                    />

                    <span
                      className="
                        shrink-0
                        text-[10px]
                        text-graphite-faint
                        dark:text-mist-faint
                      "
                    >
                      sec
                    </span>
                  </div>
                </div>

                {/* End */}
                <div>
                  <label
                    htmlFor="end-time"
                    className="
                      mb-2
                      block
                      text-xs
                      font-medium
                      text-graphite-muted
                      dark:text-mist-muted
                    "
                  >
                    End
                  </label>

                  <div
                    className="
                      flex
                      items-center
                      rounded-xl
                      border
                      border-paper-border
                      bg-paper-raised
                      px-3
                      focus-within:border-orange-500
                      dark:border-ink-border
                      dark:bg-ink-raised
                    "
                  >
                    <input
                      id="end-time"
                      type="text"
                      inputMode="decimal"
                      value={endInput}
                      onChange={(event) =>
                        applyEndValue(
                          event.target.value
                        )
                      }
                      onBlur={handleEndBlur}
                      placeholder={
                        duration
                          ? formatInputTime(
                              duration
                            )
                          : "0"
                      }
                      aria-label="End time"
                      className="
                        min-w-0
                        w-full
                        bg-transparent
                        py-2.5
                        font-mono
                        text-sm
                        font-semibold
                        text-graphite
                        outline-none
                        placeholder:text-graphite-faint
                        dark:text-mist
                        dark:placeholder:text-mist-faint
                      "
                    />

                    <span
                      className="
                        shrink-0
                        text-[10px]
                        text-graphite-faint
                        dark:text-mist-faint
                      "
                    >
                      sec
                    </span>
                  </div>
                </div>
              </div>

              {/* Input help */}
              <p
                className="
                  mt-2
                  text-[10px]
                  leading-4
                  text-graphite-faint
                  dark:text-mist-faint
                "
              >
                Enter seconds manually, for example
                12.5, or use MM:SS such as 01:25.
              </p>

              {/* Selection info */}
              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-raised
                  p-3.5
                  dark:border-ink-border
                  dark:bg-ink-raised
                  sm:p-4
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      text-xs
                      font-semibold
                      text-graphite
                      dark:text-mist
                    "
                  >
                    Selected audio
                  </p>

                  <p
                    className="
                      mt-1
                      truncate
                      font-mono
                      text-[10px]
                      text-graphite-muted
                      dark:text-mist-muted
                      sm:text-[11px]
                    "
                  >
                    {formatTime(startTime)}
                    {" → "}
                    {formatTime(endTime)}
                  </p>
                </div>

                <p
                  className="
                    shrink-0
                    font-mono
                    text-xs
                    font-semibold
                    text-orange-500
                  "
                >
                  {formatTime(
                    Math.max(
                      0,
                      endTime - startTime
                    )
                  )}
                </p>
              </div>

              {/* Controls */}
              <div
                className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-3
                "
              >
                <button
                  type="button"
                  onClick={togglePlayback}
                  disabled={!duration}
                  className="
                    inline-flex
                    min-w-0
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface
                    px-3
                    py-3
                    text-xs
                    font-semibold
                    text-graphite
                    transition-all
                    hover:border-orange-500/50
                    hover:text-orange-500
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    dark:border-ink-border
                    dark:bg-ink-surface
                    dark:text-mist
                    dark:hover:border-orange-500/50
                    dark:hover:text-orange-500
                    sm:px-5
                    sm:text-sm
                  "
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Pause Preview
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Preview Selection
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={!duration}
                  className="
                    inline-flex
                    min-w-0
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-paper-border
                    px-3
                    py-3
                    text-xs
                    font-semibold
                    text-graphite-muted
                    transition-colors
                    hover:border-orange-500/50
                    hover:text-orange-500
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    dark:border-ink-border
                    dark:text-mist-muted
                    dark:hover:border-orange-500/50
                    dark:hover:text-orange-500
                    sm:px-5
                    sm:text-sm
                  "
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Trim */}
              <button
                type="button"
                onClick={trimAudio}
                disabled={
                  isProcessing ||
                  !duration ||
                  endTime <= startTime
                }
                className="
                  mt-3
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-orange-500
                  px-5
                  py-3.5
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  duration-200
                  hover:bg-orange-500/90
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
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

          {/* Error */}
          {error && (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-red-500/20
                bg-red-500/5
                px-4
                py-3
                text-xs
                text-red-600
                dark:text-red-400
              "
            >
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div
              className="
                mt-4
                flex
                items-start
                gap-3
                rounded-xl
                border
                border-orange-500/20
                bg-orange-500/5
                px-4
                py-3
                text-xs
                text-graphite
                dark:text-mist
              "
            >
              <CheckCircle2
                className="
                  mt-0.5
                  h-4
                  w-4
                  shrink-0
                  text-orange-500
                "
              />

              <span>{message}</span>
            </div>
          )}

          {/* Download */}
          {downloadUrl && (
            <div
              className="
                mt-4
                rounded-2xl
                border
                border-orange-500/20
                bg-orange-500/5
                p-5
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500/10
                    text-orange-500
                  "
                >
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-graphite
                      dark:text-mist
                    "
                  >
                    Your trimmed audio is ready
                  </p>

                  <p
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-graphite-muted
                      dark:text-mist-muted
                    "
                  >
                    {downloadName}
                  </p>
                </div>
              </div>

              <a
                href={downloadUrl}
                download={downloadName}
                className="
                  mt-4
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-orange-500
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  transition-opacity
                  hover:opacity-90
                "
              >
                <Download className="h-4 w-4" />
                Download Trimmed Audio
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}