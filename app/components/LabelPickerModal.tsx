"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addClass } from "../actions/classes";
import type { ClassEntry } from "../utils/classRegistry";
import { filterClassNames } from "../utils/classRegistry";
import { normalizeLabelName } from "../utils/normalizeLabel";
import { SheetShell } from "./motion/SheetShell";

interface LabelPickerModalProps {
  open: boolean;
  title?: string;
  classOptions: ClassEntry[];
  onSelect: (label: string) => void;
  onCancel: () => void;
  onClassesChange: (classes: ClassEntry[]) => void;
}

export function LabelPickerModal({
  open,
  title = "เลือกวัตถุดิบ",
  classOptions,
  onSelect,
  onCancel,
  onClassesChange,
}: LabelPickerModalProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const names = useMemo(
    () => classOptions.map((entry) => entry.name),
    [classOptions],
  );
  const options = useMemo(
    // กัน key ซ้ำใน <li> เผื่อ D1 มีสองแถวชื่อเดียวกัน
    () => [...new Set(filterClassNames(query, names))],
    [query, names],
  );
  const trimmedQuery = query.trim();
  const exactMatch = useMemo(() => {
    const normalized = normalizeLabelName(trimmedQuery);
    if (!normalized) return null;
    return names.find((name) => normalizeLabelName(name) === normalized) ?? null;
  }, [trimmedQuery, names]);
  const canAddNew = trimmedQuery.length >= 2 && !exactMatch;

  const reset = () => {
    setQuery("");
    setError(null);
    setSimilar([]);
    setAdding(false);
  };

  // เคลียร์ค่าทุกครั้งที่ปิด ไม่ใช่แค่ตอนกดยกเลิก/เลือก — เปิดใหม่จะได้ไม่ค้างคำค้นเดิม
  // ปรับ state ตอนเรนเดอร์ (ไม่ใช่ใน effect) เพื่อไม่ให้เห็นค่าเก่าแวบนึงก่อนถูกล้าง
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) reset();
  }

  /**
   * โฟกัสช่องค้นหาเฉพาะจอใหญ่ และรอให้อนิเมชันสปริงจบก่อน
   *
   * บนมือถือชีตอยู่ชิดขอบล่าง — โฟกัสทันทีคีย์บอร์ดจะเด้งขึ้นมาทับชีต
   * แถม viewport หดกลางอนิเมชันจนแผ่นกระตุก ปล่อยให้ผู้ใช้แตะเองดีกว่า
   */
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 260);
    return () => window.clearTimeout(timer);
  }, [open]);

  const pick = (label: string) => {
    reset();
    onSelect(label);
  };

  const handleAddNew = async (force = false) => {
    if (adding || trimmedQuery.length < 2) return;
    setAdding(true);
    setError(null);
    setSimilar([]);

    const result = await addClass(trimmedQuery, { force });
    setAdding(false);

    if (!result.ok) {
      setError(result.error);
      setSimilar(result.similar ?? []);
      return;
    }

    const exists = classOptions.some((entry) => entry.id === result.entry.id);
    if (!exists) {
      onClassesChange(
        [...classOptions, result.entry].sort((a, b) => a.id - b.id),
      );
    }
    pick(result.entry.name);
  };

  // กด Enter แล้วต้องได้ผล ไม่ใช่เงียบ ๆ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    if (exactMatch) return pick(exactMatch);
    if (canAddNew && !error) return void handleAddNew();
    if (options.length > 0) return pick(options[0]);
  };

  const dismiss = () => {
    reset();
    onCancel();
  };

  return (
    <SheetShell
      open={open}
      onDismiss={dismiss}
      panelClassName="md:max-w-lg md:max-h-[80vh] max-h-[85dvh]"
    >
      <form
        onSubmit={handleSubmit}
        className="p-5 md:p-6 pb-4 border-b border-[var(--color-line)] shrink-0"
      >
        <h2 className="font-bold text-[var(--color-ink)] text-base md:text-lg">
          {title}
        </h2>
        <p className="text-xs md:text-sm text-[var(--color-muted)] mt-1">
          เลือกจากรายการ หรือเพิ่มชื่อใหม่ (ระบบจะเช็คชื่อซ้ำให้)
        </p>
        <div className="relative mt-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setSimilar([]);
            }}
            placeholder="ค้นหา เช่น แครอท, ไข่..."
            className="input-search pr-11"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            aria-label="ค้นหาหรือพิมพ์ชื่อวัตถุดิบ"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setError(null);
                setSimilar([]);
                inputRef.current?.focus();
              }}
              aria-label="ล้างคำค้นหา"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-gray-100 active:scale-90 transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      <ul className="overflow-y-auto flex-1 min-h-0 p-2 md:p-3 no-scrollbar">
        {options.length === 0 && !canAddNew && (
          <li className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">
            {trimmedQuery
              ? `ไม่พบรายการที่ตรงกับ "${trimmedQuery}"`
              : "ยังไม่มีรายการวัตถุดิบ — พิมพ์ชื่อเพื่อเพิ่มใหม่ได้เลย"}
          </li>
        )}

        {options.map((label) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => pick(label)}
              className="w-full text-left px-4 py-3 md:py-3.5 rounded-[var(--radius-md)] text-sm md:text-base hover:bg-[var(--color-brand-pale)] active:bg-[var(--color-brand-soft)] transition-colors tap"
            >
              {label}
            </button>
          </li>
        ))}

        {/* ซ่อนตอนมี error อยู่ ไม่งั้นจะมีปุ่ม "เพิ่ม" สองอันซ้อนกันชวนงง */}
        {canAddNew && !error && (
          <li className="mt-2 pt-2 border-t border-[var(--color-line)]">
            <button
              type="button"
              onClick={() => handleAddNew()}
              disabled={adding}
              className="w-full text-left px-4 py-3 md:py-3.5 rounded-[var(--radius-md)] text-sm md:text-base bg-[var(--color-brand-pale)] text-[var(--color-brand)] font-medium hover:bg-[var(--color-brand-soft)] disabled:opacity-50 transition-colors tap"
            >
              {adding
                ? "กำลังเพิ่ม..."
                : `+ เพิ่ม "${trimmedQuery}" เป็นวัตถุดิบใหม่`}
            </button>
          </li>
        )}

        {error && (
          <li
            role="alert"
            className="px-4 py-3 mt-2 rounded-[var(--radius-md)] bg-[var(--color-warn-soft)] text-[var(--color-warn)] text-sm"
          >
            <p>{error}</p>
            {similar.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => pick(name)}
                className="block mt-2 text-[var(--color-brand)] underline tap py-1 text-left"
              >
                ใช้ &quot;{name}&quot; แทน
              </button>
            ))}
            {canAddNew && (
              <div className="mt-3 pt-3 border-t border-[var(--color-warn)]/20">
                <button
                  type="button"
                  onClick={() => handleAddNew(true)}
                  disabled={adding}
                  className="w-full text-left font-medium text-[var(--color-warn)] hover:text-[var(--color-warn-dark)] disabled:opacity-50 transition-colors tap"
                >
                  {adding
                    ? "กำลังเพิ่ม..."
                    : `+ ยืนยันที่จะเพิ่ม "${trimmedQuery}" อยู่ดี`}
                </button>
              </div>
            )}
          </li>
        )}
      </ul>

      <div className="p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--color-line)] shrink-0">
        <button
          type="button"
          onClick={dismiss}
          className="w-full py-3 md:py-3.5 text-sm text-[var(--color-muted)] rounded-[var(--radius-md)] hover:bg-gray-50 transition-colors tap"
        >
          ยกเลิก
        </button>
      </div>
    </SheetShell>
  );
}
