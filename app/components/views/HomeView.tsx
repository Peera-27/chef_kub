import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import type { Recipe } from "../../types/recipe";
import { COOKING_MODES, type CookingMode } from "../../utils/cookingModes";
import { ImageItem, ScanHistoryEntry } from "../../utils/types";
import {
  IconCamera,
  IconChefHat,
  IconClock,
  IconHeart,
  IconImage,
  IconPencil,
  IconSparkles,
  IconTag,
  IconX,
} from "../Icons";

interface HomeViewProps {
  gallery: ImageItem[];
  history: ScanHistoryEntry[];
  favorites: Recipe[];
  allItemsCount: number;
  hasRecipes: boolean;
  cookingMode: CookingMode;
  onCookingModeChange: (mode: CookingMode) => void;
  onStartCamera: () => void;
  onUploadImage: (base64: string) => void;
  /** ยิงตอนผู้ใช้ส่อแววว่าจะอัปโหลด เพื่อให้โมเดลเริ่มโหลดคู่ขนานกับที่เขาหารูป */
  onPrepareScan: () => void;
  onRemoveImage: (imageId: string) => void;
  onRemoveItem: (imageId: string, itemName: string) => void;
  onEditImage: (image: ImageItem) => void;
  onInventRecipe: () => void;
  onQuickStartHistory: (items: string[]) => void;
  selectedHistoryItems: string[] | null;
  onRemoveHistoryItem: (itemName: string) => void;
  onQuickCookFavorite: (recipe: Recipe) => void;
}

