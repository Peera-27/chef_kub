"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Portal } from "../Portal";

interface SheetShellProps {
  open: boolean;
  /** กดพื้นหลังหรือปิดจากข้างนอก */
  onDismiss: () => void;
  /** คลาสเพิ่มของตัวแผ่น เช่น ความกว้าง/ความสูงสูงสุด */
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * เปลือกของ bottom sheet (มือถือ) / โมดัลกลางจอ (จอใหญ่)
 *
 * ที่ต้องมี component นี้เพราะเดิมโมดัลใช้ `if (!open) return null`
 * ซึ่งถอดออกจาก DOM ทันที — อนิเมชันตอนปิดเลยไม่มีทางได้เล่น
 * AnimatePresence คาโหนดไว้จนกว่า exit จะจบให้
 *
 * AnimatePresence อยู่ข้างใน Portal ไม่ใช่ข้างนอก เพราะมันนับ key
 * จากลูกตรงๆ ของตัวเอง ถ้าเอา Portal ไปคั่นมันจะมองไม่เห็น key
 */
export function SheetShell({
  open,
  onDismiss,
  panelClassName = "",
  children,
}: SheetShellProps) {
  // Esc ปิด + ล็อกไม่ให้พื้นหลังเลื่อนตาม (ไม่งั้นเลื่อนในลิสต์จนสุดแล้วหน้าข้างหลังเลื่อนต่อ)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:bg-black/40 md:backdrop-blur-sm p-0 md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className={`card w-full flex flex-col overflow-hidden rounded-t-[var(--radius-xl)] md:rounded-[var(--radius-xl)] ${panelClassName}`}
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle */}
              <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-[var(--color-line)] rounded-full" />
              </div>
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
