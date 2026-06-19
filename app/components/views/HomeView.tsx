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
    <div className="space-y-4">
    

      {topFavorite && (
        <div className="bg-white rounded-xl border border-pink-100 p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wide text-pink-500 mb-1">
            ทำเมนูโปรดอีกครั้ง
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-800 truncate">
              {topFavorite.name}
            </span>
            <button
              onClick={() => onQuickCookFavorite(topFavorite)}
              className="cursor-pointer shrink-0 text-xs bg-orange-500 text-white px-3 py-2 rounded-lg font-medium"
            >
              เริ่มทำเลย →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onStartCamera}
          className="cursor-pointer bg-orange-500 text-white p-6 rounded-2xl font-medium active:scale-95 transition-transform"
        >
          ถ่ายรูป
        </button>
        <label className="bg-orange-500 text-white p-6 rounded-2xl text-center cursor-pointer font-medium active:scale-95 transition-transform">
          อัปโหลด
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

      <div className="space-y-3">
        {gallery.map((img) => (
          <div
            key={img.id}
            className="bg-white rounded-xl flex border border-orange-100 shadow-sm relative overflow-hidden"
          >
            <button
              onClick={() => onRemoveImage(img.id)}
              className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 text-white rounded-full text-xs cursor-pointer"
            >
              ✕
            </button>

            <div className="w-28 h-28 bg-gray-100 flex items-center justify-center shrink-0">
              <img
                src={img.url}
                alt="วัตถุดิบ"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="p-2 flex-1 pr-8 pb-8">
              <div className="flex flex-wrap gap-1">
                {img.items.map((it, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"
                  >
                    {it.name}
                    <button
                      onClick={() => onRemoveItem(img.id, it.name)}
                      className="text-orange-400 hover:text-red-500 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {img.items.length === 0 && (
                  <span className="text-xs text-gray-400">ไม่พบวัตถุดิบ</span>
                )}
              </div>
            </div>

            <button
              onClick={() => onEditImage(img)}
              className="absolute right-2 bottom-2 bg-blue-500 text-white text-[10px] px-2 py-1 rounded cursor-pointer"
            >
              แก้ไข
            </button>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-orange-100">
          <p className="text-xs font-medium text-gray-500 mb-2">
            ทำเมนูจากวัตถุดิบเดิม
          </p>
          <div className="space-y-1">
            {history.slice(0, 3).map((h) => (
              <button
                key={h.id}
                onClick={() => onQuickStartHistory(h.items)}
                className="cursor-pointer w-full text-left text-xs text-gray-600 hover:text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded-lg transition-colors truncate"
              >
                → {h.items.join(", ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasRecipes && (
        <button
          onClick={onViewRecipes}
          className="cursor-pointer w-full py-3 bg-white border border-orange-300 text-orange-600 rounded-xl font-medium"
        >
          ดูเมนูที่แนะนำแล้ว →
        </button>
      )}

      {allItemsCount > 0 && (
        <button
          onClick={onInventRecipe}
          className="cursor-pointer w-full py-3 text-sm text-gray-500 underline"
        >
          สร้างเมนูใหม่จาก {allItemsCount} วัตถุดิบ
        </button>
      )}
    </div>
  );
}
