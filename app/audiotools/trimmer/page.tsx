"use client";

import {
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
];

function isValidAudioFile(file: File) {
  const name = file.name.toLowerCase();

  const validExtension =
    ALLOWED_EXTENSIONS.some((extension) =>
      name.endsWith(extension)
    );

  const validMime =
    file.type.startsWith("audio/");

  return validExtension || validMime;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60);

  return `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export default function AudioTrimmerPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const audioRef =
    useRef<HTMLAudioElement>(null);

  const animationRef =
    useRef<number | null>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [audioUrl, setAudioUrl] =
    useState<string>("");

  const [duration, setDuration] =
    useState(0);

  const [startTime, setStartTime] =
    useState(0);

  const [endTime, setEndTime] =
    useState(0);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [downloadUrl, setDownloadUrl] =
    useState("");

  const [downloadName, setDownloadName] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /*
   * Cleanup object URLs.
   */
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

  /*
   * Keep playback inside selected range.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const update = () => {
      const time = audio.currentTime;

      setCurrentTime(time);

      if (
        isPlaying &&
        time >= endTime
      ) {
        audio.pause();

        audio.currentTime = startTime;

        setIsPlaying(false);
      }

      animationRef.current =
        requestAnimationFrame(update);
    };

    if (isPlaying) {
      animationRef.current =
        requestAnimationFrame(update);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    isPlaying,
    startTime,
    endTime,
  ]);

  const handleFile = (selectedFile: File) => {
    setError("");
    setMessage("");
    setDownloadUrl("");
    setDownloadName("");

    if (!isValidAudioFile(selectedFile)) {
      setError(
        "Please select a valid audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC."
      );

      return;
    }

    if (selectedFile.size === 0) {
      setError(
        "The selected audio file is empty."
      );

      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url =
      URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setAudioUrl(url);

    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const audioDuration =
      audio.duration;

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
    setEndTime(audioDuration);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
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
    }

    try {
      await audio.play();

      setIsPlaying(true);
    } catch (error) {
      console.error(
        "Playback error:",
        error
      );

      setError(
        "Unable to play this audio file."
      );
    }
  };

  const handleStartChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      Number(event.target.value);

    const nextStart =
      Math.min(
        value,
        Math.max(0, endTime - 0.1)
      );

    setStartTime(nextStart);

    if (
      audioRef.current &&
      audioRef.current.currentTime <
        nextStart
    ) {
      audioRef.current.currentTime =
        nextStart;

      setCurrentTime(nextStart);
    }
  };

  const handleEndChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      Number(event.target.value);

    const nextEnd =
      Math.max(
        value,
        Math.min(
          duration,
          startTime + 0.1
        )
      );

    setEndTime(nextEnd);

    if (
      audioRef.current &&
      audioRef.current.currentTime >
        nextEnd
    ) {
      audioRef.current.currentTime =
        startTime;

      setCurrentTime(startTime);
    }
  };

  const resetSelection = () => {
    if (!duration) {
      return;
    }

    setStartTime(0);
    setEndTime(duration);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    setCurrentTime(0);
    setMessage("");
    setError("");
  };

  const removeFile = () => {
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
      setError(
        "Please upload an audio file first."
      );

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
          const data =
            await response.json();

          errorMessage =
            data?.error || errorMessage;
        } catch {
          // Ignore JSON parsing failure.
        }

        throw new Error(
          errorMessage
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      const originalName =
        file.name
          .replace(/\.[^/.]+$/, "")
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

      const filename =
        `${originalName || "audio"}-trimmed.mp3`;

      if (downloadUrl) {
        URL.revokeObjectURL(
          downloadUrl
        );
      }

      setDownloadUrl(url);
      setDownloadName(filename);

      setMessage(
        "Audio trimmed successfully."
      );
    } catch (error) {
      console.error(
        "Trim request failed:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to trim the audio."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper-surface dark:bg-ink-surface">
      <div className="container-studio px-4 py-8 sm:py-10 lg:py-12">
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
              border-amber/20
              bg-amber/10
              text-amber
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
              text-amber
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
            /* ============================
               UPLOAD
            ============================ */
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
                cursor-pointer
                rounded-2xl
                border
                border-dashed
                border-paper-border
                bg-paper-surface
                p-8
                text-center
                transition-all
                duration-200
                hover:border-amber/50
                hover:bg-paper-raised
                dark:border-ink-border
                dark:bg-ink-surface
                dark:hover:border-amber/50
                dark:hover:bg-ink-raised
                sm:p-12
              "
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
                onChange={handleInputChange}
                className="hidden"
              />

              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-amber/20
                  bg-amber/10
                  text-amber
                "
              >
                <UploadCloud
                  className="h-8 w-8"
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
                "
              >
                Drag and drop your file here or click
                to browse
              </p>

              <p
                className="
                  mt-3
                  font-mono
                  text-[9px]
                  uppercase
                  tracking-wider
                  text-graphite-faint
                  dark:text-mist-faint
                "
              >
                MP3 · WAV · M4A · OGG · AAC · FLAC
              </p>
            </div>
          ) : (
            /* ============================
               TRIMMER
            ============================ */
            <div
              className="
                rounded-2xl
                border
                border-paper-border
                bg-paper-surface
                p-5
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
                    bg-amber/10
                    text-amber
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
                    {(file.size / 1024 / 1024).toFixed(
                      2
                    )}{" "}
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
                    hover:text-amber
                    dark:text-mist-faint
                    dark:hover:bg-ink-raised
                    dark:hover:text-amber
                  "
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Audio */}
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={
                  handleLoadedMetadata
                }
                className="hidden"
              />

              {/* Waveform-style timeline */}
              <div
                className="
                  mt-7
                  overflow-hidden
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-raised
                  dark:border-ink-border
                  dark:bg-ink-raised
                "
              >
                <div className="relative h-32 px-4 py-6 sm:h-36">
                  {/* Visual bars */}
                  <div
                    className="
                      absolute
                      inset-x-4
                      top-1/2
                      flex
                      h-20
                      -translate-y-1/2
                      items-center
                      gap-[2px]
                      overflow-hidden
                    "
                  >
                    {Array.from({
                      length: 90,
                    }).map((_, index) => {
                      const pattern =
                        Math.sin(
                          index * 0.73
                        ) *
                          0.5 +
                        0.5;

                      const height =
                        20 +
                        pattern * 55;

                      return (
                        <div
                          key={index}
                          className="
                            flex-1
                            rounded-full
                            bg-amber/30
                          "
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Selected region */}
                  {duration > 0 && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        top-3
                        bottom-3
                        rounded-lg
                        border
                        border-amber/50
                        bg-amber/10
                      "
                      style={{
                        left: `calc(16px + ${
                          (startTime /
                            duration) *
                          100
                        }% * (1 - ${
                          32 / 100
                        }))`,
                        right: `calc(16px + ${
                          ((duration -
                            endTime) /
                            duration) *
                          100
                        }% * (1 - ${
                          32 / 100
                        }))`,
                      }}
                    />
                  )}

                  {/* Current position */}
                  {duration > 0 && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        top-2
                        bottom-2
                        w-px
                        bg-graphite
                        dark:bg-mist
                      "
                      style={{
                        left: `calc(16px + ${
                          (currentTime /
                            duration) *
                          100
                        }% * (1 - ${
                          32 / 100
                        }))`,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Time controls */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Start */}
                <div>
                  <div className="mb-2 flex justify-between">
                    <span
                      className="
                        text-xs
                        font-medium
                        text-graphite-muted
                        dark:text-mist-muted
                      "
                    >
                      Start
                    </span>

                    <span
                      className="
                        font-mono
                        text-xs
                        font-semibold
                        text-amber
                      "
                    >
                      {formatTime(startTime)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={startTime}
                    onChange={
                      handleStartChange
                    }
                    disabled={!duration}
                    className="audio-range"
                  />
                </div>

                {/* End */}
                <div>
                  <div className="mb-2 flex justify-between">
                    <span
                      className="
                        text-xs
                        font-medium
                        text-graphite-muted
                        dark:text-mist-muted
                      "
                    >
                      End
                    </span>

                    <span
                      className="
                        font-mono
                        text-xs
                        font-semibold
                        text-amber
                      "
                    >
                      {formatTime(endTime)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={endTime}
                    onChange={
                      handleEndChange
                    }
                    disabled={!duration}
                    className="audio-range"
                  />
                </div>
              </div>

              {/* Selection info */}
              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-raised
                  p-4
                  dark:border-ink-border
                  dark:bg-ink-raised
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
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
                      font-mono
                      text-[11px]
                      text-graphite-muted
                      dark:text-mist-muted
                    "
                  >
                    {formatTime(startTime)} →{" "}
                    {formatTime(endTime)}
                  </p>
                </div>

                <p
                  className="
                    font-mono
                    text-xs
                    font-semibold
                    text-amber
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

              {/* Buttons */}
              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                "
              >
                <button
                  type="button"
                  onClick={togglePlayback}
                  disabled={!duration}
                  className="
                    inline-flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-graphite
                    transition-all
                    hover:border-amber/50
                    hover:text-amber
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    dark:border-ink-border
                    dark:bg-ink-surface
                    dark:text-mist
                    dark:hover:border-amber/50
                    dark:hover:text-amber
                  "
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause Preview
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Preview Selection
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={!duration}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-paper-border
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-graphite-muted
                    transition-colors
                    hover:border-amber/50
                    hover:text-amber
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    dark:border-ink-border
                    dark:text-mist-muted
                    dark:hover:border-amber/50
                    dark:hover:text-amber
                  "
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
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
                  bg-amber
                  px-5
                  py-3.5
                  text-sm
                  font-semibold
                  text-ink
                  transition-all
                  duration-200
                  hover:opacity-90
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
                border-amber/20
                bg-amber/5
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
                  text-amber
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
                border-amber/20
                bg-amber/5
                p-5
                dark:bg-amber/5
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
                    bg-amber/10
                    text-amber
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
                  bg-amber
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-ink
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

      {/* Range styling */}
      <style jsx global>{`
        .audio-range {
          width: 100%;
          height: 6px;
          appearance: none;
          -webkit-appearance: none;
          border-radius: 9999px;
          background: rgb(245 158 11 / 0.15);
          cursor: pointer;
        }

        .audio-range::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: rgb(245 158 11);
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgb(245 158 11 / 0.4);
          cursor: grab;
        }

        .audio-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: rgb(245 158 11);
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgb(245 158 11 / 0.4);
          cursor: grab;
        }

        .audio-range:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </main>
  );
}