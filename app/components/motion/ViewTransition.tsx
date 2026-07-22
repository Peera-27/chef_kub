"use client";

import { AnimatePresence, motion } from "motion/react";

const EASE_SPRING = [0.16, 1, 0.3, 1] as const;

interface ViewTransitionProps {
  /** เปลี่ยนค่าเมื่อไหร่ = สลับหน้าเมื่อนั้น */
  viewKey: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * สลับหน้าแบบ crossfade + เลื่อนขึ้นเล็กน้อย
 *
 * mode="wait" ให้หน้าเก่าออกให้สุดก่อนหน้าใหม่จะเข้า — ถ้าไม่รอ
 * สองหน้าจะซ้อนกันในโฟลว์ปกติแล้วความสูงหน้ากระตุกตอนสลับ
 *
 * initial={false} กันไม่ให้เล่นอนิเมชันรอบแรกตอนเพิ่งเปิดแอป
 */
export function ViewTransition({
  viewKey,
  className,
  children,
}: ViewTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        className={className}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
        transition={{ duration: 0.34, ease: EASE_SPRING }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
