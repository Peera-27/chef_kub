"use client";

import { useState } from "react";
import type { Recipe } from "../../types/recipe";
import { IconCart, IconCheck } from "../Icons";

interface CookViewProps {
  recipe: Recipe;
  onDone: () => void;
}

export function CookView({ recipe, onDone }: CookViewProps) {
  // วัตถุดิบที่เตรียมแล้ว — ติ๊กเช็คระหว่างหยิบของ
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set(),
  );
  // ขั้นตอนที่ทำเสร็จแล้ว — แตะติ๊กไปเรื่อย ๆ ไม่ต้องกดถัดไปทีละปุ่ม
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const total = recipe.instructions.length;
  const progress = total > 0 ? (doneSteps.size / total) * 100 : 0;

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleStep = (idx: number) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-[75vh] slide-up">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="min-w-0 flex-1 mr-3">
          <h2 className="section-title md:text-xl line-clamp-2 md:line-clamp-none">
            {recipe.name}
          </h2>
          {recipe.inspiration && (
            <p className="text-xs text-[var(--color-brand)] font-medium mt-0.5">
              ✨ {recipe.inspiration}
            </p>
          )}
          <p className="section-subtitle">
            ทำแล้ว {doneSteps.size} / {total} ขั้นตอน
            {recipe.servings ? ` · สำหรับ ${recipe.servings} ที่` : ""}
          </p>
        </div>
        <button onClick={onDone} className="btn-ghost text-sm px-3 py-2 shrink-0 tap">
          เสร็จแล้ว
        </button>
      </div>

      {/* Progress bar — ขยับตามขั้นตอนที่ติ๊กว่าทำแล้ว */}
      <div className="w-full h-1.5 md:h-2 bg-[var(--color-line)] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-[var(--color-brand)] rounded-full transition-all duration-300 shimmer-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Recipe image */}
      {recipe.imageUrl && (
        <div className="relative rounded-[var(--radius-lg)] overflow-hidden mb-6 ring-1 ring-black/5 shadow-md">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full aspect-video object-cover"
          />
        </div>
      )}

      {/* หมายเหตุของเชฟ — เหตุผลที่รสเข้ากัน หรือดัดแปลงตรงไหน ไม่ใช่ขั้นตอนทำ */}
      {recipe.note && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-brand-soft)] p-4 mb-5 slide-up">
          <p className="text-sm text-[var(--color-ink)] leading-relaxed">
            <span className="mr-1">💡</span>
            {recipe.note}
          </p>
        </div>
      )}

      {/* วัตถุดิบ — checklist ติ๊กได้ระหว่างเตรียมของ */}
      {recipe.ingredients.length > 0 && (
        <div className="card p-4 md:p-5 mb-5 slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide">
              วัตถุดิบ
            </h3>
            <span className="text-xs font-medium text-[var(--color-muted)]">
              เตรียมแล้ว {checkedIngredients.size}/{recipe.ingredients.length}
            </span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {recipe.ingredients.map((ing, idx) => {
              const done = checkedIngredients.has(idx);
              return (
                <li key={idx}>
                  <button
                    onClick={() => toggleIngredient(idx)}
                    className="w-full flex items-start gap-2.5 text-left text-sm px-2 py-2 -mx-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-brand-pale)] transition-colors cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 mt-0.5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                        done
                          ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                          : "border-[var(--color-line)] text-transparent"
                      }`}
                    >
                      <IconCheck size={12} />
                    </span>
                    <span
                      className={`leading-relaxed transition-colors ${
                        done
                          ? "text-[var(--color-muted)] line-through"
                          : "text-[var(--color-ink)]"
                      }`}
                    >
                      {ing}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ของที่ต้องซื้อเพิ่ม — ผู้ใช้จะได้รู้ก่อนลงมือว่าต้องออกไปซื้ออะไร */}
      {recipe.extraIngredients && recipe.extraIngredients.length > 0 && (
        <div className="card p-4 md:p-5 mb-5 slide-up">
          <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide mb-3">
            ต้องซื้อเพิ่ม
          </h3>
          <div className="flex flex-wrap gap-2">
            {recipe.extraIngredients.map((item, idx) => (
              <span
                key={idx}
                className="pill gap-1.5 bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
              >
                <IconCart size={13} />
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* วิธีทำทั้งหมด — โชว์ครบทุกขั้นตอนเลย แตะขั้นไหนเพื่อติ๊กว่าทำแล้ว */}
      <div className="card p-5 md:p-6 mb-4">
        <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide mb-4">
          วิธีทำ
        </h3>
        <ol className="space-y-2 md:space-y-3">
          {recipe.instructions.map((instruction, i) => {
            const done = doneSteps.has(i);
            return (
              <li key={i}>
                <button
                  onClick={() => toggleStep(i)}
                  className={`w-full flex gap-3 md:gap-4 text-left cursor-pointer rounded-[var(--radius-md)] p-2.5 md:p-3 -mx-2 md:-mx-3 transition-colors tap ${
                    done
                      ? "bg-[var(--color-success-soft)]/60"
                      : "hover:bg-[var(--color-brand-pale)]"
                  }`}
                >
                  <span
                    className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-full text-xs md:text-sm font-bold flex items-center justify-center transition-colors ${
                      done
                        ? "bg-[var(--color-success)] text-white"
                        : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    }`}
                  >
                    {done ? <IconCheck size={14} /> : i + 1}
                  </span>
                  <p
                    className={`text-sm md:text-base leading-relaxed pt-0.5 transition-colors ${
                      done
                        ? "text-[var(--color-muted)] line-through"
                        : "text-[var(--color-ink)]"
                    }`}
                  >
                    {instruction}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ปุ่มเดียวจบ — sticky ติดล่างจอ */}
      <div className="sticky bottom-0 z-20 mt-auto pt-3 pb-4 safe-bottom bg-gradient-to-t from-[var(--color-page)] via-[var(--color-page)]/95 to-transparent">
        <button
          type="button"
          onClick={onDone}
          className="btn-primary w-full py-3.5 md:py-4 font-semibold tap"
        >
          {doneSteps.size === total && total > 0
            ? "ทำเสร็จแล้ว 🎉"
            : "จบการทำอาหาร"}
        </button>
      </div>
    </div>
  );
}
