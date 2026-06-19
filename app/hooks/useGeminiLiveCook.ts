"use client";

import { GoogleGenAI, Modality, type Session } from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAudioCapture, LiveAudioPlayer } from "../lib/audio/liveAudio";
import { buildCookKickoffMessage } from "../lib/live/cookPrompt";
import type { Recipe } from "../types/recipe";

export type LiveCookStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

export function useGeminiLiveCook(recipe: Recipe | null) {
  const [status, setStatus] = useState<LiveCookStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const captureRef = useRef<LiveAudioCapture | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const connectGenRef = useRef(0);
  const connectingRef = useRef(false);

  const disconnect = useCallback(() => {
    connectGenRef.current += 1;
    connectingRef.current = false;

    captureRef.current?.stop();
    captureRef.current = null;

    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();

    playerRef.current?.close();
    playerRef.current = null;

    setStatus("disconnected");
  }, []);

  const connect = useCallback(async () => {
    if (!recipe || connectingRef.current) return;

    disconnect();
    connectingRef.current = true;
    const gen = ++connectGenRef.current;

    setStatus("connecting");
    setErrorMessage("");
    setTranscript("");

    try {
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });

      if (gen !== connectGenRef.current) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "ไม่สามารถเชื่อมต่อ Live API ได้");
      }

      const { token, model } = await res.json();

      if (gen !== connectGenRef.current) return;

      const ai = new GoogleGenAI({ apiKey: token, apiVersion: "v1alpha" });
      const player = new LiveAudioPlayer();
      await player.init();
      playerRef.current = player;

      const session = await ai.live.connect({
        model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onopen: () => {
            if (gen !== connectGenRef.current) return;
            setStatus("connected");
            connectingRef.current = false;
          },
          onmessage: (message) => {
            if (gen !== connectGenRef.current) return;

            if (message.serverContent?.interrupted) {
              player.stop();
              return;
            }

            const parts = message.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                player.playPcmBase64(part.inlineData.data);
              }
              if (part.text) {
                setTranscript((prev) => prev + part.text);
              }
            }
          },
          onerror: (event) => {
            if (gen !== connectGenRef.current) return;
            console.error("Live session error:", event);
            setErrorMessage("การเชื่อมต่อ Live มีปัญหา");
            setStatus("error");
            connectingRef.current = false;
          },
          onclose: () => {
            if (gen !== connectGenRef.current) return;
            if (sessionRef.current) {
              setStatus("disconnected");
            }
            connectingRef.current = false;
          },
        },
      });

      if (gen !== connectGenRef.current) {
        session.close();
        player.close();
        return;
      }

      sessionRef.current = session;

      const capture = new LiveAudioCapture((base64) => {
        if (gen !== connectGenRef.current) return;
        session.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      });

      await capture.start();

      if (gen !== connectGenRef.current) {
        capture.stop();
        return;
      }

      captureRef.current = capture;

      session.sendClientContent({
        turns: buildCookKickoffMessage(recipe),
      });
    } catch (error) {
      if (gen !== connectGenRef.current) return;
      console.error("Connect live cook error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "เชื่อมต่อไม่สำเร็จ",
      );
      setStatus("error");
      connectingRef.current = false;
      disconnect();
    }
  }, [recipe, disconnect]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      captureRef.current?.setMuted(!prev);
      return !prev;
    });
  }, []);

  useEffect(() => {
    captureRef.current?.setMuted(isMuted);
  }, [isMuted]);

  return {
    status,
    transcript,
    errorMessage,
    isMuted,
    connect,
    disconnect,
    toggleMute,
    setTranscript,
  };
}
