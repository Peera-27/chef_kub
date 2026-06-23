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
      onClassesChange([...classOptions, result.entry].sort((a, b) => a.id - b.id));
    }
    reset();
    onSelect(result.entry.name);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={() => {
        reset();
        onCancel();
      }}
    >
      <div
        className="card w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-orange-100/70">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400 mt-1">
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
            className="mt-3 w-full rounded-xl border border-orange-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
            autoFocus
          />
        </div>

        <ul className="overflow-y-auto flex-1 p-2">
          {options.length === 0 && !canAddNew ? (
            <li className="px-3 py-6 text-center text-sm text-gray-400">
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
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-orange-50 active:bg-orange-100"
                >
                  {label}
                </button>
              </li>
            ))
          )}

          {canAddNew && (
            <li className="mt-2 pt-2 border-t border-orange-100/70">
              <button
                type="button"
                onClick={handleAddNew}
                disabled={adding}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
              >
                {adding ? "กำลังเพิ่ม..." : `+ เพิ่ม "${trimmedQuery}" เป็นวัตถุดิบใหม่`}
              </button>
            </li>
          )}

          {error && (
            <li className="px-3 py-3 mt-2 rounded-xl bg-amber-50 text-amber-800 text-sm">
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
                  className="block mt-2 text-orange-600 underline"
                >
                  ใช้ &quot;{name}&quot; แทน
                </button>
              ))}
            </li>
          )}
        </ul>

        <div className="p-3 border-t border-orange-100/70">
          <button
            type="button"
            onClick={() => {
              reset();
              onCancel();
            }}
            className="w-full py-2.5 text-sm text-gray-500 rounded-xl hover:bg-gray-50"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
