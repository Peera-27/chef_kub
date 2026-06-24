"use client";

import { useState } from "react";
import type { Recipe } from "../../types/recipe";

interface CookViewProps {
  recipe: Recipe;
  onDone: () => void;
}

export function CookView({ recipe, onDone }: CookViewProps) {
  const [step, setStep] = useState(0);
  const total = recipe.instructions.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const speakStep = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `ขั้นตอนที่ ${step + 1}. ${recipe.instructions[step]}`,
    );
    utterance.lang = "th-TH";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col min-h-[70vh] pb-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="section-title">{recipe.name}</h2>
          <p className="section-subtitle">
            ขั้นตอนที่ {step + 1} / {total}
          </p>
        </div>
        <button onClick={onDone} className="btn-ghost text-sm px-2 py-1">
          เสร็จแล้ว
        </button>
      </div>

      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-40 object-cover rounded-2xl mb-4"
        />
      )}

      <div className="card p-5 mb-6 flex-1">
        <p className="text-xs text-orange-500 font-medium mb-2">
          ขั้นตอนที่ {step + 1}
        </p>
        <p className="text-gray-700 leading-relaxed">
          {recipe.instructions[step]}
        </p>
        <button
          type="button"
          onClick={speakStep}
          className="mt-4 text-sm text-orange-500 hover:text-orange-600"
        >
          อ่านขั้นตอนนี้ให้ฟัง
        </button>
      </div>

      <details className="mb-6 text-sm">
        <summary className="cursor-pointer text-gray-400 hover:text-orange-500 transition-colors">
          ดูสูตรทั้งหมด
        </summary>
        <ol className="mt-3 space-y-2 text-gray-600 card p-4">
          {recipe.instructions.map((instruction, i) => (
            <li
              key={i}
              className={`leading-relaxed ${i === step ? "text-orange-600 font-medium" : ""}`}
            >
              <span className="text-orange-500 font-medium mr-1.5">
                {i + 1}.
              </span>
              {instruction}
            </li>
          ))}
        </ol>
      </details>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={isFirst}
          className="btn-secondary flex-1 py-3 disabled:opacity-40"
        >
          ก่อนหน้า
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onDone}
            className="btn-primary flex-1 py-3 font-semibold"
          >
            ทำเสร็จแล้ว
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary flex-1 py-3 font-semibold"
          >
            ถัดไป
          </button>
        )}
      </div>
    </div>
  );
}
