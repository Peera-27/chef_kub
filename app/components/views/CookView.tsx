"use client";

import { useMemo, useState } from "react";
import type { Recipe } from "../../types/recipe";
import { useWakeLock } from "../../hooks/useWakeLock";
import { parseStepDuration } from "../../utils/parseStepDuration";
import { scaleIngredient } from "../../utils/scaleIngredient";
import { StepTimer } from "../StepTimer";
import { ShareSheet, type ShareChoice } from "../ShareSheet";
import {
  buildRecipeCardFile,
  shareCardFile,
  shareRecipe,
  type ShareResult,
} from "../../utils/shareRecipe";
import { IconCart, IconCheck, IconShare, IconStar } from "../Icons";
import { recordCookRating } from "../../utils/storage";
import type { CookRating } from "../../utils/types";

// กันกดเพิ่มเพลินจนปริมาณเป็นเลขไร้สาระ
const MAX_SERVINGS = 20;

const STAR_VALUES: CookRating[] = [1, 2, 3, 4, 5];

// สะท้อนคะแนนที่เพิ่งกดกลับไปให้เห็นว่าระบบรับแล้ว — เงียบไปเลยจะเหมือนกดไม่ติด
const RATING_LABELS: Record<CookRating, string> = {
  1: "โอเค ขอบคุณที่บอกตรง ๆ",
  2: "ยังไม่เข้าที เดี๋ยวปรับให้",
  3: "พอไหวอยู่",
  4: "ดีเลย! 🙌",
  5: "สุดยอด! 🔥",
};

interface CookViewProps {
  recipe: Recipe;
  onDone: () => void;
}

