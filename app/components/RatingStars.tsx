"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect } from "react";
import { IconStar } from "./Icons";
import type { CookRating } from "../utils/types";

const STAR_VALUES: CookRating[] = [1, 2, 3, 4, 5];

interface RatingStarsProps {
  rating: CookRating | null;
  onRate: (choice: CookRating) => void;
}

function Star({
  value,
  active,
  checked,
  onRate,
}: {
  value: CookRating;
  /** ระบายสีทองหรือยัง — ดวงที่ต่ำกว่าคะแนนที่เลือกก็ติดด้วย */
  active: boolean;
  /** ดวงที่ถูกเลือกจริง ๆ — ใน radiogroup ต้องติ๊กได้ทีละดวงเท่านั้น */
  checked: boolean;
  onRate: (choice: CookRating) => void;
}) {
  const controls = useAnimationControls();

  useEffect(() => {
    // เด้งเฉพาะตอนติด ตอนดับให้หดกลับเงียบ ๆ ไม่ต้องเรียกร้องความสนใจ
    if (active) {
      controls.start({
        scale: [1, 1.45, 0.92, 1],
        // ดวงที่อยู่ขวากว่าเด้งช้ากว่า = เห็นเป็นคลื่นวิ่งจากซ้ายไปขวา
        transition: { duration: 0.45, delay: (value - 1) * 0.07 },
      });
    } else {
      controls.start({ scale: 1, transition: { duration: 0.15 } });
    }
  }, [active, value, controls]);

  return (
    <motion.button
      type="button"
      onClick={() => onRate(value)}
      animate={controls}
      whileTap={{ scale: 0.85 }}
      role="radio"
      aria-checked={checked}
      aria-label={`${value} ดาว`}
      className={`p-1.5 rounded-lg transition-colors duration-150 tap ${
        active
          ? "text-[var(--color-star)]"
          : "text-[var(--color-line)] hover:text-[var(--color-star)]/50"
      }`}
    >
      <IconStar size={32} filled={active} />
    </motion.button>
  );
}

/**
 * ดาวให้คะแนนหลังทำอาหารเสร็จ — ติดแล้วเด้งไล่กันเป็นคลื่น
 *
 * แยกออกมาเป็นคอมโพเนนต์เพราะแต่ละดวงต้องมี animation controls ของตัวเอง
 * จะสั่งเด้งทีละดวงจากที่เดียวไม่ได้
 */
export function RatingStars({ rating, onRate }: RatingStarsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="ให้คะแนนเมนูนี้"
      className="flex justify-center gap-1"
    >
      {STAR_VALUES.map((value) => (
        <Star
          key={value}
          value={value}
          active={rating !== null && value <= rating}
          checked={rating === value}
          onRate={onRate}
        />
      ))}
    </div>
  );
}
