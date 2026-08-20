"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Upload,
  Play,
  Pause,
  Music,
  RefreshCw,
  Scissors,
  Clock,
  Download,
  ChevronDown,
  CheckCircle2,
  Pencil,
} from "lucide-react";

import { useToolResult } from "@/components/library/ToolResult";
import { SaveToLibrary } from "@/components/library/SaveToLibrary";
import { downloadBlob } from "@/lib/audio/audio-utils";

export default function RingtoneMakerPage() {
  const { setResult, showError, result, renameValue, setRenameValue, downloadName, setInlineMode } = useToolResult();

  useEffect(() => {
    // request inline result UI so provider hides the global fallback
    setInlineMode?.(true);
    return () => setInlineMode?.(false);
  }, [setInlineMode]);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [startTimeInput, setStartTimeInput] =
    useState("0.00");

  const [endTimeInput, setEndTimeInput] =
    useState("30.00");

  const [format, setFormat] =
    useState("mp3");

  const [isDropdownOpen, setIsDropdownOpen] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [audioBufferRef, setAudioBufferRef] =
    useState<AudioBuffer | null>(null);

  const [waveformPeaks, setWaveformPeaks] =
    useState<number[]>([]);

  const [draggingHandle, setDraggingHandle] =
    useState<"start" | "end" | null>(null);

  const audioRef =
    useRef<HTMLAudioElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  /*
   * ---------------------------------------------------------
   * SAFE START / END VALUES
   * ---------------------------------------------------------
   */

  const startTime =
    duration > 0
      ? Math.min(
          Math.max(
            0,
            parseFloat(startTimeInput) || 0
          ),
          Math.max(0, duration - 0.1)
        )
      : 0;

  const endTime =
    duration > 0
      ? Math.min(
          duration,
          Math.max(
            startTime + 0.1,
            parseFloat(endTimeInput) ||
              startTime + 5
          )
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * PERCENTAGES
   * ---------------------------------------------------------
   */

  const startPercent =
    duration > 0
      ? (startTime / duration) * 100
      : 0;

  const endPercent =
    duration > 0
      ? (endTime / duration) * 100
      : 100;

  const playheadPercent =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  /*
   * ---------------------------------------------------------
   * SEEK
   * ---------------------------------------------------------
   */

  const handleRangeSeek = (time: number) => {
    if (!audioRef.current || duration <= 0) {
      return;
    }

    const safeTime = Math.max(
      0,
      Math.min(duration, time)
    );

    audioRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  };

  /*
   * ---------------------------------------------------------
   * CHANGE START
   * ---------------------------------------------------------
   */

  const handleStartTimeChange = (
    time: number
  ) => {
    if (duration <= 0) return;

    const nextStart = Math.max(
      0,
      Math.min(time, endTime - 0.1)
    );

    setStartTimeInput(
      nextStart.toFixed(2)
    );

    if (
      audioRef.current &&
      audioRef.current.currentTime < nextStart
    ) {
      handleRangeSeek(nextStart);
    }
  };

  /*
   * ---------------------------------------------------------
   * CHANGE END
   * ---------------------------------------------------------
   */

  const handleEndTimeChange = (
    time: number
  ) => {
    if (duration <= 0) return;

    const nextEnd = Math.min(
      duration,
      Math.max(startTime + 0.1, time)
    );

    setEndTimeInput(
      nextEnd.toFixed(2)
    );

    if (
      audioRef.current &&
      audioRef.current.currentTime > nextEnd
    ) {
      handleRangeSeek(startTime);
    }
  };

  /*
   * ---------------------------------------------------------
   * DROPDOWN OUTSIDE CLICK
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setIsDropdownOpen(false);
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

  /*
   * ---------------------------------------------------------
   * LOAD SELECTED FILE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedFile) {
      setAudioUrl(null);
      setAudioBufferRef(null);
      setWaveformPeaks([]);
      setDuration(0);
      setCurrentTime(0);
      setStartTimeInput("0.00");
      setEndTimeInput("30.00");
      setIsPlaying(false);

      return;
    }

    const url =
      URL.createObjectURL(selectedFile);

    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer =
          e.target?.result as ArrayBuffer;

        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error(
            "AudioContext is not supported in this browser."
          );
        }

        const audioCtx =
          new AudioContextClass();

        const decodedBuffer =
          await audioCtx.decodeAudioData(
            arrayBuffer
          );

        setAudioBufferRef(
          decodedBuffer
        );

        const audioDur =
          decodedBuffer.duration;

        setDuration(audioDur);

        const initialEnd =
          Math.min(30, audioDur);

        setStartTimeInput("0.00");

        setEndTimeInput(
          initialEnd.toFixed(2)
        );

        /*
         * Generate waveform
         */

        const rawData =
          decodedBuffer.getChannelData(0);

        const samples = 100;

        const blockSize = Math.max(
          1,
          Math.floor(
            rawData.length / samples
          )
        );

        const filteredData: number[] = [];

        for (
          let i = 0;
          i < samples;
          i++
        ) {
          const blockStart =
            blockSize * i;

          let sum = 0;

          for (
            let j = 0;
            j < blockSize &&
            blockStart + j <
              rawData.length;
            j++
          ) {
            sum += Math.abs(
              rawData[
                blockStart + j
              ] || 0
            );
          }

          filteredData.push(
            sum / blockSize
          );
        }

        const maxValue = Math.max(
          ...filteredData,
          0.01
        );

        const normalized =
          filteredData.map(
            (value) => {
              const percentage =
                (value / maxValue) *
                100;

              return Math.max(
                12,
                Math.min(
                  95,
                  percentage
                )
              );
            }
          );

        setWaveformPeaks(
          normalized
        );

        await audioCtx.close();
      } catch (error) {
        console.error(
          "Error decoding audio:",
          error
        );
      }
    };

    reader.readAsArrayBuffer(
      selectedFile
    );

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  /*
   * ---------------------------------------------------------
   * FILE INPUT
   * ---------------------------------------------------------
   */

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (file) {
      setSelectedFile(file);
    }

    e.target.value = "";
  };

  /*
   * ---------------------------------------------------------
   * FILE DROP
   * ---------------------------------------------------------
   */

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    const file =
      e.dataTransfer.files?.[0];

    if (file) {
      setSelectedFile(file);
    }
  };

  /*
   * ---------------------------------------------------------
   * PLAY / PAUSE
   * ---------------------------------------------------------
   */

  const togglePlay = async () => {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (
      audioRef.current.currentTime <
        startTime ||
      audioRef.current.currentTime >=
        endTime
    ) {
      audioRef.current.currentTime =
        startTime;

      setCurrentTime(startTime);
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error(
        "Playback error:",
        error
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * TIME FORMAT
   * ---------------------------------------------------------
   */

  const formatTime = (
    secs: number
  ) => {
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

  /*
   * ---------------------------------------------------------
   * WAVEFORM POINTER POSITION
   * ---------------------------------------------------------
   */

  const getTimeFromPointer = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    if (duration <= 0) {
      return 0;
    }

    const waveform =
      event.currentTarget.closest(
        "[data-waveform]"
      ) as HTMLElement | null;

    if (!waveform) {
      return 0;
    }

    const rect =
      waveform.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const ratio =
      Math.max(
        0,
        Math.min(
          1,
          x / rect.width
        )
      );

    return ratio * duration;
  };

  /*
   * ---------------------------------------------------------
   * START HANDLE DRAG
   * ---------------------------------------------------------
   */

  const handleStartPointerDown = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setDraggingHandle("start");
  };

  const handleStartPointerMove = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    if (
      draggingHandle !== "start" ||
      duration <= 0
    ) {
      return;
    }

    event.preventDefault();

    const time =
      getTimeFromPointer(event);

    handleStartTimeChange(time);
  };

  const handleStartPointerUp = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    event.preventDefault();

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    setDraggingHandle(null);
  };

  /*
   * ---------------------------------------------------------
   * END HANDLE DRAG
   * ---------------------------------------------------------
   */

  const handleEndPointerDown = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setDraggingHandle("end");
  };

  const handleEndPointerMove = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    if (
      draggingHandle !== "end" ||
      duration <= 0
    ) {
      return;
    }

    event.preventDefault();

    const time =
      getTimeFromPointer(event);

    handleEndTimeChange(time);
  };

  const handleEndPointerUp = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    event.preventDefault();

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    setDraggingHandle(null);
  };

  /*
   * ---------------------------------------------------------
   * STOP DRAGGING
   * ---------------------------------------------------------
   */

  const stopDragging = () => {
    setDraggingHandle(null);
  };

  /*
   * ---------------------------------------------------------
   * WAVEFORM CLICK / SEEK
   * ---------------------------------------------------------
   */

  const handleWaveformClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (draggingHandle) {
      return;
    }

    if (duration <= 0) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const ratio =
      Math.max(
        0,
        Math.min(
          1,
          x / rect.width
        )
      );

    const time =
      ratio * duration;

    handleRangeSeek(time);
  };

  /*
   * ---------------------------------------------------------
   * START INPUT
   * ---------------------------------------------------------
   */

  const handleStartInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      e.target.value;

    if (
      value === "" ||
      /^\d*\.?\d{0,2}$/.test(value)
    ) {
      setStartTimeInput(value);
    }
  };

  /*
   * ---------------------------------------------------------
   * END INPUT
   * ---------------------------------------------------------
   */

  const handleEndInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      e.target.value;

    if (
      value === "" ||
      /^\d*\.?\d{0,2}$/.test(value)
    ) {
      setEndTimeInput(value);
    }
  };

  /*
   * ---------------------------------------------------------
   * START INPUT BLUR
   * ---------------------------------------------------------
   */

  const handleStartInputBlur = () => {
    const parsed =
      parseFloat(startTimeInput);

    if (!Number.isFinite(parsed)) {
      setStartTimeInput(
        startTime.toFixed(2)
      );

      return;
    }

    const nextStart =
      Math.max(
        0,
        Math.min(
          parsed,
          Math.max(
            0,
            endTime - 0.1
          )
        )
      );

    setStartTimeInput(
      nextStart.toFixed(2)
    );

    if (audioRef.current) {
      audioRef.current.currentTime =
        nextStart;

      setCurrentTime(
        nextStart
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * END INPUT BLUR
   * ---------------------------------------------------------
   */

  const handleEndInputBlur = () => {
    const parsed =
      parseFloat(endTimeInput);

    if (!Number.isFinite(parsed)) {
      const fallback =
        Math.min(
          duration,
          startTime + 5
        );

      setEndTimeInput(
        fallback.toFixed(2)
      );

      return;
    }

    const nextEnd =
      Math.min(
        duration,
        Math.max(
          startTime + 0.1,
          parsed
        )
      );

    setEndTimeInput(
      nextEnd.toFixed(2)
    );

    if (
      audioRef.current &&
      audioRef.current.currentTime >
        nextEnd
    ) {
      audioRef.current.currentTime =
        startTime;

      setCurrentTime(
        startTime
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * CREATE RINGTONE
   * ---------------------------------------------------------
   */

  const handleCreateRingtone =
    async () => {
      if (
        !selectedFile ||
        !audioBufferRef
      ) {
        return;
      }

      setIsProcessing(true);

      try {
        const sampleRate =
          audioBufferRef.sampleRate;

        const startSample =
          Math.floor(
            startTime * sampleRate
          );

        const endSample =
          Math.floor(
            Math.min(
              endTime,
              duration
            ) * sampleRate
          );

        const frameCount =
          Math.max(
            0,
            endSample -
              startSample
          );

        if (frameCount <= 0) {
          throw new Error(
            "Invalid ringtone duration."
          );
        }

        const formData =
          new FormData();

        formData.append(
          "file",
          selectedFile
        );

        formData.append(
          "startTime",
          startTime.toString()
        );

        formData.append(
          "endTime",
          endTime.toString()
        );

        formData.append(
          "format",
          format
        );

        const response =
          await fetch(
            "/api/other/ringtone-maker",
            {
              method: "POST",
              body: formData,
            }
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          throw new Error(
            data.error ||
              `Ringtone creation failed (HTTP ${response.status}).`
          );
        }

        const encoded =
          await response.blob();

        const lastDot =
          selectedFile.name.lastIndexOf(
            "."
          );

        const cleanName =
          lastDot > 0
            ? selectedFile.name.substring(
                0,
                lastDot
              )
            : selectedFile.name;

        const extension =
          format === "m4r"
            ? "m4r"
            : format === "wav"
            ? "wav"
            : "mp3";

        const fileName =
          `${cleanName}-ringtone.${extension}`;

        setResult({
          blob: encoded,
          defaultFileName:
            fileName,
          extension,
          fallbackBaseName:
            "ringtone",
        });
      } catch (err) {
        console.error(
          "Error generating ringtone:",
          err
        );

        showError(
          err instanceof Error ? err.message : "Failed to create ringtone."
        );
      } finally {
        setIsProcessing(false);
      }
    };

  /*
   * ---------------------------------------------------------
   * FORMAT OPTIONS
   * ---------------------------------------------------------
   */

  const formatOptions = [
    {
      value: "mp3",
      label: "MP3 Audio (.mp3)",
    },
    {
      value: "m4r",
      label: "iPhone Ringtone (.m4r)",
    },
    {
      value: "wav",
      label: "WAV Audio (.wav)",
    },
  ];

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}

        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/20 shadow-sm">
            <Scissors className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Ringtone Maker
          </h1>

          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Create custom ringtones from your
            favorite audio with precision
            trimming and instant export.
          </p>
        </div>

        {/* Main Card */}

        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {/* Upload */}

          {!selectedFile && (
            <div
              onClick={() =>
                fileInputRef.current?.click()
              }
              onDragOver={(e) =>
                e.preventDefault()
              }
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-orange-500 transition-all bg-card/50 cursor-pointer flex flex-col items-center space-y-3 select-none"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".mp3,.wav,.m4r,.aac,.ogg,.flac"
                onChange={
                  handleFileChange
                }
              />

              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-sm pointer-events-none">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1 pointer-events-none">
                <span className="text-base font-semibold text-foreground block">
                  Upload audio to create ringtone
                </span>

                <span className="text-sm text-muted-foreground block">
                  Drag and drop your audio file
                  here or click to browse
                </span>

                <span className="text-xs text-muted-foreground/75 block pt-1">
                  MP3, WAV, M4R, AAC, OGG, FLAC
                </span>
              </div>
            </div>
          )}

          {/* Audio Editor */}

          {selectedFile && audioUrl && (
            <div className="space-y-6">

              {/* File Bar */}

              <div className="flex items-center justify-between bg-muted/50 border border-border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">
                      Target Audio Track
                    </span>

                    <span className="text-sm font-semibold text-foreground truncate block">
                      {selectedFile.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setSelectedFile(null)
                  }
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>

              {/* Player */}

              <div className="bg-card border border-border rounded-2xl overflow-hidden p-6 text-foreground shadow-inner space-y-6">

                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => {
                    if (!audioRef.current) {
                      return;
                    }

                    const current =
                      audioRef.current.currentTime;

                    setCurrentTime(current);

                    if (
                      current >= endTime &&
                      isPlaying
                    ) {
                      audioRef.current.pause();

                      audioRef.current.currentTime =
                        startTime;

                      setCurrentTime(
                        startTime
                      );

                      setIsPlaying(false);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (
                      audioRef.current &&
                      Number.isFinite(
                        audioRef.current.duration
                      )
                    ) {
                      setDuration(
                        audioRef.current.duration
                      );
                    }
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(
                      startTime
                    );
                  }}
                  className="hidden"
                />

                {/* Top Controls */}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 md:space-x-4 min-w-0">

                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 md:w-14 md:h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-lg cursor-pointer flex-shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-1" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <span className="text-[11px] md:text-xs text-muted-foreground block font-medium">
                        Trimming Window
                      </span>

                      <span className="text-xs md:text-sm font-bold text-foreground whitespace-nowrap">
                        {formatTime(startTime)}
                        {" – "}
                        {formatTime(endTime)}
                        {" ("}
                        {Math.max(
                          0,
                          Math.round(
                            endTime -
                              startTime
                          )
                        )}
                        s)
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[11px] md:text-xs text-muted-foreground block font-medium">
                      Current Playhead
                    </span>

                    <span className="text-[11px] md:text-sm font-mono font-bold text-orange-500 whitespace-nowrap block">
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
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />

                      <span>
                        Drag the lines to select ringtone segment
                      </span>
                    </span>

                    <span className="hidden sm:block">
                      Max recommended: 30s
                    </span>
                  </div>

                  {/* WAVEFORM */}

                  <div
                    data-waveform
                    onClick={
                      handleWaveformClick
                    }
                    onPointerMove={
                      (event) => {
                        if (
                          draggingHandle ===
                          "start"
                        ) {
                          handleStartTimeChange(
                            getTimeFromPointer(
                              event
                            )
                          );
                        }

                        if (
                          draggingHandle ===
                          "end"
                        ) {
                          handleEndTimeChange(
                            getTimeFromPointer(
                              event
                            )
                          );
                        }
                      }
                    }
                    onPointerUp={
                      stopDragging
                    }
                    onPointerCancel={
                      stopDragging
                    }
                    className={`relative h-32 bg-orange-500/5 dark:bg-stone-950 rounded-xl border border-orange-500/20 dark:border-border px-4 flex items-center overflow-hidden select-none touch-none ${
                      draggingHandle
                        ? "cursor-grabbing"
                        : "cursor-pointer"
                    }`}
                  >

                    {/* Waveform */}

                    <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between pointer-events-none">
                      {waveformPeaks.length >
                      0 ? (
                        waveformPeaks.map(
                          (
                            height,
                            idx
                          ) => {
                            const barProg =
                              (idx /
                                waveformPeaks.length) *
                              100;

                            const isInRange =
                              barProg >=
                                startPercent &&
                              barProg <=
                                endPercent;

                            return (
                              <div
                                key={idx}
                                className={`w-1 rounded-full ${
                                  isInRange
                                    ? "bg-orange-500 shadow-md shadow-orange-500/40"
                                    : "bg-orange-500/20 dark:bg-white/30"
                                }`}
                                style={{
                                  height: `${height}%`,
                                }}
                              />
                            );
                          }
                        )
                      ) : (
                        <div className="w-full text-center text-xs text-muted-foreground">
                          Generating waveform
                          peaks...
                        </div>
                      )}
                    </div>

                    {/* Selected Region */}

                    <div
                      className="absolute top-0 bottom-0 bg-orange-500/10 border-l border-r border-orange-500/30 pointer-events-none"
                      style={{
                        left: `calc(${startPercent}% + 16px)`,
                        right: `calc(${100 - endPercent}% + 16px)`,
                      }}
                    />

                    {/* PLAYHEAD */}

                    {duration > 0 && (
                      <div
                        className="absolute top-1 bottom-1 w-0.5 bg-orange-700 dark:bg-orange-400 z-20 pointer-events-none shadow-[0_0_5px_rgba(249,115,22,0.45)]"
                        style={{
                          left: `calc(${playheadPercent}% + ${
                            16 -
                            (playheadPercent *
                              32) /
                              100
                          }px)`,
                        }}
                      />
                    )}

                    {/* =================================================
                        START HANDLE
                        VISIBLE PART = ONLY 2PX LINE
                       ================================================= */}

                    {duration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 z-40"
                        style={{
                          left: `calc(${startPercent}% + ${
                            16 -
                            (startPercent *
                              32) /
                              100
                          }px)`,
                          transform:
                            "translateX(-50%)",
                        }}
                      >
                        {/* Draggable button (thin line + small dot) */}
                        <button
                          onPointerDown={handleStartPointerDown}
                          onPointerMove={handleStartPointerMove}
                          onPointerUp={handleStartPointerUp}
                          onPointerCancel={handleStartPointerUp}
                          aria-label="Drag start time"
                          role="slider"
                          tabIndex={0}
                          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 cursor-ew-resize touch-none"
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.45)]" />
                          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500" />
                        </button>
                      </div>
                    )}

                    {/* =================================================
                        END HANDLE
                        THIN DRAGGER
                       ================================================= */}

                    {duration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 z-40"
                        style={{
                          left: `calc(${endPercent}% + ${
                            16 -
                            (endPercent *
                              32) /
                              100
                          }px)`,
                          transform:
                            "translateX(-50%)",
                        }}
                      >
                        <button
                          onPointerDown={handleEndPointerDown}
                          onPointerMove={handleEndPointerMove}
                          onPointerUp={handleEndPointerUp}
                          onPointerCancel={handleEndPointerUp}
                          aria-label="Drag end time"
                          role="slider"
                          tabIndex={0}
                          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 cursor-ew-resize touch-none"
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.45)]" />
                          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-orange-500" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Waveform Times */}

                  <div className="flex justify-between text-[11px] text-muted-foreground font-mono px-1">
                    <span>
                      0:00
                    </span>

                    <span>
                      {formatTime(
                        duration
                      )}
                    </span>
                  </div>
                </div>

                {/* Input Fields */}

                <div className="grid grid-cols-2 gap-3 pt-2">

                  {/* Start */}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      Start Time (s)
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        startTimeInput
                      }
                      onChange={
                        handleStartInputChange
                      }
                      onBlur={
                        handleStartInputBlur
                      }
                      className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-500 text-center"
                    />
                  </div>

                  {/* End */}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      End Time (s)
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        endTimeInput
                      }
                      onChange={
                        handleEndInputChange
                      }
                      onBlur={
                        handleEndInputBlur
                      }
                      className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-500 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Format + Duration */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Format */}

                <div
                  ref={dropdownRef}
                  className="bg-muted/40 border border-border rounded-2xl p-4 space-y-2 relative z-50"
                >
                  <label className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                    Output Format
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setIsDropdownOpen(
                        !isDropdownOpen
                      )
                    }
                    className="w-full bg-card border border-border text-foreground px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer shadow-sm"
                  >
                    <span>
                      {
                        formatOptions.find(
                          (o) =>
                            o.value ===
                            format
                        )?.label
                      }
                    </span>

                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        isDropdownOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute left-4 right-4 top-full mt-1.5 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-[9999] py-1">
                      {formatOptions.map(
                        (opt) => (
                          <div
                            key={
                              opt.value
                            }
                            onClick={() => {
                              setFormat(
                                opt.value
                              );

                              setIsDropdownOpen(
                                false
                              );
                            }}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                              format ===
                              opt.value
                                ? "bg-orange-500/15 text-orange-500 font-semibold"
                                : "text-zinc-900 dark:text-zinc-100 hover:bg-orange-500/10 hover:text-orange-500 dark:hover:text-orange-400"
                            }`}
                          >
                            {opt.label}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Duration */}

                <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                    Estimated Duration
                  </span>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-foreground">
                      {Math.max(
                        0,
                        Math.round(
                          endTime -
                            startTime
                        )
                      )}{" "}
                      Seconds
                    </span>

                    <span className="text-xs text-muted-foreground font-mono text-right">
                      Segment:{" "}
                      {formatTime(
                        startTime
                      )}{" "}
                      -{" "}
                      {formatTime(
                        endTime
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Download */}

              <div className="pt-2">
                <button
                  onClick={
                    handleCreateRingtone
                  }
                  disabled={
                    isProcessing
                  }
                  className="w-full py-3.5 px-6 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5 flex-shrink-0" />

                  <span>
                    {isProcessing
                      ? "Processing Ringtone..."
                      : "Export & Download Ringtone"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





