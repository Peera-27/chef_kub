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
  const progress = ((step + 1) / total) * 100;

  return (
    <div className="flex flex-col min-h-[75vh] pb-4 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="min-w-0 flex-1 mr-3">
          <h2 className="section-title md:text-xl line-clamp-2 md:line-clamp-none">
            {recipe.name}
          </h2>
          <p className="section-subtitle">
            ขั้นตอนที่ {step + 1} / {total}
          </p>
        </div>
        <button onClick={onDone} className="btn-ghost text-sm px-3 py-2 shrink-0 tap">
          เสร็จแล้ว
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 md:h-2 bg-[var(--color-line)] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-[var(--color-brand)] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Recipe image */}
      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-44 md:h-52 lg:h-60 object-cover rounded-[var(--radius-lg)] mb-6"
        />
      )}

      {/* วัตถุดิบ */}
      {recipe.ingredients.length > 0 && (
        <div className="card p-4 md:p-5 mb-5">
          <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide mb-3">
            • วัตถุดิบ
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex gap-2 leading-relaxed">
                <span className="text-[var(--color-brand)] shrink-0">•</span>
                <span>{ing}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* สูตรทั้งหมด แสดงครบทุกขั้นตอน */}
      <div className="card p-5 md:p-6 mb-6">
        <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide mb-4">
          • วิธีทำทั้งหมด
        </h3>
        <ol className="space-y-3 md:space-y-4">
          {recipe.instructions.map((instruction, i) => (
            <li
              key={i}
              onClick={() => setStep(i)}
              className={`flex gap-3 md:gap-4 cursor-pointer rounded-[var(--radius-md)] p-2 md:p-3 -mx-2 md:-mx-3 transition-colors tap ${
                i === step
                  ? "bg-[var(--color-brand-soft)]"
                  : "hover:bg-[var(--color-brand-pale)]"
              }`}
            >
              <span
                className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-full text-white text-xs md:text-sm font-bold flex items-center justify-center transition-colors ${
                  i === step ? "bg-[var(--color-brand)]" : "bg-[var(--color-line)] text-[var(--color-muted)]"
                }`}
              >
                {i + 1}
              </span>
              <p
                className={`text-sm md:text-base leading-relaxed pt-0.5 transition-colors ${
                  i === step ? "text-[var(--color-ink)] font-semibold" : "text-gray-600"
                }`}
              >
                {instruction}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={isFirst}
          className="btn-secondary flex-1 py-3.5 md:py-4 disabled:opacity-40 tap"
        >
          ← ก่อนหน้า
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onDone}
            className="btn-primary flex-1 py-3.5 md:py-4 font-semibold tap"
          >
            ทำเสร็จแล้ว 🎉
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary flex-1 py-3.5 md:py-4 font-semibold tap"
          >
            ถัดไป →
          </button>
        )}
      </div>
    </div>
  );
}