export function CookView({ recipe, onDone }: CookViewProps) {
  // วัตถุดิบที่เตรียมแล้ว — ติ๊กเช็คระหว่างหยิบของ
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set(),
  );
  const [shareOpen, setShareOpen] = useState(false);
  // ตัวเลือกที่กำลังประมวลผล — วาดการ์ดใช้เวลานิดหน่อย ปุ่มต้องบอกว่ากำลังทำ
  const [sharePending, setSharePending] = useState<ShareChoice | null>(null);
  // ผลการแชร์ล่าสุด — เครื่องที่ส่งไฟล์/share sheet ไม่ได้จะได้รู้ว่าเกิดอะไรขึ้น
  const [shareState, setShareState] = useState<
    "idle" | "copied" | "downloaded" | "failed"
  >("idle");
  // เข้าหน้าฉลองเฉพาะตอนกดปุ่ม "ทำเสร็จแล้ว" — คนที่กดออกกลางคันไม่ควรโดนขอคะแนน
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState<CookRating | null>(null);
  const total = recipe.instructions.length;

  // สูตรเก่าใน localStorage ไม่มี servings — ซ่อนตัวปรับปริมาณไปเลยดีกว่าเดาฐานผิด
  const baseServings =
    recipe.servings && recipe.servings > 0 ? recipe.servings : null;
  const [servings, setServings] = useState(baseServings ?? 1);
  const factor = baseServings ? servings / baseServings : 1;

  // ขั้นตอนไหนมีเวลาระบุไว้บ้าง — คำนวณครั้งเดียว ไม่ต้อง parse ใหม่ทุก render
  const stepDurations = useMemo(
    () => recipe.instructions.map((text) => parseStepDuration(text)),
    [recipe.instructions],
  );

  // อยู่หน้านี้แปลว่ากำลังยืนทำอาหารอยู่ — ไม่ควรปล่อยให้จอดับ
  // พอขึ้นหน้าจบแล้วปล่อยได้ ไม่งั้นจอค้างสว่างทิ้งไว้ตอนไปกินข้าว
  useWakeLock(!finished);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const showResult = (result: ShareResult) => {
    // แชร์สำเร็จหรือผู้ใช้กดยกเลิกเอง ไม่ต้องขึ้นข้อความ share sheet บอกตัวเองอยู่แล้ว
    if (result === "shared" || result === "cancelled") return;
    setShareState(
      result === "copied"
        ? "copied"
        : result === "downloaded"
          ? "downloaded"
          : "failed",
    );
    setTimeout(() => setShareState("idle"), 2500);
  };

  const handleShare = async (choice: ShareChoice) => {
    if (choice === "text") {
      setSharePending(choice);
      const result = await shareRecipe(recipe);
      setSharePending(null);
      setShareOpen(false);
      showResult(result);
      return;
    }

    setSharePending(choice);
    let file: File;
    try {
      file = await buildRecipeCardFile(recipe, choice, rating);
    } catch {
      setSharePending(null);
      setShareOpen(false);
      showResult("failed");
      return;
    }

    // ปิดสถานะ "กำลังสร้าง" ตรงนี้ ก่อนเรียก share sheet ของระบบ
    // เพราะ navigator.share บางเครื่องไม่ยอม settle แล้วปุ่มจะค้างถาวร
    setSharePending(null);
    setShareOpen(false);

    showResult(await shareCardFile(file, recipe.name));
  };

  const handleRate = (choice: CookRating) => {
    // กดดาวดวงเดิมซ้ำ = ยกเลิกคะแนน เผื่อกดพลาด
    const next = rating === choice ? null : choice;
    setRating(next);
    if (next) recordCookRating(recipe.name, next);
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] text-center slide-up">
        <span className="text-6xl mb-4 wiggle">🎉</span>
        <h2 className="section-title md:text-2xl">ทำเสร็จแล้ว!</h2>
        <p className="text-sm text-[var(--color-muted)] mt-1 mb-8 max-w-xs">
          {recipe.name} พร้อมเสิร์ฟ — จากของที่มีอยู่ในครัวคุณเอง
        </p>

        {/* ถามครั้งเดียว แตะดาวเดียวจบ ไม่ต้องพิมพ์อะไร */}
        <div className="w-full max-w-xs rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-5">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {rating ? RATING_LABELS[rating] : "ให้กี่ดาว?"}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-1 mb-4">
            ดาวที่ให้จะติดไปบนการ์ดตอนแชร์ด้วย
          </p>
          <div
            role="radiogroup"
            aria-label="ให้คะแนนเมนูนี้"
            className="flex justify-center gap-1"
          >
            {STAR_VALUES.map((value) => {
              const active = rating !== null && value <= rating;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRate(value)}
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} ดาว`}
                  className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 tap ${
                    active
                      ? "text-[var(--color-star)]"
                      : "text-[var(--color-line)] hover:text-[var(--color-star)]/50"
                  }`}
                >
                  <IconStar size={32} filled={active} />
                </button>
              );
            })}
          </div>
        </div>

        {/* อวดตอนนี้แหละ — อาหารเพิ่งเสร็จ อยู่ตรงหน้าพอดี */}
        <div className="w-full max-w-xs mt-5 space-y-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="btn-primary w-full py-3 font-semibold inline-flex items-center justify-center gap-2 tap"
          >
            {shareState === "copied" ? (
              <>
                <IconCheck size={18} />
                คัดลอกแล้ว
              </>
            ) : shareState === "downloaded" ? (
              <>
                <IconCheck size={18} />
                บันทึกรูปแล้ว
              </>
            ) : shareState === "failed" ? (
              "แชร์ไม่ได้ ลองใหม่อีกครั้ง"
            ) : (
              <>
                <IconShare size={18} />
                อวดเมนูนี้
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="btn-ghost w-full py-3 text-sm tap"
          >
            ดูเมนูอื่นต่อ
          </button>
        </div>

        <ShareSheet
          open={shareOpen}
          busy={sharePending}
          onChoose={handleShare}
          onCancel={() => setShareOpen(false)}
        />
      </div>
    );
  }

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
            {total} ขั้นตอน
            {recipe.readyInMinutes ? ` · ~${recipe.readyInMinutes} นาที` : ""}
            {baseServings ? ` · สำหรับ ${servings} ที่` : ""}
          </p>
        </div>
        <button
          onClick={onDone}
          className="btn-ghost text-sm px-3 py-2 shrink-0 tap"
        >
          ออก
        </button>
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

          {/* ปรับจำนวนที่ — ปริมาณวัตถุดิบสเกลตามทันที */}
          {baseServings && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--color-line)]">
              <span className="text-xs font-medium text-[var(--color-muted)]">
                ทำกี่ที่
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => setServings((n) => Math.max(1, n - 1))}
                  disabled={servings <= 1}
                  aria-label="ลดจำนวนที่"
                  className="w-8 h-8 rounded-full border border-[var(--color-line)] text-[var(--color-ink)] font-bold flex items-center justify-center transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:opacity-35 disabled:hover:border-[var(--color-line)] disabled:hover:text-[var(--color-ink)] tap"
                >
                  −
                </button>
                <span className="min-w-[3.5rem] text-center text-sm font-semibold text-[var(--color-ink)] tabular-nums">
                  {servings} ที่
                </span>
                <button
                  onClick={() =>
                    setServings((n) => Math.min(MAX_SERVINGS, n + 1))
                  }
                  disabled={servings >= MAX_SERVINGS}
                  aria-label="เพิ่มจำนวนที่"
                  className="w-8 h-8 rounded-full border border-[var(--color-line)] text-[var(--color-ink)] font-bold flex items-center justify-center transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:opacity-35 disabled:hover:border-[var(--color-line)] disabled:hover:text-[var(--color-ink)] tap"
                >
                  +
                </button>
              </div>
            </div>
          )}

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
                      {scaleIngredient(ing, factor)}
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

      {/* วิธีทำทั้งหมด — อ่านอย่างเดียว ไม่ต้องคอยติ๊กว่าทำถึงไหนแล้ว */}
      <div className="card p-5 md:p-6 mb-4">
        <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide mb-4">
          วิธีทำ
        </h3>
        <ol className="space-y-3 md:space-y-4">
          {recipe.instructions.map((instruction, i) => {
            const duration = stepDurations[i];
            return (
              <li key={i}>
                <div className="flex gap-3 md:gap-4">
                  <span className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-full text-xs md:text-sm font-bold flex items-center justify-center bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                    {i + 1}
                  </span>
                  <p className="text-sm md:text-base leading-relaxed pt-0.5 text-[var(--color-ink)]">
                    {instruction}
                  </p>
                </div>

                {/* ขั้นตอนที่ระบุเวลาไว้ — ให้จับเวลาได้เลย ไม่ต้องไปหานาฬิกา */}
                {duration !== null && <StepTimer seconds={duration} />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ปุ่มเดียวจบ — sticky ติดล่างจอ */}
      <div className="sticky bottom-0 z-20 mt-auto pt-3 pb-4 safe-bottom bg-gradient-to-t from-[var(--color-page)] via-[var(--color-page)]/95 to-transparent">
        <button
          type="button"
          onClick={() => setFinished(true)}
          className="btn-primary w-full py-3.5 md:py-4 font-semibold tap"
        >
          ทำเสร็จแล้ว 🎉
        </button>
      </div>

      <ShareSheet
        open={shareOpen}
        busy={sharePending}
        onChoose={handleShare}
        onCancel={() => setShareOpen(false)}
      />
    </div>
  );
}
