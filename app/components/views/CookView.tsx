"use client";

import type { Recipe } from "../../types/recipe";
import { useGeminiLiveCook } from "../../hooks/useGeminiLiveCook";
import { useEffect, useRef } from "react";

interface CookViewProps {
  recipe: Recipe;
  onDone: () => void;
}

export function CookView({ recipe, onDone }: CookViewProps) {
  const {
    status,
    transcript,
    errorMessage,
    isMuted,
    connect,
    disconnect,
    toggleMute,
  } = useGeminiLiveCook(recipe);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLive = status === "connected" || status === "connecting";

  useEffect(() => {
    void connect();
    return () => {
      disconnect();
    };
  }, [recipe.name, connect, disconnect]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleDone = () => {
    disconnect();
    onDone();
  };

  return (
    <div className="flex flex-col min-h-[70vh] pb-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg font-bold text-orange-500">{recipe.name}</h2>
          <p className="text-xs text-gray-400">คุยกับ Chef Kub ขณะทำอาหาร</p>
        </div>
        <button
          onClick={handleDone}
          className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
        >
          เสร็จแล้ว
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto mb-4 min-h-[200px]">
        {status === "connecting" && (
          <div className="flex gap-2 items-start">
            <span className="text-lg shrink-0">👨‍🍳</span>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-500 border border-orange-100 shadow-sm">
              กำลังเชื่อมต่อ...
            </div>
          </div>
        )}

        {status === "connected" && !transcript && (
          <div className="flex gap-2 items-start">
            <span className="text-lg shrink-0">👨‍🍳</span>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-500 border border-orange-100 shadow-sm">
              พร้อมแล้ว — ฟังคำแนะนำหรือพูดถามได้เลย
            </div>
          </div>
        )}

        {transcript && (
          <div className="flex gap-2 items-start">
            <span className="text-lg shrink-0">👨‍🍳</span>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 border border-orange-100 shadow-sm max-w-[85%] leading-relaxed">
              {transcript}
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-xs text-red-500 text-center">{errorMessage}</p>
        )}

        <div ref={chatEndRef} />
      </div>

      <details className="mb-4 text-xs">
        <summary className="cursor-pointer text-gray-400 hover:text-orange-500">
          ดูสูตรทั้งหมด
        </summary>
        <ol className="mt-2 space-y-1 text-gray-600 bg-white rounded-xl p-3 border border-orange-50">
          {recipe.instructions.map((step, i) => (
            <li key={i}>
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      </details>

      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          onClick={toggleMute}
          disabled={!isLive}
          className={`cursor-pointer w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-md transition-transform active:scale-95 disabled:opacity-40 ${
            isMuted
              ? "bg-gray-200 text-gray-500"
              : status === "connected"
                ? "bg-orange-500 text-white animate-pulse"
                : "bg-white text-orange-400 border-2 border-orange-200"
          }`}
          aria-label={isMuted ? "เปิดไมค์" : "ปิดไมค์"}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>
        <p className="text-xs text-gray-400">
          {isMuted
            ? "ไมค์ปิด — กดเพื่อพูด"
            : status === "connected"
              ? "พูดได้เลย เช่น “เสร็จแล้ว” หรือ “ทำต่อ”"
              : status === "connecting"
                ? "กำลังเตรียมไมค์..."
                : "รอเชื่อมต่อ..."}
        </p>

        {(status === "error" || status === "disconnected") && (
          <button
            onClick={() => void connect()}
            className="cursor-pointer text-sm text-orange-500 underline mt-1"
          >
            เชื่อมต่อใหม่
          </button>
        )}
      </div>
    </div>
  );
}
