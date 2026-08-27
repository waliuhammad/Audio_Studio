"use client";

import React, { useState, useRef, DragEvent, useEffect } from "react";
import Link from "next/link";
import { 
  Upload, 
  Layers, 
  Trash2, 
  Download, 
  AlertCircle, 
  Loader2,
  Plus,
  Play,
  Square,
  Clock,
  Music,
  GripVertical
} from "lucide-react";
import { useToolResult } from "@/components/library/ToolResult";
import { RangeHandleLayer } from "@/components/audio/RangeHandleLayer";

type AudioFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  duration: number;
  startTimeStr: string;
  endTimeStr: string;
};

const WAVEFORM_BARS = [
  12, 24, 40, 18, 32, 54, 20, 14, 22, 38, 48, 16, 28,
  60, 34, 18, 42, 24, 16, 44, 52, 20, 36, 14, 26, 48,
  30, 18, 42, 56, 22, 12, 38, 24, 46, 16, 32, 50, 20,
  14, 28, 44, 34, 18, 52, 22, 12, 40, 26, 36, 14, 24,
];

const formatTimeDisplay = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const getTimelineMarkers = (duration: number): number[] => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [0];
  }

  const step =
    duration <= 10 ? 1 :
    duration <= 30 ? 5 :
    duration <= 60 ? 10 :
    duration <= 180 ? 30 :
    duration <= 600 ? 60 : 120;

  const markers: number[] = [];
  for (let time = 0; time <= duration; time += step) {
    markers.push(Math.min(time, duration));
  }

  if (markers[markers.length - 1] !== duration) {
    markers.push(duration);
  }

  return markers;
};

