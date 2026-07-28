"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  equipmentCategories,
  loadKitchenSettings,
  saveKitchenSettings,
} from "@/app/utils/storage/kitchenEquipment";
import { EmptyState } from "../EmptyState";
import { IconCheck, IconChevronDown, IconX } from "../Icons";

/** จำนวน chip อุปกรณ์ที่โชว์ก่อนพับเก็บ */
const CHIP_PREVIEW_COUNT = 3;

interface SettingProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingProps) {
  /* อ่านค่าที่เคยบันทึกไว้ตอน mount ครั้งแรก
     view นี้ถูก render ฝั่ง client เท่านั้น (viewMode เริ่มที่ "home") จึงอ่าน
     localStorage ใน initializer ได้เลย ไม่เกิด hydration mismatch */
  const [selected, setSelected] = useState<string[]>(
    () => loadKitchenSettings().equipment,
  );
  /** ค่าที่บันทึกลง localStorage แล้ว — ใช้เทียบว่ามีอะไรค้างยังไม่ได้เซฟ */
  const [savedEquipment, setSavedEquipment] = useState<string[]>(selected);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAllChips, setShowAllChips] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setOpenCategory((prev) => (prev === categoryId ? null : categoryId));
  };

  const toggleEquipment = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const getSelectedCount = (category: (typeof equipmentCategories)[number]) =>
    category.items.filter((item) => selected.includes(item.id)).length;

  /* เลือกทั้งหมด / ยกเลิกทั้งหมดในหมวด */
  const toggleAllInCategory = (
    category: (typeof equipmentCategories)[number],
  ) => {
    const categoryIds = category.items.map((item) => item.id);
    const allSelected = categoryIds.every((id) => selected.includes(id));

    setSelected((prev) =>
      allSelected
        ? prev.filter((id) => !categoryIds.includes(id))
        : Array.from(new Set([...prev, ...categoryIds])),
    );
  };

  const clearAll = () => setSelected([]);

  const handleSave = () => {
    saveKitchenSettings({ equipment: selected });
    setSavedEquipment(selected);
    onBack();
  };

  /* แปลง id เป็นข้อมูลอุปกรณ์จริง (เรียงตามลำดับในหมวด ไม่ใช่ลำดับที่กด) */
  const selectedEquipment = equipmentCategories
    .flatMap((category) => category.items)
    .filter((item) => selected.includes(item.id));

  const visibleChips = showAllChips
    ? selectedEquipment
    : selectedEquipment.slice(0, CHIP_PREVIEW_COUNT);

  const hiddenChipCount = selectedEquipment.length - visibleChips.length;

  const totalEquipmentCount = equipmentCategories.reduce(
    (sum, category) => sum + category.items.length,
    0,
  );

  /* ยังมีอะไรค้างไม่ได้เซฟหรือเปล่า */
  const isDirty = useMemo(() => {
    const current = [...selected].sort().join("|");
    const stored = [...savedEquipment].sort().join("|");
    return current !== stored;
  }, [selected, savedEquipment]);

  return (
    <div className="space-y-5 md:space-y-6 pb-6 fade-in">
      {/* ===== Title ===== */}
      <div>
        <h2 className="section-title">ตั้งค่าครัวของฉัน</h2>
        <p className="section-subtitle">
          เลือกอุปกรณ์ที่คุณมี Chef Kub จะแนะนำวิธีทำที่ทำได้จริงในครัวคุณ
        </p>
      </div>

      {/* ===== สรุปอุปกรณ์ที่เลือก ===== */}
      <div className="card-glass p-4 md:p-5 slide-up">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              อุปกรณ์ของฉัน
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              เลือกแล้ว {selected.length} จาก {totalEquipmentCount} รายการ
            </p>
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="btn-ghost shrink-0 text-xs px-3 py-2 hover:text-[var(--color-danger)]"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>

        {selectedEquipment.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {visibleChips.map((equipment, i) => (
              <button
                key={equipment.id}
                type="button"
                onClick={() => toggleEquipment(equipment.id)}
                style={{ "--i": i } as Record<string, string | number>}
                className="chip-in inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-[var(--shadow-xs)] text-[var(--color-ink)] border border-black/[0.06] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] transition-all duration-200 active:scale-95"
              >
                {equipment.name}
                <span className="opacity-50 hover:opacity-100">
                  <IconX size={10} />
                </span>
              </button>
            ))}

            {(hiddenChipCount > 0 || showAllChips) && (
              <button
                type="button"
                onClick={() => setShowAllChips((prev) => !prev)}
                className="pill bg-[var(--color-brand-soft)] text-[var(--color-brand)] hover:bg-white transition-colors active:scale-95"
              >
                {showAllChips ? "ย่อรายการ" : `+ อีก ${hiddenChipCount} รายการ`}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted)] mt-3">
            ยังไม่ได้เลือกอุปกรณ์ — เลือกจากหมวดด้านล่างได้เลย
          </p>
        )}
      </div>

      {/* ===== หมวดหมู่อุปกรณ์ ===== */}
      <div className="space-y-3 stagger">
        {equipmentCategories.map((category, index) => {
          const isOpen = openCategory === category.id;
          const selectedCount = getSelectedCount(category);
          const allSelected = selectedCount === category.items.length;

          return (
            <div
              key={category.id}
              style={{ "--i": index } as Record<string, string | number>}
              className={`bg-white rounded-[var(--radius-lg)] border overflow-hidden transition-all duration-200 ${
                isOpen
                  ? "border-[var(--color-brand)] shadow-[var(--shadow-md)]"
                  : "border-[var(--color-line)] shadow-[var(--shadow-sm)]"
              }`}
            >
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={isOpen}
                className="w-full p-4 flex items-center gap-3 text-left tap"
              >
                <span
                  className={`tile w-11 h-11 text-xl transition-colors duration-200 ${
                    isOpen
                      ? "bg-[var(--color-brand-soft)]"
                      : "bg-[var(--color-line-soft)]"
                  }`}
                >
                  {category.icon}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--color-ink)]">
                      {category.name}
                    </span>
                    {selectedCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-brand)] text-white">
                        {selectedCount}
                      </span>
                    )}
                  </span>

                  <span className="block text-xs text-[var(--color-muted)] mt-0.5 truncate">
                    {selectedCount > 0
                      ? `เลือกแล้ว ${selectedCount} / ${category.items.length} รายการ`
                      : category.description}
                  </span>
                </span>

                <span
                  className={`shrink-0 text-[var(--color-muted)] transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-[var(--color-brand)]" : ""
                  }`}
                >
                  <IconChevronDown size={18} />
                </span>
              </button>

              {/* Expanded */}
              {isOpen && (
                <div className="border-t border-[var(--color-line)] px-4 pb-4 fade-in">
                  <div className="flex justify-end py-3">
                    <button
                      type="button"
                      onClick={() => toggleAllInCategory(category)}
                      className="btn-ghost text-xs px-3 py-2 hover:text-[var(--color-brand)]"
                    >
                      {allSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {category.items.map((equipment) => {
                      const isSelected = selected.includes(equipment.id);

                      return (
                        <button
                          key={equipment.id}
                          type="button"
                          onClick={() => toggleEquipment(equipment.id)}
                          aria-pressed={isSelected}
                          className={`min-h-[52px] px-3 py-3 rounded-[var(--radius-md)] border text-left flex items-center gap-2 transition-all duration-200 active:scale-[0.97] ${
                            isSelected
                              ? "bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-brand)]"
                              : "bg-white border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-brand)]"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 transition-colors duration-200 ${
                              isSelected
                                ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                                : "bg-white border-[var(--color-line)]"
                            }`}
                          >
                            {isSelected && <IconCheck size={12} />}
                          </span>

                          <span className="text-xs font-medium leading-tight">
                            {equipment.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== ยังไม่ได้เลือกอะไรเลย ===== */}
      {selected.length === 0 && (
        <EmptyState
          icon="🍽️"
          title="ครัวยังว่างอยู่"
          description="กดที่หมวดด้านบนเพื่อเลือกอุปกรณ์ที่คุณมี แล้วสูตรอาหารจะถูกปรับให้ทำได้จริง"
        />
      )}

      {/* ===== หมายเหตุ ===== */}
      <p className="text-xs text-[var(--color-muted)] leading-relaxed px-1">
        💡 กลับมาเปลี่ยนอุปกรณ์ได้ทุกเมื่อ การตั้งค่านี้ใช้ช่วย AI
        ปรับวิธีทำอาหารให้เหมาะกับครัวของคุณ
      </p>

      {/* ===== บันทึก =====
          เดิมปุ่มนี้อยู่ท้ายสุดของหน้า ผู้ใช้ต้องเลื่อนผ่านหมวดอุปกรณ์ทั้งหมดถึงจะเจอ
          — เลือกเสร็จแล้วปิดไปเลยโดยไม่รู้ว่ายังไม่ได้บันทึกได้ง่ายมาก
          ตอนนี้เลยติดขอบล่างไว้ และโผล่เฉพาะตอนมีของค้างจริงๆ

          sticky ไม่ใช่ fixed — fixed จะไปอิงกับ ViewTransition ที่มี transform
          ระหว่างสลับหน้า แล้วแถบจะหลุดตำแหน่ง ส่วน sticky อิง scroll container ตามปกติ
          bottom-20 บนมือถือเว้นที่ให้ bottom nav, จอใหญ่ไม่มี nav เลยชิดขอบได้ */}
      <div className="sticky bottom-4 z-20 pt-1">
        <AnimatePresence>
          {isDirty && (
            <motion.div
              key="save-bar"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="card-glass flex items-center gap-3 p-2.5 shadow-[var(--shadow-lg)]"
            >
              <p className="flex-1 min-w-0 pl-2 text-xs leading-snug">
                <span className="block font-semibold text-[var(--color-ink)]">
                  เลือกไว้ {selected.length} รายการ
                </span>
                <span className="block text-[var(--color-muted)]">
                  ยังไม่ได้บันทึก
                </span>
              </p>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary shrink-0 flex items-center gap-1.5 px-5 py-3 text-sm tap"
              >
                <IconCheck size={16} />
                บันทึก
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
