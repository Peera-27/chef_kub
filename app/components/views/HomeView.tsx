import type { Recipe } from "../../types/recipe";
import { ImageItem, ScanHistoryEntry } from "../../utils/types";

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
    <div className="space-y-6">
      {topFavorite && (
        <div className="card-outline p-4">
          <p className="text-xs text-pink-500 font-medium mb-2">
            ทำเมนูโปรดอีกครั้ง
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-gray-800 truncate">
              {topFavorite.name}
            </span>
            <button
              onClick={() => onQuickCookFavorite(topFavorite)}
              className="btn-primary shrink-0 text-sm px-4 py-2"
            >
              เริ่มทำเลย
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onStartCamera}
          className="btn-primary flex flex-col items-center justify-center gap-2 py-8 rounded-2xl"
        >
          <span className="text-2xl leading-none opacity-90">📷</span>
          <span>ถ่ายรูป</span>
        </button>
        <label className="btn-primary flex flex-col items-center justify-center gap-2 py-8 rounded-2xl cursor-pointer">
          <span className="text-2xl leading-none opacity-90">🖼️</span>
          <span>อัปโหลด</span>
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

      {gallery.length > 0 && (
        <div className="space-y-3">
          {gallery.map((img) => (
            <div key={img.id} className="card overflow-hidden relative">
              <button
                onClick={() => onRemoveImage(img.id)}
                className="absolute top-3 right-3 z-10 w-7 h-7 bg-black/40 text-white rounded-full text-xs icon-btn backdrop-blur-sm"
                aria-label="ลบรูป"
              >
                ✕
              </button>

              <div className="flex">
                <div className="w-24 h-24 bg-orange-50 flex items-center justify-center shrink-0">
                  <img
                    src={img.url}
                    alt="วัตถุดิบ"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="p-3 flex-1 pr-10">
                  <div className="flex flex-wrap gap-1.5">
                    {img.items.map((it, i) => (
                      <span key={i} className="tag flex items-center gap-1">
                        {it.name}
                        <button
                          onClick={() => onRemoveItem(img.id, it.name)}
                          className="text-orange-400 hover:text-red-500 cursor-pointer leading-none"
                          aria-label={`ลบ ${it.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {img.items.length === 0 && (
                      <span className="text-xs text-gray-400">
                        ไม่พบวัตถุดิบ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onEditImage(img)}
                className="absolute right-3 bottom-3 text-xs text-blue-500 font-medium cursor-pointer hover:text-blue-600"
              >
                แก้ไข
              </button>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="card-outline p-4">
          <p className="text-xs font-medium text-gray-400 mb-3">
            ทำเมนูจากวัตถุดิบเดิม
          </p>
          <div className="space-y-1">
            {history.slice(0, 3).map((h) => (
              <button
                key={h.id}
                onClick={() => onQuickStartHistory(h.items)}
                className="btn-ghost w-full text-left text-sm px-2 py-2 rounded-lg truncate"
              >
                {h.items.join(", ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasRecipes && (
        <button onClick={onViewRecipes} className="btn-secondary w-full py-3.5">
          ดูเมนูที่แนะนำแล้ว
        </button>
      )}

      {allItemsCount > 0 && (
        <button
          onClick={onInventRecipe}
          className="btn-ghost w-full text-sm py-2"
        >
          สร้างเมนูใหม่จาก {allItemsCount} วัตถุดิบ
        </button>
      )}
    </div>
  );
}