export function HomeView({
  gallery,
  history,
  favorites,
  allItemsCount,
  hasRecipes,
  cookingMode,
  onCookingModeChange,
  onStartCamera,
  onUploadImage,
  onPrepareScan,
  onRemoveImage,
  onRemoveItem,
  onEditImage,
  onInventRecipe,
  onQuickStartHistory,
  selectedHistoryItems,
  onRemoveHistoryItem,
  onQuickCookFavorite,
}: HomeViewProps) {
  const topFavorite = favorites[0];
  const currentStep = hasRecipes ? 3 : allItemsCount > 0 ? 2 : 1;
  const selectionReviewRef = useRef<HTMLDivElement>(null);
  const cookingModeRef = useRef<HTMLDivElement>(null);

  const selectHistoryIngredients = (items: string[]) => {
    onQuickStartHistory(items);
    window.setTimeout(() => {
      (selectionReviewRef.current ?? cookingModeRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  return (
    <div className="space-y-4 fade-in md:space-y-6">
      <section className="pt-1 md:pt-2">
        <p className="text-xs font-semibold text-[var(--color-brand)]">
          {currentStep === 1
            ? "เริ่มจากของที่มี"
            : currentStep === 2
              ? `พบแล้ว ${allItemsCount} วัตถุดิบ`
              : "เมนูของคุณพร้อมแล้ว"}
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-[var(--color-ink)] md:text-3xl">
          {currentStep === 1
            ? "วันนี้มีอะไรในครัว?"
            : currentStep === 2
              ? "เลือกแนวอาหารที่อยากกิน"
              : "เลือกเมนูแล้วเริ่มทำได้เลย"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)] sm:mt-2">
          {currentStep === 1
            ? "ถ่ายรูปหรือเลือกรูปวัตถุดิบ แล้วเชฟคับจะช่วยคิดเมนูให้"
            : currentStep === 2
              ? "ตรวจรายการด้านล่างให้ถูกต้อง แล้วขอสูตรอาหารได้ทันที"
              : "ดูเมนูที่แนะนำ หรือสแกนวัตถุดิบชุดใหม่"}
        </p>

        <div className="mt-3 flex items-center gap-3 sm:hidden" aria-label={`ขั้นตอนที่ ${currentStep} จาก 3`}>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--color-muted)]">
            ขั้นตอน {currentStep} จาก 3
          </span>
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1.5 flex-1 rounded-full ${
                  step <= currentStep
                    ? "bg-[var(--color-brand)]"
                    : "bg-[var(--color-line)]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 hidden grid-cols-3 gap-2 sm:grid" aria-label={`ขั้นตอนที่ ${currentStep} จาก 3`}>
          {["สแกนวัตถุดิบ", "เลือกแนวอาหาร", "รับเมนู"].map((label, index) => {
            const step = index + 1;
            const active = step === currentStep;
            const complete = step < currentStep;
            return (
              <div key={label} className="min-w-0">
                <div
                  className={`h-1.5 rounded-full ${
                    active || complete
                      ? "bg-[var(--color-brand)]"
                      : "bg-[var(--color-line)]"
                  }`}
                />
                <p
                  className={`mt-1.5 truncate text-[10px] md:text-xs ${
                    active
                      ? "font-semibold text-[var(--color-brand)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {step}. {label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Primary path first; upload remains available without competing with it. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.35fr_1fr] md:gap-4">
        <button
          onClick={onStartCamera}
          className="group relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] p-4 text-left text-white shadow-[var(--shadow-lg)] transition-all duration-200 active:scale-[0.98] sm:gap-4 sm:p-5 md:p-6 tap slide-up"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/18 transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12">
            <IconCamera size={24} />
          </span>
          <span className="min-w-0">
            <span className="block font-bold md:text-lg">ถ่ายวัตถุดิบ</span>
            <span className="mt-0.5 hidden text-xs text-white/80 sm:block">
              เร็วที่สุด · ใช้กล้องถ่ายได้เลย
            </span>
          </span>
        </button>
        {/* onClick มาก่อนที่ไดอะล็อกเลือกไฟล์จะเปิด — โมเดลจึงโหลดคู่ขนานไปกับที่ผู้ใช้ไล่หารูป
            (ใช้ onClick ไม่ใช่ onPointerDown เพราะแค่เอานิ้วแตะเพื่อเลื่อนหน้าจอไม่ควรดึง 11MB) */}
        <label
          onClick={onPrepareScan}
          className="group flex min-h-12 items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-pale)] hover:shadow-[var(--shadow-md)] active:scale-[0.98] sm:min-h-[88px] sm:p-4 tap pop-in"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11">
            <IconImage size={22} />
          </span>
          <span className="min-w-0 text-left">
            <span className="block font-semibold text-[var(--color-ink)]">
              เลือกรูปจากเครื่อง
            </span>
            <span className="mt-0.5 hidden text-xs text-[var(--color-muted)] sm:block">
              ใช้รูปที่ถ่ายไว้แล้ว
            </span>
          </span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (re) =>
                  onUploadImage(re.target?.result as string);
                reader.readAsDataURL(file);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>

      {/* Quick-cook favorite */}
      {topFavorite && (
        <div className="card-glass hidden p-4 md:flex md:items-center md:justify-between md:gap-3 slide-up">
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-favorite)] font-medium mb-1 flex items-center gap-1">
              <IconHeart size={12} filled />
              ทำเมนูโปรดอีกครั้ง
            </p>
            <p className="font-semibold text-[var(--color-ink)] truncate">
              {topFavorite.name}
            </p>
          </div>
          <button
            onClick={() => onQuickCookFavorite(topFavorite)}
            className="btn-primary shrink-0 text-sm px-4 py-2.5 tap micro-bounce"
          >
            เริ่มทำเลย
          </button>
        </div>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="section-title">รูปที่สแกน</h2>
            <span className="pill bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              {gallery.length} รูป
            </span>
          </div>

          {/* Multiple columns on tablet, single on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* popLayout ให้ใบที่เหลือไหลมาปิดช่องว่างทันทีที่ลบใบหนึ่งออก
                แทนที่จะรอ exit จบก่อนแล้วค่อยกระโดดจัดตำแหน่งใหม่ */}
            <AnimatePresence initial={false} mode="popLayout">
              {gallery.map((img, idx) => {
                const items = img.items ?? [];
                // โมเดลไม่รู้จักอะไรในรูปนี้เลย — รูปแบบนี้แหละที่มีค่าที่สุดถ้าผู้ใช้ช่วย label
                const unidentified = items.length === 0;

                return (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      transition: { duration: 0.2 },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 340,
                      damping: 30,
                      delay: idx * 0.05,
                    }}
                    whileHover={{ y: -3 }}
                    className={`group relative rounded-2xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${
                      unidentified
                        ? "border-2 border-[var(--color-warn)]/40 attention-ring"
                        : "border border-black/[0.04]"
                    }`}
                  >
                    {/* Delete button */}
                    <button
                      onClick={() => onRemoveImage(img.id)}
                      className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white text-sm backdrop-blur-md transition-all duration-200 hover:bg-[var(--color-danger)] hover:scale-110 active:scale-95 shadow-lg"
                      aria-label="ลบรูป"
                    >
                      <IconX size={14} />
                    </button>

                    {/* Image container */}
                    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[var(--color-brand-pale)] to-[var(--color-brand-soft)] overflow-hidden">
                      {/* กล่อง crop รูปให้พอดีกรอบ + ทำ zoom ตอน hover */}
                      <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105">
                        <img
                          src={img.url}
                          alt="วัตถุดิบ"
                          className="w-full h-full object-contain"
                        />

                      </div>

                      {/* Subtle gradient overlay at bottom for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                      {/* Item count badge - top left */}
                      <div className="absolute top-3 left-3 z-20">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-md shadow-sm ${
                            unidentified
                              ? "text-[var(--color-warn)]"
                              : "text-[var(--color-ink)]"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full animate-pulse ${
                              unidentified
                                ? "bg-[var(--color-warn)]"
                                : "bg-[var(--color-success)]"
                            }`}
                          />
                          {unidentified
                            ? "ยังไม่รู้จัก"
                            : `${items.length} รายการ`}
                        </span>
                      </div>

                      {/* Item chips - bottom overlay */}
                      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-1.5">
                        {/* key เป็นชื่อไม่ใช่ index — onRemoveItem ลบด้วยชื่ออยู่แล้ว
                            ถ้าใช้ index ตอนลบชิปกลางแถว ตัวที่เหลือจะเลื่อน index
                            แล้ว Motion จะเล่น exit ผิดตัว */}
                        <AnimatePresence initial={false} mode="popLayout">
                          {items.map((it, i) => (
                            <motion.button
                              key={it.name}
                              layout
                              onClick={() => onRemoveItem(img.id, it.name)}
                              initial={{ opacity: 0, scale: 0.5, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{
                                opacity: 0,
                                scale: 0.6,
                                transition: { duration: 0.18 },
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 28,
                                delay: i * 0.05,
                              }}
                              whileTap={{ scale: 0.92 }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/95 backdrop-blur-md shadow-sm text-[var(--color-ink)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] transition-colors duration-200 border border-black/[0.06]"
                            >
                              {it.name}
                              <span className="opacity-50 hover:opacity-100">
                                <IconX size={10} />
                              </span>
                            </motion.button>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Action bar */}
                    {unidentified ? (
                      <div className="px-4 py-3 bg-[var(--color-warn-soft)] border-t border-[var(--color-warn)]/20 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none mt-0.5 wiggle">
                            🤔
                          </span>
                          <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                            ยังไม่รู้จักวัตถุดิบในรูปนี้{" "}
                            <span className="text-[var(--color-muted)]">
                              ช่วยระบุให้หน่อย แล้วครั้งหน้าจะจำได้
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => onEditImage(img)}
                          className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--color-warn)] to-[var(--color-warn-dark)] text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.97] tap"
                        >
                          <IconTag size={16} />
                          ช่วยระบุวัตถุดิบ
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-white border-t border-black/[0.04] space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-brand-soft)] to-[var(--color-brand-pale)] flex items-center justify-center text-[var(--color-brand)] shrink-0">
                            <IconChefHat size={16} />
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-ink)] leading-tight">
                            {items.length} วัตถุดิบ
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditImage(img)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-white border border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-brand)] transition-all duration-200 active:scale-95"
                          >
                            <IconPencil size={14} />
                            แก้ไข
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {selectedHistoryItems !== null && (
        <div
          ref={selectionReviewRef}
          className="scroll-mt-24 rounded-[var(--radius-lg)] border border-[var(--color-brand)]/25 bg-[var(--color-brand-pale)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                วัตถุดิบที่เลือกจากประวัติ
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                กดรายการที่ไม่ต้องการเพื่อลบออก
              </p>
            </div>
            <span className="pill shrink-0 bg-white text-[var(--color-brand)]">
              {selectedHistoryItems.length} อย่าง
            </span>
          </div>

          {selectedHistoryItems.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedHistoryItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onRemoveHistoryItem(item)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 text-sm font-medium text-[var(--color-ink)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--color-danger)]/35 hover:bg-[var(--color-danger-soft)]"
                  aria-label={`ลบ ${item}`}
                >
                  <span>{item}</span>
                  <IconX size={14} className="text-[var(--color-danger)]" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[var(--radius-md)] bg-white px-3 py-3 text-sm text-[var(--color-muted)]">
              ลบวัตถุดิบออกหมดแล้ว เลือกชุดอื่นจากประวัติหรือสแกนใหม่ได้เลย
            </p>
          )}
        </div>
      )}

      {/* Cooking mode + CTA: generate recipes */}
      {allItemsCount > 0 && (
        <div ref={cookingModeRef} className="scroll-mt-24 space-y-3">
          <div className="card-glass p-4 md:p-5 space-y-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">
              อยากได้เมนูแนวไหน
            </p>
            <div className="grid grid-cols-3 gap-2">
              {COOKING_MODES.map((mode) => {
                const isActive = mode.id === cookingMode;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onCookingModeChange(mode.id)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-[var(--radius-lg)] border tap transition-all duration-200 active:scale-[0.97] ${
                      isActive
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[var(--shadow-sm)]"
                        : "border-[var(--color-line)] bg-white hover:border-[var(--color-brand)]"
                    }`}
                  >
                    <span className="text-xl leading-none">{mode.emoji}</span>
                    <span
                      className={`text-xs font-semibold ${
                        isActive
                          ? "text-[var(--color-brand)]"
                          : "text-[var(--color-ink)]"
                      }`}
                    >
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--color-muted)] text-center">
              {COOKING_MODES.find((mode) => mode.id === cookingMode)?.hint}
            </p>
          </div>

          <button
            onClick={onInventRecipe}
            className="group relative w-full py-4 md:py-5 text-base md:text-lg font-semibold tap overflow-hidden bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] text-white rounded-[var(--radius-xl)] shadow-[var(--shadow-glow)] active:scale-[0.98] transition-all duration-200 micro-bounce"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <IconSparkles size={20} />
              ขอสูตรอาหาร ({allItemsCount} วัตถุดิบ)
            </span>
          </button>
        </div>
      )}

      {/* History quick-start */}
      {history.length > 0 && (
        <details className="group rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white/70 p-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-brand-pale)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <IconClock size={16} />
              ใช้วัตถุดิบที่เคยสแกน
            </span>
            <span className="text-lg transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="mt-1 space-y-1 border-t border-[var(--color-line)] pt-2">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.id}
                onClick={() => selectHistoryIngredients(h.items)}
                className="btn-ghost w-full justify-start gap-2 rounded-[var(--radius-md)] px-3 py-3 text-left text-sm hover:bg-[var(--color-brand-pale)] tap"
              >
                <IconClock size={14} className="shrink-0 opacity-60" />
                <span className="truncate">{h.items.join(", ")}</span>
                <span className="ml-auto shrink-0 text-[11px] font-semibold text-[var(--color-brand)]">
                  เลือกชุดนี้
                </span>
              </button>
            ))}
          </div>
        </details>
      )}

    </div>
  );
}
