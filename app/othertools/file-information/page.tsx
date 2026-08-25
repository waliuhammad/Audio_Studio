"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Info,
  Music,
  RefreshCw,
  FileText,
  Download,
  HardDrive,
  Clock,
  Activity,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function FileInformationPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [channels, setChannels] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [serverMetadata, setServerMetadata] = useState<any>(null);

  // Inline download state (replaces the separate popup card)
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsAnalyzing(true);
      setDownloadBlob(null);
      setDownloadFileName("");

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

          setDuration(decodedBuffer.duration);
          setSampleRate(decodedBuffer.sampleRate);
          setChannels(decodedBuffer.numberOfChannels);
        } catch (err) {
          console.error("Non-audio or unsupported media format for Web Audio API decoding", err);
          setDuration(null);
          setSampleRate(null);
          setChannels(null);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);

      // Send to backend API route for server-side verification/processing
      const sendToBackend = async () => {
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);

          const res = await fetch("/api/other/file-information", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.success) {
            setServerMetadata(data.metadata);
          }
        } catch (err) {
          console.error("Error communicating with backend API", err);
        }
      };
      sendToBackend();

      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
      setDuration(null);
      setSampleRate(null);
      setChannels(null);
      setServerMetadata(null);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const milliseconds = Math.floor((secs % 1) * 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}.${milliseconds.toString().padStart(3, "0")}s`;
  };

  const handleExportJson = () => {
    if (!serverMetadata && !selectedFile) return;

    const exportData = {
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      fileType: selectedFile?.type,
      lastModified: selectedFile?.lastModified ? new Date(selectedFile.lastModified).toISOString() : null,
      duration: duration,
      sampleRate: sampleRate,
      channels: channels,
      serverMetadata,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const baseName = selectedFile?.name.replace(/\.[^./\\]+$/, "") || "file";
    const defaultFileName = `${baseName}-metadata.json`;

    setDownloadBlob(blob);
    setDownloadFileName(defaultFileName);
  };

  const handleDownload = () => {
    if (!downloadBlob) return;

    const trimmedName = downloadFileName.trim() || "file-metadata.json";
    const finalName = trimmedName.toLowerCase().endsWith(".json")
      ? trimmedName
      : `${trimmedName}.json`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/20 shadow-sm">
            <Info className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            File Information
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            View detailed technical specifications, container attributes, and stream properties for your media files.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {!selectedFile && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-orange-500 transition-all bg-card/50 cursor-pointer flex flex-col items-center space-y-3 select-none relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*,video/*,.mp3,.wav,.m4r,.aac,.ogg,.flac,.mp4,.mov"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-sm pointer-events-none">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1 pointer-events-none">
                <span className="text-base font-semibold text-foreground block">
                  Upload media file to inspect metadata
                </span>
                <span className="text-sm text-muted-foreground block">
                  Drag and drop your audio or video file here or click to browse
                </span>
                <span className="text-xs text-muted-foreground/75 block pt-1">
                  MP3, WAV, M4R, AAC, OGG, FLAC, MP4, MOV, etc.
                </span>
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="space-y-6">

              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-muted/50 border border-border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">Inspected File</span>
                    <span className="text-sm font-semibold text-foreground truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Inspect Another</span>
                </button>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* General Properties Card */}
                <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
                    <HardDrive className="w-4 h-4 text-orange-500" />
                    <span>Container & File Attributes</span>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">File Name</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[200px]" title={selectedFile.name}>{selectedFile.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">File Size</span>
                      <span className="font-mono font-semibold text-foreground">{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">MIME Type</span>
                      <span className="font-mono text-foreground">{selectedFile.type || "Unknown / Binary"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Modified</span>
                      <span className="text-foreground text-xs">{new Date(selectedFile.lastModified).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Stream / Audio Properties Card */}
                <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
                    <Activity className="w-4 h-4 text-orange-500" />
                    <span>Stream & Audio Properties</span>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-mono font-semibold text-orange-500">
                        {isAnalyzing ? "Analyzing..." : duration !== null ? formatDuration(duration) : "N/A (Non-audio)"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Sample Rate</span>
                      <span className="font-mono text-foreground">
                        {isAnalyzing ? "Analyzing..." : sampleRate !== null ? `${sampleRate} Hz` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Channels</span>
                      <span className="font-mono text-foreground">
                        {isAnalyzing ? "Analyzing..." : channels !== null ? (channels === 1 ? "Mono (1)" : channels === 2 ? "Stereo (2)" : `${channels} Channels`) : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backend Verified</span>
                      <span className="font-mono text-xs text-muted-foreground">{serverMetadata ? "Yes (Success)" : "Pending..."}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* EXPORT & INLINE DOWNLOAD PANEL */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export Metadata as JSON
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