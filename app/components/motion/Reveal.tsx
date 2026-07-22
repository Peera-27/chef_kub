"use client";

import { motion, useReducedMotion } from "motion/react";

/** เท่ากับ --ease-spring ใน globals.css — ให้อนิเมชัน JS กับ CSS รู้สึกเป็นชุดเดียวกัน */
const EASE_SPRING = [0.16, 1, 0.3, 1] as const;

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 26 },
  down: { x: 0, y: -26 },
  left: { x: 26, y: 0 },
  right: { x: -26, y: 0 },
  none: { x: 0, y: 0 },
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** หน่วงเป็นวินาที — ใส่ index * 0.08 เวลาไล่ทีละใบในกริด */
  delay?: number;
  direction?: Direction;
  /** สัดส่วนของกล่องที่ต้องโผล่เข้ามาในจอก่อนถึงจะเริ่มเล่น */
  amount?: number;
  duration?: number;
}

/**
 * เผยเนื้อหาตอนเลื่อนมาถึง — เล่นครั้งเดียวแล้วจบ (once)
 * ไม่เล่นซ้ำตอนเลื่อนขึ้นลงกลับไปมา เพราะจะกวนสายตามากกว่าจะสวย
 *
 * ใช้ใน server component ได้ เพราะรับ children เป็น prop
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  amount = 0.2,
  duration = 0.6,
}: RevealProps) {
  const reduced = useReducedMotion();
  const { x, y } = reduced ? OFFSET.none : OFFSET[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE_SPRING }}
    >
      {children}
    </motion.div>
  );
}
