"use client";

import { motion } from "motion/react";
import type { CardFormat } from "../utils/recipeCard";
import { SheetShell } from "./motion/SheetShell";
import { IconShare } from "./Icons";

export type ShareChoice = "text" | CardFormat;

interface ShareSheetProps {
  open: boolean;
  busy: ShareChoice | null;
  onChoose: (choice: ShareChoice) => void;
  onCancel: () => void;
}

const OPTIONS: {
  choice: ShareChoice;
  title: string;
  hint: string;
  /** สัดส่วนกรอบตัวอย่างทางซ้าย ให้เห็นทรงการ์ดก่อนกด */
  preview: string;
}[] = [
  {
    choice: "feed",
    title: "การ์ดรูป 4:5",
    hint: "โพสต์ลงฟีด Facebook / IG",
    preview: "w-10 h-12",
  },
  {
    choice: "story",
    title: "การ์ดรูป 9:16",
    hint: "ลงสตอรี่ IG / Line",
    preview: "w-7 h-12",
  },
  {
    choice: "text",
    title: "ข้อความ",
    hint: "ส่งเข้าแชตได้ทุกที่",
    preview: "w-11 h-11",
  },
];

export function ShareSheet({
  open,
  busy,
  onChoose,
  onCancel,
}: ShareSheetProps) {
  return (
    <SheetShell open={open} onDismiss={onCancel} panelClassName="md:max-w-md">
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <IconShare size={18} />
        <h3 className="font-semibold text-[var(--color-ink)]">แชร์สูตรนี้</h3>
      </div>

      <div className="px-3 pb-3">
        {OPTIONS.map((option, index) => {
          const isBusy = busy === option.choice;
          return (
            <motion.button
              key={option.choice}
              onClick={() => onChoose(option.choice)}
              disabled={busy !== null}
              // ตัวเลือกไล่โผล่ทีละอันหลังแผ่นเลื่อนขึ้นมาเสร็จ
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.06, duration: 0.3 }}
              whileTap={busy === null ? { scale: 0.98 } : undefined}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-[var(--radius-md)] text-left transition-colors hover:bg-[var(--color-brand-pale)] disabled:opacity-50 tap"
            >
              <span
                className={`${option.preview} shrink-0 rounded-md border-2 border-[var(--color-brand)] bg-[var(--color-brand-soft)] grid place-items-center ${
                  isBusy ? "glow-pulse" : ""
                }`}
              >
                {option.choice === "text" && (
                  <span className="text-[var(--color-brand)] text-xs font-bold">
                    Aa
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--color-ink)]">
                  {option.title}
                </span>
                <span className="block text-xs text-[var(--color-muted)] mt-0.5">
                  {isBusy ? "กำลังสร้าง…" : option.hint}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="px-5 pb-5 safe-bottom">
        <button
          onClick={onCancel}
          disabled={busy !== null}
          className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50 tap"
        >
          ยกเลิก
        </button>
      </div>
    </SheetShell>
  );
}
