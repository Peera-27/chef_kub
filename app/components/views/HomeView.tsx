import { AnimatePresence, motion } from "motion/react";
import { useId, useRef } from "react";
import type { Recipe } from "../../types/recipe";
import { COOKING_MODES, type CookingMode } from "../../utils/cookingModes";
import { EGG_BOXES } from "../../landing/data";
import { ImageItem, ScanHistoryEntry } from "../../utils/types";
import {
  IconCamera,
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
  // HomeView ถูก mount สองที่ (layout มือถือ + เดสก์ท็อป) id ตายตัวจะซ้ำกัน
  const exampleId = useId();
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
        <h1 className="text-2xl font-bold leading-tight text-[var(--color-ink)] md:text-[28px]">
          {currentStep === 1
            ? "วันนี้มีอะไรในครัว?"
            : currentStep === 2
              ? "เลือกแนวอาหารที่อยากกิน"
              : "เลือกเมนูแล้วเริ่มทำได้เลย"}
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-muted)] sm:mt-2">
          {currentStep === 1
            ? "ถ่ายรูปหรือเลือกรูปวัตถุดิบ แล้วเชฟคับจะช่วยคิดเมนูให้"
            : currentStep === 2
              ? `พบ ${allItemsCount} วัตถุดิบ ตรวจรายการด้านล่างให้ถูก แล้วขอสูตรอาหารได้เลย`
              : "ดูเมนูที่แนะนำ หรือสแกนวัตถุดิบชุดใหม่"}
        </p>

        <div className="mt-3 flex items-center gap-3 sm:hidden" aria-label={`ขั้นตอนที่ ${currentStep} จาก 3`}>
          <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)]">
            ขั้นตอน {currentStep} จาก 3
          </span>
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full ${
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
                  className={`h-1 rounded-full ${
                    active || complete
                      ? "bg-[var(--color-brand)]"
                      : "bg-[var(--color-line)]"
                  }`}
                />
                <p
                  className={`mt-1.5 truncate text-xs ${
                    active
                      ? "font-semibold text-[var(--color-ink)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {label}
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
          className={`group flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] p-4 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] sm:min-h-[88px] sm:p-5 tap ${
            currentStep === 1
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-brand-dark)]"
              : "border border-[var(--color-control)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]"
          }`}
        >
          <IconCamera size={24} className="shrink-0" />
          <span className="min-w-0">
            <span className="block font-semibold md:text-lg">
              {currentStep === 1 ? "ถ่ายวัตถุดิบ" : "ถ่ายเพิ่ม"}
            </span>
            <span className="mt-0.5 hidden text-sm opacity-80 sm:block">
              เปิดกล้องในเว็บได้เลย
            </span>
          </span>
        </button>
        {/* onClick มาก่อนที่ไดอะล็อกเลือกไฟล์จะเปิด — โมเดลจึงโหลดคู่ขนานไปกับที่ผู้ใช้ไล่หารูป
            (ใช้ onClick ไม่ใช่ onPointerDown เพราะแค่เอานิ้วแตะเพื่อเลื่อนหน้าจอไม่ควรดึง 11MB) */}
        <label
          onClick={onPrepareScan}
          className="group flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-control)] bg-[var(--color-surface)] p-3 text-[var(--color-ink)] transition-[border-color,transform] duration-150 hover:border-[var(--color-ink)] active:scale-[0.98] sm:min-h-[88px] sm:p-4 tap"
        >
          <IconImage size={22} className="shrink-0" />
          <span className="min-w-0 text-left">
            <span className="block font-semibold text-[var(--color-ink)]">
              เลือกรูปจากเครื่อง
            </span>
            <span className="mt-0.5 hidden text-sm text-[var(--color-muted)] sm:block">
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

      {gallery.length === 0 && history.length === 0 && (
        <section
          aria-labelledby={exampleId}
          className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-[1.2fr_1fr] md:p-5"
        >
          <figure className="relative self-start overflow-hidden rounded-[var(--radius-md)]">
            <img
              src="/photos/eggs-chicken.webp"
              width={1400}
              height={934}
              alt="ตัวอย่างผลสแกน: ไข่ไก่ในแผง มีกรอบสีเขียวรอบไข่ห้าฟองที่โมเดลเจอ"
              className="block h-auto w-full"
            />
            {EGG_BOXES.map((b, i) => (
              <span
                key={i}
                className="absolute rounded-[3px] border-2 border-[var(--color-brand)]"
                style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
              >
                <span className="absolute bottom-full -left-0.5 whitespace-nowrap rounded-t-[3px] bg-[var(--color-brand)] px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                  ไข่ไก่ {Math.round(b.score * 100)}%
                </span>
              </span>
            ))}
          </figure>
          <div>
            <h2 id={exampleId} className="section-title">
              สแกนแล้วจะได้แบบนี้
            </h2>
            <p className="section-subtitle">
              รูปนี้โมเดลเจอไข่ไก่ 5 ฟอง ทั้งหมดคิดบนเครื่องคุณ
            </p>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-[var(--color-ink)]">
              <li className="border-t border-[var(--color-line-soft)] pt-3">
                ถ่ายให้เห็นของทีละอย่าง วางห่างกันนิด โมเดลจะแยกได้แม่นขึ้น
              </li>
              <li className="border-t border-[var(--color-line-soft)] pt-3">
                แสงพอ ถ่ายจากด้านบนหรือด้านหน้า ไม่ต้องจัดจาน
              </li>
              <li className="border-t border-[var(--color-line-soft)] pt-3">
                กรอบไหนผิดแตะแก้ได้ ของที่โมเดลมองข้ามก็ลากกรอบเพิ่มเองได้
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* Quick-cook favorite */}
      {topFavorite && (
        <div className="card-glass hidden p-4 md:flex md:items-center md:justify-between md:gap-3 slide-up">
          <div className="min-w-0">
            <p className="text-sm text-[var(--color-muted)] mb-0.5 flex items-center gap-1.5">
              <IconHeart size={14} filled className="text-[var(--color-favorite)]" />
              ทำเมนูโปรดอีกครั้ง
            </p>
            <p className="font-semibold text-[var(--color-ink)] line-clamp-2">
              {topFavorite.name}
            </p>
          </div>
          <button
            onClick={() => onQuickCookFavorite(topFavorite)}
            className="btn-primary shrink-0 text-sm px-4 py-2.5 tap"
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
            <span className="text-sm text-[var(--color-muted)] tabular-nums">
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
                    className={`group relative rounded-[var(--radius-lg)] overflow-hidden bg-white border ${
                      unidentified
                        ? "border-[var(--color-warn)] attention-ring"
                        : "border-[var(--color-line)]"
                    }`}
                  >
                    {/* Delete button */}
                    <button
                      onClick={() => onRemoveImage(img.id)}
                      className="absolute top-2 right-2 z-30 w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-ink)]/80 text-white transition-[background-color,transform] duration-150 hover:bg-[var(--color-danger)] active:scale-95"
                      aria-label="ลบรูป"
                    >
                      <IconX size={14} />
                    </button>

                    {/* Image container */}
                    <div className="relative w-full aspect-[4/3] bg-[var(--color-surface-2)] overflow-hidden">
                      <div className="absolute inset-0 w-full h-full">
                        <img
                          src={img.url}
                          alt="วัตถุดิบ"
                          className="w-full h-full object-contain"
                        />

                      </div>

                      {/* Item count badge - top left */}
                      <div className="absolute top-3 left-3 z-20">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-white ${
                            unidentified
                              ? "text-[var(--color-warn)]"
                              : "text-[var(--color-ink)]"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
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
                              className="inline-flex min-h-8 items-center gap-1 px-2 rounded-[var(--radius-sm)] text-[13px] font-medium bg-white text-[var(--color-ink)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] transition-colors duration-150"
                              aria-label={`ลบ ${it.name}`}
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
                      <div className="px-4 py-3 bg-[var(--color-warn-soft)] space-y-2.5">
                        <div>
                          <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                            ยังไม่รู้จักวัตถุดิบในรูปนี้{" "}
                            <span className="text-[var(--color-muted)]">
                              ช่วยระบุให้หน่อย แล้วครั้งหน้าจะจำได้
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => onEditImage(img)}
                          className="btn-primary w-full text-sm tap"
                        >
                          <IconTag size={16} />
                          ช่วยระบุวัตถุดิบ
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <p className="text-sm font-semibold text-[var(--color-ink)] tabular-nums">
                          {items.length} วัตถุดิบ
                        </p>
                        <button
                          onClick={() => onEditImage(img)}
                          className="btn-secondary min-h-10 px-3 text-sm"
                        >
                          <IconPencil size={14} />
                          แก้กรอบ
                        </button>
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
          className="scroll-mt-24 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
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
            <span className="shrink-0 text-sm text-[var(--color-muted)] tabular-nums">
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
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-control)] bg-white px-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                  aria-label={`ลบ ${item}`}
                >
                  <span>{item}</span>
                  <IconX size={14} className="text-[var(--color-danger)]" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-page)] px-3 py-3 text-sm text-[var(--color-muted)]">
              ลบวัตถุดิบออกหมดแล้ว เลือกชุดอื่นจากประวัติหรือสแกนใหม่ได้เลย
            </p>
          )}
        </div>
      )}

      {/* Cooking mode + CTA: generate recipes */}
      {allItemsCount > 0 && (
        <div ref={cookingModeRef} className="scroll-mt-24 space-y-3">
          <div className="card-glass p-4 md:p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--color-ink)]">
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
                    className={`min-h-12 px-2 rounded-[var(--radius-md)] border text-sm font-semibold tap transition-[border-color,background-color,transform] duration-150 active:scale-[0.97] ${
                      isActive
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]"
                        : "border-[var(--color-control)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)]"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              {COOKING_MODES.find((mode) => mode.id === cookingMode)?.hint}
            </p>
          </div>

          <button
            onClick={onInventRecipe}
            className="btn-accent w-full min-h-14 text-base md:text-lg tap"
          >
            <IconSparkles size={20} />
            ขอสูตรอาหาร · {allItemsCount} วัตถุดิบ
          </button>
        </div>
      )}

      {/* History quick-start */}
      {history.length > 0 && (
        <details
          ref={(el) => {
            if (el && !el.dataset.init) {
              el.dataset.init = "1";
              el.open = gallery.length === 0;
            }
          }}
          className="group rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-2"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 text-[15px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-line-soft)] [&::-webkit-details-marker]:hidden">
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
                className="btn-ghost w-full items-start justify-start gap-2 rounded-[var(--radius-md)] px-3 py-3 text-left text-sm text-[var(--color-ink)] tap"
              >
                <IconClock size={14} className="mt-1 shrink-0 opacity-60" />
                <span className="line-clamp-2 min-w-0 leading-relaxed">{h.items.join(", ")}</span>
                <span className="ml-auto mt-0.5 shrink-0 text-xs font-semibold text-[var(--color-ink)] underline underline-offset-4">
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
