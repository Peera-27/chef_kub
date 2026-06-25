import type { Recipe } from "../../types/recipe";
import { ImageItem, ScanHistoryEntry } from "../../utils/types";
import { EmptyState } from "../EmptyState";

interface HomeViewProps {
  gallery: ImageItem[];
  history: ScanHistoryEntry[];
  favorites: Recipe[];
  allItemsCount: number;
  hasRecipes: boolean;
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
        <div className="card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-favorite)] font-medium mb-1">
              ❤️ ทำเมนูโปรดอีกครั้ง
            </p>
            <p className="font-semibold text-[var(--color-ink)] truncate">
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

      {/* Action buttons: 2 cols on mobile, 2 cols on tablet too but wider */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <button
          onClick={onStartCamera}
          className="btn-primary flex flex-col items-center justify-center gap-2 py-8 md:py-10 rounded-[var(--radius-lg)] tap"
        >
          <span className="text-3xl md:text-4xl leading-none opacity-90">📷</span>
          <span className="font-semibold md:text-lg">ถ่ายรูป</span>
        </button>
        <label className="btn-secondary flex flex-col items-center justify-center gap-2 py-8 md:py-10 rounded-[var(--radius-lg)] cursor-pointer tap">
          <span className="text-3xl md:text-4xl leading-none opacity-80">🖼️</span>
          <span className="font-semibold md:text-lg">อัปโหลด</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gallery.map((img) => (
              <div key={img.id} className="card overflow-hidden relative">
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/40 text-white rounded-full text-sm icon-btn backdrop-blur-sm tap"
                  aria-label="ลบรูป"
                >
                  ✕
                </button>

                <div className="flex">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-[var(--color-brand-pale)] flex items-center justify-center shrink-0">
                    <img
                      src={img.url}
                      alt="วัตถุดิบ"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="p-3 flex-1 min-w-0 pr-11">
                    <div className="flex flex-wrap gap-1.5">
                      {img.items.map((it, i) => (
                        <span key={i} className="pill bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center gap-1">
                          {it.name}
                          <button
                            onClick={() => onRemoveItem(img.id, it.name)}
                            className="text-[var(--color-brand)] hover:text-red-500 cursor-pointer leading-none ml-0.5 tap"
                            aria-label={`ลบ ${it.name}`}
                          >
                            <span className="text-sm">×</span>
                          </button>
                        </span>
                      ))}
                      {img.items.length === 0 && (
                        <span className="text-xs text-[var(--color-muted)]">
                          ไม่พบวัตถุดิบ
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onEditImage(img)}
                  className="absolute right-3 bottom-3 text-xs text-[var(--color-brand)] font-medium cursor-pointer hover:text-[var(--color-brand-dark)] bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg tap"
                >
                  แก้ไข
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA: generate recipes */}
      {allItemsCount > 0 && (
        <button
          onClick={onInventRecipe}
          className="btn-primary w-full py-4 md:py-5 text-base md:text-lg font-semibold tap"
        >
          ขอสูตรอาหาร ({allItemsCount} วัตถุดิบ) 🍳
        </button>
      )}

      {/* History quick-start */}
      {history.length > 0 && (
        <div className="card-flat p-4 md:p-5">
          <p className="text-xs font-medium text-[var(--color-muted)] mb-3">
            ทำเมนูจากวัตถุดิบเดิม
          </p>
          <div className="space-y-1">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.id}
                onClick={() => onQuickStartHistory(h.items)}
                className="btn-ghost w-full text-left text-sm px-3 py-3 rounded-[var(--radius-md)] hover:bg-[var(--color-brand-pale)] truncate tap"
              >
                {h.items.join(", ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View saved recipes */}
      {hasRecipes && (
        <button onClick={onViewRecipes} className="btn-secondary w-full py-3.5 md:py-4 tap">
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
