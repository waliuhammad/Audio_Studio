"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Scissors, FileVideo, RefreshCw, Check, ArrowRight, Download, Sliders, ChevronDown } from "lucide-react";

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Trim time range states (in seconds)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Free-typing string states for manual text input fields
  const [startInput, setStartInput] = useState("0");
  const [endInput, setEndInput] = useState("0");

  // Output format selection dropdown state (6+ formats including gif)
  const [targetFormat, setTargetFormat] = useState("mp4");
  const [isFormatOpen, setIsFormatOpen] = useState(false);

  // Quality dropdown selection state (4+ quality options)
  const [targetQuality, setTargetQuality] = useState("1080p");
  const [isQualityOpen, setIsQualityOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedFileUrl, setConvertedFileUrl] = useState<string | null>(null);
  const [convertedFileName, setConvertedFileName] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(event.target as Node)) {
        setIsFormatOpen(false);
      }
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(event.target as Node)) {
        setIsQualityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Decorative waveform amplitude bars
  const waveformBars = Array.from({ length: 48 }, (_, i) => {
    return Math.sin(i * 0.4) * 25 + Math.cos(i * 0.2) * 15 + 45;
  });

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setConvertedFileUrl(null);
      setConvertedFileName(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setStartTime(0);
      setStartInput("0");
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [selectedFile]);

  // Sync string inputs when startTime changes programmatically
  useEffect(() => {
    setStartInput(startTime.toFixed(1));
  }, [startTime]);

  useEffect(() => {
    setEndInput(endTime.toFixed(1));
  }, [endTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
      setEndInput(dur.toFixed(1));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      if (isPlaying && time >= endTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
        setIsPlaying(false);
      }
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !videoRef.current || !duration) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const formatOptions = [
    { value: "mp4", label: "MP4 (MPEG-4 Video)" },
    { value: "webm", label: "WEBM (Web Optimized Video)" },
    { value: "mov", label: "MOV (QuickTime Video)" },
    { value: "mkv", label: "MKV (Matroska Video)" },
    { value: "avi", label: "AVI (Audio Video Interleave)" },
    { value: "gif", label: "GIF (Animated Image)" },
  ];

  const qualityOptions = [
    { value: "4k", label: "4K Ultra HD (Highest Quality)" },
    { value: "1080p", label: "1080p Full HD (Recommended)" },
    { value: "720p", label: "720p HD (Balanced Size)" },
    { value: "480p", label: "480p SD (Fastest Conversion)" },
  ];

  const handleConvertAndTrimAction = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("startTime", startTime.toString());
    formData.append("endTime", endTime.toString());
    formData.append("format", targetFormat);
    formData.append("quality", targetQuality);

    try {
      const response = await fetch("/api/video/video-converter", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Conversion and trimming failed");

      const resultBlob = await response.blob();
      const blobUrl = URL.createObjectURL(resultBlob);
      setConvertedFileUrl(blobUrl);

      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "video";
      setConvertedFileName(`${baseName}-converted.${targetFormat}`);
    } catch (error) {
      alert("An error occurred during video conversion and trimming.");
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimStartPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const trimEndPercent = duration > 0 ? (endTime / duration) * 100 : 100;

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-6 font-sans text-stone-800">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl items-center justify-center border border-amber-100 shadow-sm">
            <Sliders className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            Video Converter & Trimmer
          </h1>
          <p className="text-stone-500 text-base max-w-md mx-auto">
            Convert your video format and extract precisely trimmed segments with custom preview control.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-stone-200/80 space-y-8">
          
          {!selectedFile && (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center hover:border-amber-500 transition-all bg-stone-50/40">
              <input
                type="file"
                id="video-upload"
                className="hidden"
                accept="video/*"
                onChange={handleFileChange}
              />
              <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-semibold text-stone-800 block">
                    Upload your video file
                  </span>
                  <span className="text-sm text-stone-500 block">
                    Drag and drop your file here or click to browse
                  </span>
                  <span className="text-xs text-stone-400 block pt-1">
                    MP4, MOV, WEBM, MKV • Max 500 MB
                  </span>
                </div>
              </label>
            </div>
          )}

          {selectedFile && videoUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 flex-shrink-0">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-stone-400 block">Source File</span>
                    <span className="text-sm font-semibold text-stone-800 truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-stone-500 hover:text-amber-600 bg-white border border-stone-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Video</span>
                </button>
              </div>

              {/* Video Player & Waveform Studio Panel */}
              <div className="bg-stone-900 rounded-2xl overflow-hidden p-5 text-white shadow-inner space-y-4">
                <div className="flex items-center justify-between text-xs text-stone-400 font-medium px-1">
                  <span>Trim Range ({formatTime(startTime)} - {formatTime(endTime)})</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>

                {/* Video Display Box */}
                <div className="max-w-xl mx-auto">
                  <div className="relative h-48 md:h-60 bg-stone-950 rounded-xl flex flex-col items-center justify-center border border-stone-800 overflow-hidden group shadow-md">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={togglePlay}
                    />
                    
                    {!isPlaying && (
                      <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center pointer-events-none">
                        <button 
                          onClick={togglePlay}
                          className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full flex items-center justify-center pointer-events-auto transition-transform transform hover:scale-105 shadow-lg"
                        >
                          <Play className="w-6 h-6 fill-current ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Full Waveform Scrubber */}
                <div className="max-w-xl mx-auto pt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>Full Video Waveform Scrubber</span>
                    <span>Click anywhere to preview original volume</span>
                  </div>
                  <div 
                    ref={waveformRef}
                    onClick={handleWaveformClick}
                    className="relative h-16 bg-stone-950/80 rounded-xl border border-stone-800 px-3 flex items-center justify-between cursor-pointer overflow-hidden group"
                  >
                    <div 
                      className="absolute top-0 bottom-0 bg-amber-500/20 border-x border-amber-400/50 pointer-events-none transition-all"
                      style={{ left: `${trimStartPercent}%`, width: `${Math.max(0, trimEndPercent - trimStartPercent)}%` }}
                    />
                    
                    {waveformBars.map((height, idx) => {
                      const barProgress = (idx / waveformBars.length) * 100;
                      const inTrimRange = barProgress >= trimStartPercent && barProgress <= trimEndPercent;
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-colors pointer-events-none ${
                            inTrimRange ? "bg-amber-400 shadow-sm shadow-amber-400/50" : "bg-stone-700 group-hover:bg-stone-600"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}

                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-glow pointer-events-none transition-all z-10"
                      style={{ left: `${progressPercentage}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Segment Range Selection (Trim count) */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
                    <Scissors className="w-4 h-4 text-amber-600" />
                    <span>Segment Range Selection</span>
                  </div>
                  <span className="text-xs text-stone-500">
                    Selected Duration: <strong className="text-stone-800">{formatTime(Math.max(0, endTime - startTime))}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {/* Start Time Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <label className="font-semibold text-stone-600 uppercase tracking-wider">Start Time</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (videoRef.current) {
                            const curr = videoRef.current.currentTime;
                            setStartTime(curr);
                            if (curr > endTime) setEndTime(curr);
                          }
                        }}
                        className="text-amber-600 hover:underline font-medium truncate ml-1"
                      >
                        Set Current ({formatTime(currentTime)})
                      </button>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={startInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartInput(val);
                          const parsed = parseFloat(val);
                          if (!isNaN(parsed)) {
                            setStartTime(Math.max(0, Math.min(parsed, duration)));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(startInput);
                          if (isNaN(parsed)) {
                            setStartInput(startTime.toFixed(1));
                          } else {
                            const clamped = Math.max(0, Math.min(parsed, endTime));
                            setStartTime(clamped);
                            setStartInput(clamped.toFixed(1));
                          }
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-semibold text-stone-800 focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                      <span className="text-[11px] text-stone-400 font-medium hidden md:inline">sec</span>
                    </div>
                  </div>

                  {/* End Time Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <label className="font-semibold text-stone-600 uppercase tracking-wider">End Time</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (videoRef.current) {
                            const curr = videoRef.current.currentTime;
                            setEndTime(curr);
                            if (curr < startTime) setStartTime(curr);
                          }
                        }}
                        className="text-amber-600 hover:underline font-medium truncate ml-1"
                      >
                        Set Current ({formatTime(currentTime)})
                      </button>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={endInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEndInput(val);
                          const parsed = parseFloat(val);
                          if (!isNaN(parsed)) {
                            setEndTime(Math.max(0, Math.min(parsed, duration)));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(endInput);
                          if (isNaN(parsed)) {
                            setEndInput(endTime.toFixed(1));
                          } else {
                            const clamped = Math.max(startTime, Math.min(parsed, duration));
                            setEndTime(clamped);
                            setEndInput(clamped.toFixed(1));
                          }
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-semibold text-stone-800 focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                      <span className="text-[11px] text-stone-400 font-medium hidden md:inline">sec</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Output Format & Quality Settings Panel */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-5">
                
                {/* Target Output Format Custom Downward Dropdown */}
                <div className="space-y-2 relative" ref={formatDropdownRef}>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block">Target Output Format</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormatOpen(!isFormatOpen);
                      setIsQualityOpen(false);
                    }}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold text-stone-800 flex items-center justify-between focus:outline-none focus:border-amber-500 shadow-sm transition-all"
                  >
                    <span>{formatOptions.find(f => f.value === targetFormat)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isFormatOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isFormatOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {formatOptions.map((opt) => {
                        const isSelected = targetFormat === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => {
                              setTargetFormat(opt.value);
                              setIsFormatOpen(false);
                            }}
                            className={`px-4 py-3 text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected 
                                ? "bg-amber-50 text-amber-900 font-semibold" 
                                : "text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Target Quality Custom Downward Dropdown */}
                <div className="space-y-2 relative pt-2 border-t border-stone-200" ref={qualityDropdownRef}>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block">Target Video Quality</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQualityOpen(!isQualityOpen);
                      setIsFormatOpen(false);
                    }}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold text-stone-800 flex items-center justify-between focus:outline-none focus:border-amber-500 shadow-sm transition-all"
                  >
                    <span>{qualityOptions.find(q => q.value === targetQuality)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isQualityOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isQualityOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {qualityOptions.map((opt) => {
                        const isSelected = targetQuality === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => {
                              setTargetQuality(opt.value);
                              setIsQualityOpen(false);
                            }}
                            className={`px-4 py-3 text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected 
                                ? "bg-amber-50 text-amber-900 font-semibold" 
                                : "text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Button & Download Banner */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleConvertAndTrimAction}
                  disabled={isProcessing}
                  className={`w-full py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-sm ${
                    isProcessing
                      ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                      : "bg-amber-400 hover:bg-amber-500 text-stone-950 shadow-amber-400/20"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Converting & Trimming ({formatTime(startTime)} - {formatTime(endTime)})...</span>
                    </span>
                  ) : (
                    <>
                      <Sliders className="w-5 h-5" />
                      <span>Convert & Trim Video Now</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                {/* Success Download Banner */}
                {convertedFileUrl && convertedFileName && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-amber-500 text-stone-950 rounded-xl flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-amber-900 block truncate">Ready for Download</span>
                        <span className="text-sm font-bold text-stone-900 truncate block">{convertedFileName}</span>
                      </div>
                    </div>
                    <a
                      href={convertedFileUrl}
                      download={convertedFileName}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold px-3.5 py-2.5 rounded-xl text-xs transition-colors shadow-sm flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </a>
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