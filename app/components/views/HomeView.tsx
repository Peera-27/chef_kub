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
          <span className="text-3xl md:text-4xl leading-none opacity-90">
            📷
          </span>
          <span className="font-semibold md:text-lg">ถ่ายรูป</span>
        </button>
        <label className="btn-secondary flex flex-col items-center justify-center gap-2 py-8 md:py-10 rounded-[var(--radius-lg)] cursor-pointer tap">
          <span className="text-3xl md:text-4xl leading-none opacity-80">
            🖼️
          </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gallery.map((img) => {
              const items = img.items ?? [];
              const imgW = img.imageWidth;
              const imgH = img.imageHeight;
              const hasBoxes = imgW && imgH && (img.boxes ?? []).length > 0;

              return (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-black/[0.04] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => onRemoveImage(img.id)}
                    className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white text-sm backdrop-blur-md transition-all duration-200 hover:bg-red-500 hover:scale-110 active:scale-95 shadow-lg"
                    aria-label="ลบรูป"
                  >
                    ✕
                  </button>

                  {/* Image container */}
                  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                    {/* ✅ สร้าง Wrapper ครอบทั้งรูปและกรอบ YOLO ไว้ด้วยกัน เพื่อให้เอฟเฟกต์ซูมทำงานพร้อมกัน */}
                    <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105">
                      <img
                        src={img.url}
                        alt="วัตถุดิบ"
                        className="w-full h-full object-contain"
                      />

                      {/* Bounding boxes overlay */}
                      {hasBoxes && (
                        <div className="absolute inset-0 z-10 pointer-events-none">
                          <svg
                            viewBox={`0 0 ${imgW} ${imgH}`}
                            className="w-full h-full"
                            preserveAspectRatio="xMidYMid meet" // ✅ จุดที่สำคัญที่สุด: สั่งให้กล่อง SVG ย่อขยายสเกลเดียวกับรูปเป๊ะๆ
                          >
                            {img.boxes!.map((box, i) => {
                              const labelW = box.label
                                ? box.label.length * Math.max(7, imgW / 55) + 10
                                : 0;
                              const labelH = Math.max(18, imgH / 22);
                              return (
                                <g key={i}>
                                  {/* Box fill (subtle) */}
                                  <rect
                                    x={box.x}
                                    y={box.y}
                                    width={box.w}
                                    height={box.h}
                                    fill="rgba(16, 185, 129, 0.08)"
                                  />
                                  {/* Box border with corner accents */}
                                  <rect
                                    x={box.x}
                                    y={box.y}
                                    width={box.w}
                                    height={box.h}
                                    fill="none"
                                    stroke="rgba(16, 185, 129, 0.95)"
                                    strokeWidth={Math.max(2, imgW / 180)}
                                    rx="2"
                                  />
                                  {/* Corner accents for modern look */}
                                  {(() => {
                                    const corner = Math.max(8, box.w / 6);
                                    const sw = Math.max(2, imgW / 200);
                                    return (
                                      <>
                                        {/* Top-left */}
                                        <line
                                          x1={box.x}
                                          y1={box.y}
                                          x2={box.x + corner}
                                          y2={box.y}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        <line
                                          x1={box.x}
                                          y1={box.y}
                                          x2={box.x}
                                          y2={box.y + corner}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        {/* Top-right */}
                                        <line
                                          x1={box.x + box.w}
                                          y1={box.y}
                                          x2={box.x + box.w - corner}
                                          y2={box.y}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        <line
                                          x1={box.x + box.w}
                                          y1={box.y}
                                          x2={box.x + box.w}
                                          y2={box.y + corner}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        {/* Bottom-left */}
                                        <line
                                          x1={box.x}
                                          y1={box.y + box.h}
                                          x2={box.x + corner}
                                          y2={box.y + box.h}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        <line
                                          x1={box.x}
                                          y1={box.y + box.h}
                                          x2={box.x}
                                          y2={box.y + box.h - corner}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        {/* Bottom-right */}
                                        <line
                                          x1={box.x + box.w}
                                          y1={box.y + box.h}
                                          x2={box.x + box.w - corner}
                                          y2={box.y + box.h}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                        <line
                                          x1={box.x + box.w}
                                          y1={box.y + box.h}
                                          x2={box.x + box.w}
                                          y2={box.y + box.h - corner}
                                          stroke="#10b981"
                                          strokeWidth={sw + 1}
                                          strokeLinecap="round"
                                        />
                                      </>
                                    );
                                  })()}
                                  {/* Label badge */}
                                  {box.label && (
                                    <g>
                                      <rect
                                        x={box.x}
                                        y={box.y - labelH - 2}
                                        width={labelW}
                                        height={labelH}
                                        rx="4"
                                        fill="#10b981"
                                      />
                                      <text
                                        x={box.x + 5}
                                        y={box.y - 5}
                                        fill="white"
                                        fontSize={Math.max(11, imgH / 32)}
                                        fontWeight="600"
                                        fontFamily="system-ui, sans-serif"
                                      >
                                        {box.label}
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Subtle gradient overlay at bottom for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    {/* Item count badge - top left */}
                    <div className="absolute top-3 left-3 z-20">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-md shadow-sm text-[var(--color-ink)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {items.length} รายการ
                      </span>
                    </div>

                    {/* Item chips - bottom overlay */}
                    <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-1.5">
                      {items.map((it, i) => (
                        <button
                          key={i}
                          onClick={() => onRemoveItem(img.id, it.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/95 backdrop-blur-md shadow-sm text-[var(--color-ink)] hover:bg-red-50 hover:text-red-600 transition-all duration-200 active:scale-95 border border-black/[0.06]"
                        >
                          {it.name}
                          <span className="text-[10px] opacity-50 hover:opacity-100">
                            ✕
                          </span>
                        </button>
                      ))}
                      {items.length === 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white/80 backdrop-blur-md text-[var(--color-muted)]">
                          ไม่พบวัตถุดิบ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-black/[0.04]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-sm">
                        🍳
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)] leading-tight">
                          {items.length} วัตถุดิบ
                        </p>
                        {imgW && imgH && (
                          <p className="text-[10px] text-[var(--color-muted)] leading-tight">
                            {imgW} × {imgH} px
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onEditImage(img)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-dark)] text-white shadow-[0_2px_8px_rgba(232,99,10,0.25)] hover:shadow-[0_4px_16px_rgba(232,99,10,0.35)] transition-all duration-200 active:scale-95"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      แก้ไข
                    </button>
                  </div>
                </div>
              );
            })}
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
