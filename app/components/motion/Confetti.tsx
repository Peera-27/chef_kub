"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

/** ใช้สีในธีมล้วน ๆ ไม่ยัดสีนอกชุด ไม่งั้นฉลองเสร็จแล้วหน้าจอดูหลุดแบรนด์ */
const COLORS = [
  "var(--color-brand)",
  "var(--color-star)",
  "var(--color-favorite)",
  "var(--color-success)",
  "var(--color-warn)",
];

/** ตัวเลขคงที่ ไม่สุ่มใหม่ทุกเฟรม — สุ่มครั้งเดียวตอน mount ด้วย useMemo */
function buildPieces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.5,
    duration: 2.2 + Math.random() * 1.3,
    drift: (Math.random() - 0.5) * 120,
    spin: (Math.random() - 0.5) * 720,
    size: 6 + Math.random() * 6,
    round: Math.random() > 0.6,
  }));
}

interface ConfettiProps {
  /** จำนวนชิ้น — มากกว่านี้เริ่มหนักเครื่องบนมือถือเก่า */
  count?: number;
}

/**
 * เศษกระดาษร่วงครั้งเดียวตอนทำอาหารเสร็จ
 *
 * ไม่วนซ้ำโดยตั้งใจ — ฉลองที่เล่นไม่หยุดจะกวนตอนผู้ใช้กำลังจะให้ดาว
 * ตัวมันเองไม่รับคลิก (pointer-events-none) เลยไม่บังปุ่มข้างล่าง
 */
export function Confetti({ count = 22 }: ConfettiProps) {
  const reduced = useReducedMotion();
  const pieces = useMemo(() => buildPieces(count), [count]);

  // คนที่ตั้งค่าลดการเคลื่อนไหวไว้ ไม่ควรเจอของร่วงเต็มจอ
  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
          }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{
            y: ["-10%", "115%"],
            x: [0, p.drift],
            rotate: [0, p.spin],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
            opacity: { times: [0, 0.1, 0.75, 1], duration: p.duration },
          }}
        />
      ))}
    </div>
  );
}
