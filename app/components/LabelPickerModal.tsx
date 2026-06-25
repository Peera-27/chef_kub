"use client";

import { useMemo, useState } from "react";
import { addClass } from "../actions/classes";
import type { ClassEntry } from "../utils/classRegistry";
import { filterClassNames } from "../utils/classRegistry";
import { findSimilarLabels } from "../utils/normalizeLabel";

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

  const names = useMemo(
    () => classOptions.map((entry) => entry.name),
    [classOptions],
  );
  const options = useMemo(() => filterClassNames(query, names), [query, names]);
  const trimmedQuery = query.trim();
  const canAddNew =
    trimmedQuery.length >= 2 &&
    !names.some((name) => name.toLowerCase() === trimmedQuery.toLowerCase());

  const reset = () => {
    setQuery("");
    setError(null);
    setSimilar([]);
    setAdding(false);
  };

  const handleAddNew = async () => {
    if (!canAddNew || adding) return;
    setAdding(true);
    setError(null);
    setSimilar([]);

    const result = await addClass(trimmedQuery);
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
    reset();
    onSelect(result.entry.name);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:bg-black/40 md:backdrop-blur-sm p-0 md:p-4"
      onClick={() => {
        reset();
        onCancel();
      }}
    >
      <div
        className="card w-full md:max-w-lg md:max-h-[80vh] max-h-[85vh] flex flex-col rounded-t-[var(--radius-xl)] md:rounded-[var(--radius-xl)] sheet-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[var(--color-line)] rounded-full" />
        </div>

        <div className="p-5 md:p-6 pb-4 border-b border-[var(--color-line)]">
          <h2 className="font-bold text-[var(--color-ink)] text-base md:text-lg">
            {title}
          </h2>
          <p className="text-xs md:text-sm text-[var(--color-muted)] mt-1">
            เลือกจากรายการ หรือเพิ่มชื่อใหม่ (ระบบจะเช็คชื่อซ้ำให้)
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setSimilar([]);
            }}
            placeholder="ค้นหา เช่น แครอท, ไข่..."
            className="input-search mt-3"
            autoFocus
          />
        </div>

        <ul className="overflow-y-auto flex-1 p-2 md:p-3 no-scrollbar">
          {options.length === 0 && !canAddNew ? (
            <li className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">
              ไม่พบรายการที่ตรงกับ &quot;{query}&quot;
            </li>
          ) : (
            options.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    onSelect(label);
                  }}
                  className="w-full text-left px-4 py-3 md:py-3.5 rounded-[var(--radius-md)] text-sm md:text-base hover:bg-[var(--color-brand-pale)] active:bg-[var(--color-brand-soft)] transition-colors tap"
                >
                  {label}
                </button>
              </li>
            ))
          )}

          {canAddNew && (
            <li className="mt-2 pt-2 border-t border-[var(--color-line)]">
              <button
                type="button"
                onClick={handleAddNew}
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
            <li className="px-4 py-3 mt-2 rounded-[var(--radius-md)] bg-[var(--color-warn-soft)] text-[var(--color-warn)] text-sm">
              <p>{error}</p>
              {(similar.length > 0
                ? similar
                : findSimilarLabels(trimmedQuery, names).slice(0, 5)
              ).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    reset();
                    onSelect(name);
                  }}
                  className="block mt-2 text-[var(--color-brand)] underline tap py-1"
                >
                  ใช้ &quot;{name}&quot; แทน
                </button>
              ))}
              <div className="mt-3 pt-3 border-t border-[var(--color-warn)]/20">
                <button
                  type="button"
                  onClick={() => {
                    // บังคับสร้าง Class ใหม่ลง State ทันทีโดยไม่ง้อ Backend
                    const forceEntry = { id: Date.now(), name: trimmedQuery };
                    onClassesChange([
                      ...classOptions,
                      forceEntry as ClassEntry,
                    ]);
                    reset();
                    onSelect(trimmedQuery);
                  }}
                  className="w-full text-left font-medium text-[var(--color-warn)] hover:text-red-700 transition-colors tap"
                >
                  + ยืนยันที่จะเพิ่ม &quot;{trimmedQuery}&quot; อยู่ดี
                </button>
              </div>
            </li>
          )}
        </ul>

        <div className="p-3 md:p-4 border-t border-[var(--color-line)]">
          <button
            type="button"
            onClick={() => {
              reset();
              onCancel();
            }}
            className="w-full py-3 md:py-3.5 text-sm text-[var(--color-muted)] rounded-[var(--radius-md)] hover:bg-gray-50 transition-colors tap"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
