"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Music, RefreshCw, BarChart2, Activity, Sparkles } from "lucide-react";

export default function WaveformViewerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioInfo, setAudioInfo] = useState<{ sampleRate?: number; channels?: number; sizeStr?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);

      // Calculate file size string
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setAudioInfo({ sizeStr: `${sizeMb} MB` });

      // Decode audio for waveform generation using Web Audio API
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          
          setAudioInfo({
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels,
            sizeStr: `${sizeMb} MB`,
          });

          const rawData = audioBuffer.getChannelData(0);
          const samples = 80; // Number of bars
          const blockSize = Math.floor(rawData.length / samples);
          const filteredData = [];
          
          for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[blockStart + j] || 0);
            }
            filteredData.push(sum / blockSize);
          }

          // Normalize peaks between 15 and 95
          const multiplier = 80 / Math.max(...filteredData, 0.01);
          const normalized = filteredData.map((val) => Math.max(15, Math.min(95, Math.round(val * multiplier))));
          setWaveformPeaks(normalized);
        } catch (err) {
          console.error("Error decoding audio buffer", err);
        }
      };
      reader.readAsArrayBuffer(selectedFile);

      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
      setWaveformPeaks([]);
      setAudioInfo(null);
    }
  }, [selectedFile]);

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

  const calculateTimeFromClientX = (clientX: number) => {
    if (!waveformRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const padding = 16; // px-4 padding (1rem = 16px)
    const clickX = clientX - rect.left - padding;
    const innerWidth = rect.width - (padding * 2);
    const percentage = Math.max(0, Math.min(1, clickX / innerWidth));
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    calculateTimeFromClientX(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        calculateTimeFromClientX(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration]);

  const exportAnalysisJson = () => {
    if (!selectedFile) return;
    
    const report = {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      mimeType: selectedFile.type,
      duration: duration,
      sampleRate: audioInfo?.sampleRate || 44100,
      channels: audioInfo?.channels || 2,
      peaks: waveformPeaks,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    const cleanName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "audio";
    a.download = `${cleanName}-waveform-analysis.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-6 font-sans text-stone-800">
      <style jsx global>{`
        /* Custom scrollbar for dark card containers matching white/light theme */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(28, 25, 23, 0.6);
          border-radius: 9999px;
          margin: 1.5rem 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 1);
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl items-center justify-center border border-amber-100 shadow-sm">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            Waveform Viewer
          </h1>
          <p className="text-stone-500 text-base max-w-md mx-auto">
            Visualize frequency spectra, analyze amplitude peaks, and inspect audio tracks with high precision.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-stone-200/80 space-y-8">
          
          {!selectedFile && (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center hover:border-amber-500 transition-all bg-stone-50/40">
              <input
                type="file"
                id="waveform-upload"
                className="hidden"
                accept="audio/*"
                onChange={handleFileChange}
              />
              <label htmlFor="waveform-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-semibold text-stone-800 block">
                    Upload audio for waveform analysis
                  </span>
                  <span className="text-sm text-stone-500 block">
                    Drag and drop your audio file here or click to browse
                  </span>
                  <span className="text-xs text-stone-400 block pt-1">
                    MP3, WAV, AAC, OGG • Max 200 MB
                  </span>
                </div>
              </label>
            </div>
          )}

          {selectedFile && audioUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-stone-400 block">Target Audio Track</span>
                    <span className="text-sm font-semibold text-stone-800 truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-stone-500 hover:text-amber-600 bg-white border border-stone-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>

              {/* Audio Player & Waveform Visualizer Screen */}
              <div className="bg-stone-900 rounded-2xl overflow-hidden p-6 text-white shadow-inner space-y-6 custom-scrollbar max-h-[85vh] overflow-y-auto">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => {
                    if (!isDragging && audioRef.current) {
                      setCurrentTime(audioRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={togglePlay}
                      className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-lg cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-1" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs text-stone-400 block font-medium">Spectrum State</span>
                      <span className="text-sm font-bold text-white">{isPlaying ? "Analyzing Live Audio..." : "Paused"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-400 block font-medium">Position</span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Waveform Visualization Canvas / Bars */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="flex items-center space-x-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>High-Resolution Amplitude Spectrum (Click & Drag to Scrub)</span>
                    </span>
                    <span>Real-time Inspection</span>
                  </div>
                  <div 
                    ref={waveformRef}
                    onMouseDown={handleMouseDown}
                    className="relative h-32 bg-stone-950/90 rounded-xl border border-stone-800 px-4 flex items-center cursor-ew-resize overflow-hidden group select-none"
                  >
                    {/* Inner Track Container spanning exact padded width */}
                    <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between pointer-events-none">
                      {waveformPeaks.length > 0 ? (
                        waveformPeaks.map((height, idx) => {
                          const barProgress = (idx / waveformPeaks.length) * 100;
                          const isPassed = barProgress <= progressPercentage;
                          return (
                            <div
                              key={idx}
                              className={`w-1 rounded-full transition-all duration-150 ${
                                isPassed ? "bg-amber-400 shadow-md shadow-amber-400/40" : "bg-stone-700 group-hover:bg-stone-600"
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          );
                        })
                      ) : (
                        <div className="w-full text-center text-xs text-stone-500">Generating waveform peaks...</div>
                      )}

                      {/* Playhead Indicator Line moving dynamically and draggable */}
                      <div 
                        className="absolute -top-4 -bottom-4 w-0.5 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] z-10"
                        style={{ left: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Metadata Panel */}
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div className="bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl p-2.5 md:p-4 space-y-0.5 md:space-y-1 overflow-hidden">
                  <span className="text-[10px] md:text-xs font-semibold text-stone-400 block uppercase tracking-wider truncate">Sample Rate</span>
                  <span className="text-xs md:text-lg font-bold text-stone-900 block truncate">
                    {audioInfo?.sampleRate ? `${audioInfo.sampleRate} Hz` : "44,100 Hz"}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl p-2.5 md:p-4 space-y-0.5 md:space-y-1 overflow-hidden">
                  <span className="text-[10px] md:text-xs font-semibold text-stone-400 block uppercase tracking-wider truncate">Channels</span>
                  <span className="text-xs md:text-lg font-bold text-stone-900 block truncate">
                    {audioInfo?.channels ? `${audioInfo.channels} Ch` : "Stereo"}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl p-2.5 md:p-4 space-y-0.5 md:space-y-1 overflow-hidden">
                  <span className="text-[10px] md:text-xs font-semibold text-stone-400 block uppercase tracking-wider truncate">File Size</span>
                  <span className="text-xs md:text-lg font-bold text-stone-900 block truncate">
                    {audioInfo?.sizeStr || "Calculated"}
                  </span>
                </div>
              </div>

              {/* Export Analysis Summary Button */}
              <div className="pt-2">
                <button
                  onClick={exportAnalysisJson}
                  className="w-full py-2.5 px-3 md:py-4 md:px-6 rounded-xl font-bold bg-amber-400 hover:bg-amber-500 text-stone-950 shadow-sm shadow-amber-400/20 transition-all flex items-center justify-center space-x-1.5 md:space-x-2 text-xs md:text-sm whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <span>Export Waveform Analysis Data (.json)</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}