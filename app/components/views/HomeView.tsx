import type { Recipe } from "../../types/recipe";
import { COOKING_MODES, type CookingMode } from "../../utils/cookingModes";
import { ImageItem, ScanHistoryEntry } from "../../utils/types";
import { EmptyState } from "../EmptyState";
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
  onRemoveImage: (imageId: string) => void;
  onRemoveItem: (imageId: string, itemName: string) => void;
  onEditImage: (image: ImageItem) => void;
  onInventRecipe: () => void;
  onQuickStartHistory: (items: string[]) => void;
  onQuickCookFavorite: (recipe: Recipe) => void;
  onViewRecipes: () => void;
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
  onRemoveImage,
  onRemoveItem,
  onEditImage,
  onInventRecipe,
  onQuickStartHistory,
  onQuickCookFavorite,
  onViewRecipes,
}: HomeViewProps) {
  const topFavorite = favorites[0];

  return (
    <div className="space-y-6 fade-in">
      {/* Quick-cook favorite */}
      {topFavorite && (
        <div className="card-glass p-4 flex items-center justify-between gap-3 slide-up">
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

      {/* Action buttons: 2 cols */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <button
          onClick={onStartCamera}
          className="group relative flex flex-col items-center justify-center gap-3 py-8 md:py-10 rounded-[var(--radius-xl)] tap slide-up overflow-hidden bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] text-white shadow-[var(--shadow-glow)] active:scale-[0.97] transition-all duration-200"
        >
          <span className="tile bg-white/20 group-hover:scale-110 transition-transform duration-300">
            <IconCamera size={22} />
          </span>
          <span className="font-semibold md:text-lg">ถ่ายรูป</span>
        </button>
        <label className="group flex flex-col items-center justify-center gap-3 py-8 md:py-10 rounded-[var(--radius-xl)] cursor-pointer tap pop-in overflow-hidden bg-white border border-[var(--color-line)] shadow-[var(--shadow-sm)] hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-md)] active:scale-[0.97] transition-all duration-200">
          <span className="tile bg-[var(--color-brand-soft)] text-[var(--color-brand)] group-hover:scale-110 transition-transform duration-300">
            <IconImage size={22} />
          </span>
          <span className="font-semibold md:text-lg text-[var(--color-ink)]">
            อัปโหลด
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
            {gallery.map((img, idx) => {
              const items = img.items ?? [];
              // โมเดลไม่รู้จักอะไรในรูปนี้เลย — รูปแบบนี้แหละที่มีค่าที่สุดถ้าผู้ใช้ช่วย label
              const unidentified = items.length === 0;

              return (
                <div
                  key={img.id}
                  style={{ "--i": idx } as Record<string, string | number>}
                  className={`group relative rounded-2xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] card-lift ${
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
                      {items.map((it, i) => (
                        <button
                          key={i}
                          onClick={() => onRemoveItem(img.id, it.name)}
                          style={
                            { "--i": i } as Record<string, string | number>
                          }
                          className="chip-in inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/95 backdrop-blur-md shadow-sm text-[var(--color-ink)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] transition-all duration-200 active:scale-95 border border-black/[0.06]"
                        >
                          {it.name}
                          <span className="opacity-50 hover:opacity-100">
                            <IconX size={10} />
                          </span>
                        </button>
                      ))}
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cooking mode + CTA: generate recipes */}
      {allItemsCount > 0 && (
        <div className="space-y-3">
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
        <div className="card-glass p-4 md:p-5">
          <p className="text-xs font-medium text-[var(--color-muted)] mb-3">
            ทำเมนูจากวัตถุดิบเดิม
          </p>
          <div className="space-y-1">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.id}
                onClick={() => onQuickStartHistory(h.items)}
                className="btn-ghost w-full flex items-center gap-2 text-left text-sm px-3 py-3 rounded-[var(--radius-md)] hover:bg-[var(--color-brand-pale)] tap"
              >
                <IconClock size={14} className="shrink-0 opacity-60" />
                <span className="truncate">{h.items.join(", ")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View saved recipes */}
      {hasRecipes && (
        <button
          onClick={onViewRecipes}
          className="btn-secondary w-full py-3.5 md:py-4 tap"
        >
          ดูเมนูที่แนะนำแล้ว
        </button>
      )}

      {/* Empty state */}
      {gallery.length === 0 && allItemsCount === 0 && (
        <EmptyState
          icon="🥬"
          title="เริ่มสแกนวัตถุดิบ"
          description="ถ่ายรูปหรืออัปโหลดรูปวัตถุดิบ ระบบจะวิเคราะห์และแนะนำสูตรอาหารให้"
        />
      )}
    </div>
  );
}