export default function AudioMergerPage() {
  const { setResult } = useToolResult();

  const [items, setItems] = useState<AudioFileItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "merging" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Result of the last merge — kept locally so we can render a lightweight
  // inline rename + download row instead of a separate "result card".
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>("audio-merged.mp3");

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const waveformRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draggingPlayheadId, setDraggingPlayheadId] = useState<string | null>(null);
  
  // State for drag-and-drop reordering of items
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(audioUrl);
      };
    });
  };

  const parseTimeString = (timeStr: string, maxDuration: number): number => {
    if (!timeStr) return 0;
    const trimmed = timeStr.trim();
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      const mins = parseFloat(parts[0] || "0") || 0;
      const secs = parseFloat(parts[1] || "0") || 0;
      const total = mins * 60 + secs;
      return maxDuration > 0 ? Math.min(total, maxDuration) : total;
    }
    const val = parseFloat(trimmed) || 0;
    return maxDuration > 0 ? Math.min(val, maxDuration) : val;
  };

  const handleFilesSelected = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const newItems: AudioFileItem[] = [];
    
    for (const file of fileArray) {
      if (file.size > 100 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds the 100 MB limit.`);
        setStatus("error");
        continue;
      }
      const duration = await getAudioDuration(file);
      const defaultEnd = duration ? Number(duration.toFixed(1)) : 10;
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        duration: duration || 60,
        startTimeStr: "00:00",
        endTimeStr: formatTimeDisplay(defaultEnd),
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const handleDropUpload = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    if (playingId === id) {
      stopPreview();
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setStatus("idle");
  };

  // Drag and Drop handlers for item reordering
  const handleCardDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleCardDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const updated = [...items];
    const draggedItem = updated[draggedItemIndex];
    if (!draggedItem) return;

    updated.splice(draggedItemIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setItems(updated);
  };

  const handleCardDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const updateTimeStringField = (id: string, field: "startTimeStr" | "endTimeStr", value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const updateRangeFromHandle = (
    id: string,
    field: "startTimeStr" | "endTimeStr",
    time: number
  ) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        const start = parseTimeString(item.startTimeStr, item.duration);
        const end = parseTimeString(item.endTimeStr, item.duration);
        const nextTime = field === "startTimeStr"
          ? Math.max(0, Math.min(time, end - 0.1))
          : Math.min(item.duration, Math.max(time, start + 0.1));

        return {
          ...item,
          [field]: formatTimeDisplay(nextTime),
        };
      })
    );
  };

  const seekItemFromTimeline = (item: AudioFileItem, time: number) => {
    const { startSec, endSec } = getPreviewBounds(item);
    const safeTime = Math.max(startSec, Math.min(endSec, time));
    const currentAudio = audioPreviewRef.current;

    if (playingId === item.id && currentAudio) {
      currentAudio.currentTime = safeTime;
    }

    setCurrentPlaybackTime(safeTime);
  };

  const getPreviewBounds = (item: AudioFileItem) => {
    const startSec = Math.max(
      0,
      Math.min(item.duration, parseTimeString(item.startTimeStr, item.duration))
    );

    const parsedEnd = parseTimeString(item.endTimeStr, item.duration);
    const endSec =
      parsedEnd > startSec
        ? Math.min(item.duration, parsedEnd)
        : item.duration;

    return {
      startSec,
      endSec,
      hasBoundarySelection:
        startSec > 0 || (endSec > 0 && endSec < item.duration),
    };
  };

  const getTimeFromWaveform = (
    item: AudioFileItem,
    clientX: number
  ): number | null => {
    const waveform = waveformRefs.current[item.id];
    if (!waveform || item.duration <= 0) return null;

    const rect = waveform.getBoundingClientRect();
    if (rect.width <= 0) return null;

    const percent = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );

    const rawTime = percent * item.duration;
    const { startSec, endSec } = getPreviewBounds(item);
    return Math.max(startSec, Math.min(endSec, rawTime));
  };

  const stopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current = null;
    }
    setPlayingId(null);
    setCurrentPlaybackTime(0);
    setDraggingPlayheadId(null);
  };

  const startPreviewAt = (item: AudioFileItem, requestedTime: number) => {
    // Stop any current audio instantly before loading new one
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }

    const audioUrl = URL.createObjectURL(item.file);
    const audio = new Audio(audioUrl);
    audioPreviewRef.current = audio;

    const { startSec, endSec, hasBoundarySelection } = getPreviewBounds(item);
    const safeTime = Math.max(
      startSec,
      Math.min(
        endSec,
        Number.isFinite(requestedTime) ? requestedTime : startSec
      )
    );

    audio.currentTime = safeTime;
    setCurrentPlaybackTime(safeTime);
    setPlayingId(item.id);

    const handleTimeUpdate = () => {
      if (audioPreviewRef.current !== audio) return;
      const nextTime = audio.currentTime;
      setCurrentPlaybackTime(nextTime);

      if (hasBoundarySelection && nextTime >= endSec) {
        audio.pause();
        audio.currentTime = endSec;
        setCurrentPlaybackTime(endSec);
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
        return;
      }

      if (!hasBoundarySelection && nextTime >= item.duration) {
        audio.pause();
        audio.currentTime = item.duration;
        setCurrentPlaybackTime(item.duration);
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    audio.onended = () => {
      const finalTime = hasBoundarySelection ? endSec : item.duration;
      setCurrentPlaybackTime(finalTime);
      setPlayingId(null);
      URL.revokeObjectURL(audioUrl);
    };

    void audio.play().catch(() => {
      setPlayingId(null);
      URL.revokeObjectURL(audioUrl);
    });
  };

  const togglePreview = (item: AudioFileItem) => {
    if (playingId === item.id) {
      stopPreview();
      return;
    }
    const { startSec } = getPreviewBounds(item);
    startPreviewAt(item, startSec);
  };

  const seekPreviewFromWaveform = (
    item: AudioFileItem,
    clientX: number,
    shouldPlay: boolean
  ) => {
    const targetTime = getTimeFromWaveform(item, clientX);
    if (targetTime === null) return;

    const currentAudio = audioPreviewRef.current;
    if (playingId === item.id && currentAudio) {
      currentAudio.currentTime = targetTime;
      setCurrentPlaybackTime(targetTime);

      if (shouldPlay && currentAudio.paused) {
        void currentAudio.play().catch(() => {});
      }
      return;
    }

    if (shouldPlay) {
      startPreviewAt(item, targetTime);
    } else {
      setCurrentPlaybackTime(targetTime);
    }
  };

  const handleWaveformPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    item: AudioFileItem
  ) => {
    event.preventDefault();
    setDraggingPlayheadId(item.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekPreviewFromWaveform(item, event.clientX, true);
  };

  const handleWaveformPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    item: AudioFileItem
  ) => {
    if (draggingPlayheadId !== item.id) return;
    seekPreviewFromWaveform(item, event.clientX, false);
  };

  const handleWaveformPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    item: AudioFileItem
  ) => {
    if (draggingPlayheadId === item.id) {
      seekPreviewFromWaveform(item, event.clientX, false);
    }
    setDraggingPlayheadId(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWaveformPointerCancel = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    setDraggingPlayheadId(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const handleReset = () => {
    stopPreview();
    setItems([]);
    setStatus("idle");
    setErrorMessage("");
    setResultBlob(null);
    setDownloadFileName("audio-merged.mp3");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMergeAndDownload = async () => {
    if (items.length < 2) {
      setErrorMessage("Please select at least 2 audio files to merge.");
      setStatus("error");
      return;
    }

    stopPreview();
    setStatus("merging");
    setErrorMessage("");
    setResultBlob(null);

    try {
      const formData = new FormData();
      items.forEach((item) => {
        const startSec = parseTimeString(item.startTimeStr, item.duration);
        const endSec = parseTimeString(item.endTimeStr, item.duration);

        formData.append("files", item.file);
        formData.append("startTimes", startSec.toString());
        formData.append("endTimes", endSec.toString());
      });

      const response = await fetch("/api/audio/merge", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to merge audio files.");
        } else {
          throw new Error("Audio merger API route was not found. Check app/api/audio/merge/route.ts.");
        }
      }

      if (contentType.includes("application/json")) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to merge audio files.");
      }

      const blob = await response.blob();

      // Keep the library-level result in sync (used elsewhere in the app),
      // but drive our own inline rename + download row from local state.
      setResult({
        blob,
        defaultFileName: "audio-merged.mp3",
        extension: "mp3",
        fallbackBaseName: "audio-merged",
      });

      setResultBlob(blob);
      setDownloadFileName("audio-merged.mp3");
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during merging.");
      setStatus("error");
    }
  };

  const handleDownloadFile = () => {
    if (!resultBlob) return;

    const trimmedName = downloadFileName.trim() || "audio-merged";
    const finalName = trimmedName.toLowerCase().endsWith(".mp3")
      ? trimmedName
      : `${trimmedName}.mp3`;

    const url = URL.createObjectURL(resultBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-semibold tracking-wide uppercase">
            <Layers className="w-3.5 h-3.5" /> Audio Tool
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Audio Merger</h1>
          <p className="text-muted-foreground">
            Visualize audio tracks, preview waveforms with timestamps, drag and drop to reorder, and combine audio files seamlessly.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-8">

          {/* Error Banner */}
          {status === "error" && errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Processing Error</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDropUpload}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging 
                ? "border-orange-500 bg-orange-500/10" 
                : "border-border hover:border-orange-500/50 bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold mb-1">Click to upload or drag & drop audio files</h3>
            <p className="text-xs text-muted-foreground mb-3">
              MP3, WAV, M4A, OGG, AAC, FLAC, WEBM (Max 100 MB per file)
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium shadow-sm hover:bg-orange-600 transition-colors">
              <Plus className="w-4 h-4" /> Add Audio Files
            </span>
          </div>

          {/* Selected Files List with Drag-and-Drop Reordering */}
          {items.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  Selected Files & Timeline Control ({items.length})
                </h4>
                <span className="text-xs text-muted-foreground">
                  Drag the grip handle to reorder files
                </span>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  const isPlayingThis = playingId === item.id;
                  const startSec = parseTimeString(item.startTimeStr, item.duration);
                  const endSec = parseTimeString(item.endTimeStr, item.duration);

                  const cursorTime = isPlayingThis ? currentPlaybackTime : startSec;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleCardDragStart(index)}
                      onDragOver={(e) => handleCardDragOver(e, index)}
                      onDragEnd={handleCardDragEnd}
                      className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4 transition-all cursor-grab active:cursor-grabbing"
                    >
                      {/* File Info Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="cursor-grab text-muted-foreground hover:text-foreground">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-sm truncate">{item.name}</h5>
                            <p className="text-xs text-muted-foreground">
                              {(item.size / (1024 * 1024)).toFixed(2)} MB • {formatTimeDisplay(item.duration)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors ml-1"
                            title="Remove File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Waveform Preview */}
                      <div
                        ref={(element) => {
                          waveformRefs.current[item.id] = element;
                        }}
                        onPointerDown={(event) =>
                          handleWaveformPointerDown(event, item)
                        }
                        onPointerMove={(event) =>
                          handleWaveformPointerMove(event, item)
                        }
                        onPointerUp={(event) =>
                          handleWaveformPointerUp(event, item)
                        }
                        onPointerCancel={handleWaveformPointerCancel}
                        className={`relative h-[150px] touch-none overflow-hidden rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-4 shadow-inner sm:h-[170px] sm:px-5 ${
                          item.duration > 0
                            ? "cursor-pointer"
                            : "cursor-default"
                        }`}
                      >
                        <div className="absolute inset-x-3 top-2 flex h-5 items-start justify-between sm:inset-x-5">
                          {getTimelineMarkers(item.duration).map((time, markerIndex) => (
                            <span
                              key={`${time}-${markerIndex}`}
                              className="absolute -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold leading-none text-orange-600 dark:text-orange-400 sm:text-[9px]"
                              style={{
                                left: item.duration > 0
                                  ? `${(time / item.duration) * 100}%`
                                  : "0%",
                              }}
                            >
                              {formatTimeDisplay(time)}
                            </span>
                          ))}
                        </div>

                        <div
                          className="absolute inset-x-3 top-8 bottom-7 overflow-hidden rounded-lg sm:inset-x-5"
                        >
                          <div className="absolute inset-0 flex items-center justify-between gap-[3px]">
                            {WAVEFORM_BARS.map((heightPx, barIndex) => (
                              <div
                                key={barIndex}
                                className="w-1 shrink-0 rounded-full bg-orange-500 transition-colors duration-150"
                                style={{ height: `${heightPx}px` }}
                              />
                            ))}
                          </div>

                          <RangeHandleLayer
                            duration={item.duration}
                            startTime={startSec}
                            endTime={endSec}
                            currentTime={cursorTime}
                            onStartChange={(time) => updateRangeFromHandle(item.id, "startTimeStr", time)}
                            onEndChange={(time) => updateRangeFromHandle(item.id, "endTimeStr", time)}
                            onSeek={(time) => seekItemFromTimeline(item, time)}
                          />
                        </div>

                        <div className="absolute inset-x-3 bottom-2 flex items-center justify-between sm:inset-x-5">
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:text-[9px]">
                            00:00
                          </span>
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:text-[9px]">
                            {formatTimeDisplay(cursorTime)}
                          </span>
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:text-[9px]">
                            {formatTimeDisplay(item.duration)}
                          </span>
                        </div>
                      </div>

                      {/* Time Inputs & Preview Button Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-orange-500" /> Start (mm:ss or s)
                          </span>
                          <input
                            type="text"
                            value={item.startTimeStr}
                            onChange={(e) => updateTimeStringField(item.id, "startTimeStr", e.target.value)}
                            placeholder="00:00"
                            className="px-3 py-2 rounded-xl border border-border bg-background font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-orange-500" /> End (mm:ss or s)
                          </span>
                          <input
                            type="text"
                            value={item.endTimeStr}
                            onChange={(e) => updateTimeStringField(item.id, "endTimeStr", e.target.value)}
                            placeholder="00:10"
                            className="px-3 py-2 rounded-xl border border-border bg-background font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 col-span-1 sm:col-span-2 justify-end">
                          <button
                            type="button"
                            onClick={() => togglePreview(item)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                              isPlayingThis 
                                ? "bg-orange-500 text-white border-orange-500 shadow-sm" 
                                : "border-border bg-background hover:bg-muted"
                            }`}
                          >
                            {isPlayingThis ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            {isPlayingThis ? "Stop Preview" : "Preview Audio"}
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={status === "merging"}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={handleMergeAndDownload}
                  disabled={status === "merging"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {status === "merging" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Merging Your Files...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Merge Audio
                    </>
                  )}
                </button>
              </div>

              {/* Inline rename + download row — replaces the separate result card */}
              {status === "success" && resultBlob && (
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-5 rounded-xl border border-border bg-muted/20">
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">
                      Rename
                    </label>
                    <input
                      type="text"
                      value={downloadFileName}
                      onChange={(e) => setDownloadFileName(e.target.value)}
                      placeholder="audio-merged.mp3"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-sm hover:bg-orange-600 transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
