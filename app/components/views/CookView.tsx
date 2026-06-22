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

  const statusMessage =
    status === "connecting"
      ? "กำลังเชื่อมต่อ..."
      : status === "connected" && !transcript
        ? 'รอฟังเชฟครับทักทาย — ตอบ "พร้อม" หรือ "เริ่มเลย" เมื่อพร้อมทำ'
        : null;

  return (
    <div className="flex flex-col min-h-[70vh] pb-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="section-title">{recipe.name}</h2>
          <p className="section-subtitle">คุยกับ เชฟครับ</p>
        </div>
        <button onClick={handleDone} className="btn-ghost text-sm px-2 py-1">
          เสร็จแล้ว
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto mb-6 min-h-[200px]">
        {(statusMessage || transcript) && (
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-lg">
              👨‍🍳
            </div>
            <div className="card p-4 text-sm text-gray-700 leading-relaxed max-w-[85%]">
              {transcript || statusMessage}
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-xs text-red-500 text-center">{errorMessage}</p>
        )}

        <div ref={chatEndRef} />
      </div>

      <details className="mb-6 text-sm">
        <summary className="cursor-pointer text-gray-400 hover:text-orange-500 transition-colors">
          ดูสูตรทั้งหมด
        </summary>
        <ol className="mt-3 space-y-2 text-gray-600 card p-4">
          {recipe.instructions.map((step, i) => (
            <li key={i} className="leading-relaxed">
              <span className="text-orange-500 font-medium mr-1.5">
                {i + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>
      </details>

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={toggleMute}
          disabled={!isLive}
          className={`icon-btn w-16 h-16 text-2xl shadow-md disabled:opacity-40 ${
            isMuted
              ? "bg-gray-100 text-gray-400"
              : status === "connected"
                ? "bg-orange-500 text-white"
                : "bg-white text-orange-400 border-2 border-orange-200"
          }`}
          aria-label={isMuted ? "เปิดไมค์" : "ปิดไมค์"}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          {isMuted
            ? "ไมค์ปิด — กดเพื่อพูด"
            : status === "connected"
              ? 'พูดได้เลย เช่น "พร้อม" "เริ่มเลย" หรือ "เสร็จแล้ว"'
              : status === "connecting"
                ? "กำลังเตรียมไมค์..."
                : "รอเชื่อมต่อ..."}
        </p>

        {(status === "error" || status === "disconnected") && (
          <button
            onClick={() => void connect()}
            className="btn-ghost text-sm text-orange-500"
          >
            เชื่อมต่อใหม่
          </button>
        )}
      </div>
    </div>
  );
}
