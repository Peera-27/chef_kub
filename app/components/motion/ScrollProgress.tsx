"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * แถบบางๆ บนสุดของหน้า บอกว่าอ่านมาถึงไหนแล้ว
 * ใส่ spring หน่วงไว้ ไม่งั้นมันกระตุกตามล้อเมาส์ทีละสเต็ป
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-dark)]"
    />
  );
}
