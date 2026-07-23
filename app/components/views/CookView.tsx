"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
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
import { IconCart, IconCheck, IconShare } from "../Icons";
import { Confetti } from "../motion/Confetti";
import { RatingStars } from "../RatingStars";
import { recordCookRating } from "../../utils/storage";
import type { CookRating } from "../../utils/types";

// กันกดเพิ่มเพลินจนปริมาณเป็นเลขไร้สาระ
const MAX_SERVINGS = 20;

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
  /** true = กำลัง gen รูปเมนูนี้อยู่ — โชว์ skeleton คั่นไว้ก่อน */
  imageLoading?: boolean;
}

export function CookView({
  recipe,
  onDone,
  imageLoading = false,
}: CookViewProps) {
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

  // สิ่งที่แชร์ออกไปต้องเป็นปริมาณเท่าที่เห็นบนจอ ไม่ใช่ฐานที่โมเดลให้มา
  // ไม่งั้นคนปรับเป็น 4 ที่แล้วแชร์ จะได้สูตรสำหรับ 1 ที่ติดไป
  const sharedRecipe = useMemo(
    () =>
      factor === 1
        ? recipe
        : {
            ...recipe,
            servings,
            ingredients: recipe.ingredients.map((ing) =>
              scaleIngredient(ing, factor),
            ),
          },
    [recipe, servings, factor],
  );

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
      const result = await shareRecipe(sharedRecipe);
      setSharePending(null);
      setShareOpen(false);
      showResult(result);
      return;
    }

    setSharePending(choice);
    let file: File;
    try {
      file = await buildRecipeCardFile(sharedRecipe, choice, rating);
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
      <div className="relative flex flex-col items-center justify-center min-h-[75vh] text-center overflow-hidden">
        <Confetti />

        {/* มาสคอตเด้งเข้ามาก่อน แล้วข้อความกับการ์ดค่อยไล่ขึ้นตาม —
            ทุกอย่างโผล่พร้อมกันจะไม่รู้สึกว่ามีอะไรมาฉลองด้วย */}
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="relative mb-4"
        >
          <Image
            src="/mascot.png"
            alt=""
            width={384}
            height={384}
            className="h-28 w-28 md:h-32 md:w-32 select-none"
            priority
          />
        </motion.div>

        <motion.h2
          className="section-title md:text-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          ทำเสร็จแล้ว!
        </motion.h2>
        <motion.p
          className="text-sm text-[var(--color-muted)] mt-1 mb-8 max-w-xs"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          {recipe.name} พร้อมเสิร์ฟ — จากของที่มีอยู่ในครัวคุณเอง
        </motion.p>

        {/* ถามครั้งเดียว แตะดาวเดียวจบ ไม่ต้องพิมพ์อะไร */}
        <motion.div
          className="w-full max-w-xs rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {rating ? RATING_LABELS[rating] : "ให้กี่ดาว?"}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-1 mb-4">
            ดาวที่ให้จะติดไปบนการ์ดตอนแชร์ด้วย
          </p>
          <RatingStars rating={rating} onRate={handleRate} />
        </motion.div>

        {/* อวดตอนนี้แหละ — อาหารเพิ่งเสร็จ อยู่ตรงหน้าพอดี */}
        <motion.div
          className="w-full max-w-xs mt-5 space-y-2"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>

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
          <h2 className="section-title md:text-xl">
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

      {/* Recipe image — เมนูที่ยังไม่เคย gen รูปจะทยอยมาระหว่างอ่านสูตร */}
      {recipe.imageUrl ? (
        <div className="relative rounded-[var(--radius-lg)] overflow-hidden mb-6 ring-1 ring-black/5 shadow-md">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full aspect-video object-cover"
          />
        </div>
      ) : imageLoading ? (
        <div className="skeleton w-full aspect-video rounded-[var(--radius-lg)] mb-6" />
      ) : null}

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
              เตรียมแล้ว{" "}
              {/* key = ตัวเลข ทำให้เด้งใหม่ทุกครั้งที่ติ๊กเพิ่ม รู้สึกว่าคืบหน้า */}
              <motion.span
                key={checkedIngredients.size}
                initial={{ scale: 1.5, color: "var(--color-brand)" }}
                animate={{ scale: 1, color: "var(--color-muted)" }}
                transition={{ duration: 0.35 }}
                className="inline-block font-semibold tabular-nums"
              >
                {checkedIngredients.size}
              </motion.span>
              /{recipe.ingredients.length}
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
                    {/* เดิมเรนเดอร์เครื่องหมายถูกค้างไว้ตลอดแล้วซ่อนด้วย text-transparent
                        ติ๊กแล้วเลยแค่สีเปลี่ยน ตอนนี้ให้มันเด้งเข้ามาจริง ๆ */}
                    <motion.span
                      animate={{ scale: done ? [1, 1.25, 1] : 1 }}
                      transition={{ duration: 0.3 }}
                      className={`w-5 h-5 mt-0.5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-150 ${
                        done
                          ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                          : "border-[var(--color-line)]"
                      }`}
                    >
                      <AnimatePresence>
                        {done && (
                          <motion.span
                            key="tick"
                            initial={{ scale: 0, rotate: -60 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 600,
                              damping: 22,
                            }}
                          >
                            <IconCheck size={12} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.span>
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

      {/* ของเสริม — ไม่ซื้อก็ทำเมนูนี้ได้ บอกให้ชัดจะได้ไม่รู้สึกว่าถูกบังคับ */}
      {recipe.extraIngredients && recipe.extraIngredients.length > 0 && (
        <div className="card p-4 md:p-5 mb-5 slide-up">
          <h3 className="text-sm font-bold text-[var(--color-brand)] uppercase tracking-wide mb-1">
            ซื้อเพิ่มก็ได้
          </h3>
          <p className="text-xs text-[var(--color-muted)] mb-3">
            ไม่มีก็ทำได้ มีแล้วอร่อยขึ้น
          </p>
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
