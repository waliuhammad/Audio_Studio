"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    clamp,
    getAudioContext,
    resumeAudioContext,
    type TimeRange,
} from "@/lib/audio/audio-utils";

export interface AudioEngine {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isLooping: boolean;
    play: (from?: number) => void;
    pause: () => void;
    toggle: () => void;
    stop: () => void;
    seek: (time: number) => void;
    setVolume: (value: number) => void;
    toggleMute: () => void;
    toggleLoop: () => void;
}

/**
 * Playback engine for a decoded AudioBuffer.
 *
 * AudioBufferSourceNode is single-use — it must be recreated on every play.
 * Position is derived from AudioContext.currentTime (sample-accurate) rather
 * than a timer, and the playhead is polled on requestAnimationFrame.
 */
export function useAudioEngine(
    buffer: AudioBuffer | null,
    region: TimeRange | null
): AudioEngine {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolumeState] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLooping, setIsLooping] = useState(false);

    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const frameRef = useRef<number | null>(null);

    const contextStartRef = useRef(0);
    const bufferOffsetRef = useRef(0);
    const currentTimeRef = useRef(0);

    // Mirrored in refs so the stable play/pause callbacks always read fresh values.
    const bufferRef = useRef<AudioBuffer | null>(buffer);
    const regionRef = useRef<TimeRange | null>(region);
    const volumeRef = useRef(1);
    const mutedRef = useRef(false);
    const loopRef = useRef(false);

    const duration = buffer?.duration ?? 0;

    useEffect(() => {
        bufferRef.current = buffer;
    }, [buffer]);

    useEffect(() => {
        regionRef.current = region;
    }, [region]);

    const cancelFrame = useCallback(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
    }, []);

    const teardownSource = useCallback(() => {
        const source = sourceRef.current;

        if (source) {
            source.onended = null;
            try {
                source.stop();
            } catch {
                /* already stopped */
            }
            try {
                source.disconnect();
            } catch {
                /* already disconnected */
            }
            sourceRef.current = null;
        }

        const gain = gainRef.current;

        if (gain) {
            try {
                gain.disconnect();
            } catch {
                /* already disconnected */
            }
            gainRef.current = null;
        }
    }, []);

    const updateTime = useCallback((time: number) => {
        currentTimeRef.current = time;
        setCurrentTime(time);
    }, []);

    // Declared as a ref so the animation loop can restart playback when looping.
    const playRef = useRef<(from?: number) => void>(() => undefined);

    const play = useCallback(
        (from?: number) => {
            const activeBuffer = bufferRef.current;
            if (!activeBuffer) return;

            resumeAudioContext();

            const ctx = getAudioContext();
            teardownSource();
            cancelFrame();

            const activeRegion = regionRef.current;
            const regionStart = activeRegion ? Math.min(activeRegion.start, activeRegion.end) : 0;
            const regionEnd = activeRegion
                ? Math.max(activeRegion.start, activeRegion.end)
                : activeBuffer.duration;

            let offset = from ?? currentTimeRef.current;

            // Restart from the top of the region when at (or past) its end.
            if (offset < regionStart || offset >= regionEnd - 0.005) {
                offset = regionStart;
            }

            const gain = ctx.createGain();
            gain.gain.value = mutedRef.current ? 0 : volumeRef.current;
            gain.connect(ctx.destination);
            gainRef.current = gain;

            const source = ctx.createBufferSource();
            source.buffer = activeBuffer;
            source.connect(gain);
            sourceRef.current = source;

            contextStartRef.current = ctx.currentTime;
            bufferOffsetRef.current = offset;

            source.onended = () => {
                // Fires only on natural end-of-buffer; manual stops clear this handler.
                if (sourceRef.current !== source) return;

                cancelFrame();
                teardownSource();
                setIsPlaying(false);
                updateTime(activeBuffer.duration);
            };

            source.start(0, offset);
            setIsPlaying(true);
            updateTime(offset);

            const tick = () => {
                const elapsed =
                    ctx.currentTime - contextStartRef.current + bufferOffsetRef.current;

                if (elapsed >= regionEnd) {
                    if (loopRef.current) {
                        playRef.current(regionStart);
                        return;
                    }

                    cancelFrame();
                    teardownSource();
                    setIsPlaying(false);
                    updateTime(regionEnd);
                    return;
                }

                updateTime(elapsed);
                frameRef.current = requestAnimationFrame(tick);
            };

            frameRef.current = requestAnimationFrame(tick);
        },
        [cancelFrame, teardownSource, updateTime]
    );

    useEffect(() => {
        playRef.current = play;
    }, [play]);

    const pause = useCallback(() => {
        cancelFrame();
        teardownSource();
        setIsPlaying(false);
    }, [cancelFrame, teardownSource]);

    const stop = useCallback(() => {
        cancelFrame();
        teardownSource();
        setIsPlaying(false);

        const activeRegion = regionRef.current;
        updateTime(activeRegion ? Math.min(activeRegion.start, activeRegion.end) : 0);
    }, [cancelFrame, teardownSource, updateTime]);

    const seek = useCallback(
        (time: number) => {
            const activeBuffer = bufferRef.current;
            const max = activeBuffer?.duration ?? 0;
            const target = clamp(time, 0, max);

            updateTime(target);

            // Restart cleanly at the new position if we were already playing.
            if (sourceRef.current) {
                play(target);
            }
        },
        [play, updateTime]
    );

    const toggle = useCallback(() => {
        if (sourceRef.current) {
            pause();
        } else {
            play();
        }
    }, [pause, play]);

    const setVolume = useCallback((value: number) => {
        const safe = clamp(value, 0, 1);

        volumeRef.current = safe;
        setVolumeState(safe);

        if (safe > 0 && mutedRef.current) {
            mutedRef.current = false;
            setIsMuted(false);
        }

        if (gainRef.current) {
            gainRef.current.gain.value = mutedRef.current ? 0 : safe;
        }
    }, []);

    const toggleMute = useCallback(() => {
        const next = !mutedRef.current;

        mutedRef.current = next;
        setIsMuted(next);

        if (gainRef.current) {
            gainRef.current.gain.value = next ? 0 : volumeRef.current;
        }
    }, []);

    const toggleLoop = useCallback(() => {
        const next = !loopRef.current;

        loopRef.current = next;
        setIsLooping(next);
    }, []);

    // A new buffer (upload, undo, or an applied edit) invalidates playback.
    useEffect(() => {
        cancelFrame();
        teardownSource();
        setIsPlaying(false);
        updateTime(0);
    }, [buffer, cancelFrame, teardownSource, updateTime]);

    useEffect(() => {
        return () => {
            cancelFrame();
            teardownSource();
        };
    }, [cancelFrame, teardownSource]);

    return {
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isLooping,
        play,
        pause,
        toggle,
        stop,
        seek,
        setVolume,
        toggleMute,
        toggleLoop,
    };
}