"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";
import { SheetShell } from "./motion/SheetShell";

export interface Notice {
  title: string;
  message: string;
  /** บรรทัดแนะนำทางออก ขึ้นเป็นกล่องสีอ่อนใต้ข้อความ */
  hint?: string;
  actionLabel?: string;
}

interface NoticeModalProps {
  notice: Notice | null;
  onClose: () => void;
}

/**
 * แทน alert() ของเบราว์เซอร์ — บอกข่าวร้ายด้วยหน้าตาของแอปเอง
 * ปุ่มเดียว รับทราบแล้วจบ ไม่มีให้เลือก (ถ้าต้องเลือกให้ใช้โมดัลอื่น)
 */
export function NoticeModal({ notice, onClose }: NoticeModalProps) {
  /* คาเนื้อหาตัวสุดท้ายไว้ระหว่างอนิเมชันปิด — ถ้าอ่านจาก notice ตรง ๆ
     พอกดปิดค่าจะเป็น null ทันที เหลือแผ่นเปล่าเลื่อนลงไปให้ดู

     ปรับ state ตอนเรนเดอร์ ไม่ใช่ใน useEffect ตามที่ React แนะนำสำหรับ
     "ค่าที่ต้องขยับตาม prop" — เขียนใน effect จะได้เฟรมที่แผ่นว่างแวบหนึ่ง */
  const [shown, setShown] = useState<Notice | null>(notice);
  if (notice && notice !== shown) setShown(notice);

  return (
    <SheetShell
      open={notice !== null}
      onDismiss={onClose}
      panelClassName="md:max-w-sm"
    >
      <div className="px-6 pt-2 pb-6 md:pt-7 text-center">
        <motion.div
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--color-brand-pale)]"
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 13,
            delay: 0.08,
          }}
        >
          <Image
            src="/mascot.png"
            alt=""
            width={384}
            height={384}
            className="h-14 w-14 select-none"
          />
        </motion.div>

        <h2 className="mt-4 text-base md:text-lg font-bold text-[var(--color-ink)]">
          {shown?.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {shown?.message}
        </p>

        {shown?.hint && (
          <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-brand-pale)] px-4 py-3 text-xs leading-relaxed text-[var(--color-brand)]">
            {shown.hint}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="btn-primary w-full mt-6 py-3 text-sm tap"
        >
          {shown?.actionLabel ?? "เข้าใจแล้ว"}
        </button>
      </div>
    </SheetShell>
  );
}
