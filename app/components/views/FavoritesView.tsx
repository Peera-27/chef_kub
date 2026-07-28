import { AnimatePresence, motion } from "motion/react";
import type { Recipe } from "../../types/recipe";
import { RecipeCompactCard } from "../RecipeCompactCard";
import { EmptyState } from "../EmptyState";

interface FavoritesViewProps {
  favorites: Recipe[];
  onFavoriteChange: () => void;
  onStartCook: (recipe: Recipe) => void;
  onStartScan: () => void;
}

export function FavoritesView({
  favorites,
  onFavoriteChange,
  onStartCook,
  onStartScan,
}: FavoritesViewProps) {
  return (
    <div className="space-y-6 pb-6 fade-in">
      <div>
        <h2 className="section-title">รายการโปรด</h2>
        <p className="section-subtitle">กดทำเมนูนี้เพื่อเริ่มทันที</p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon="💝"
          title="ยังไม่มีสูตรโปรด"
          description="กดไอคอนหัวใจที่สูตรอาหารเพื่อเพิ่มในรายการโปรด"
          action={
            <button type="button" onClick={onStartScan} className="btn-primary">
              หาเมนูจากวัตถุดิบ
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4">
          {/* key ไม่ผูกกับ favVersion แล้ว — ถ้าผูก ทุกใบจะถูกมองว่าเป็นใบใหม่
              ทุกครั้งที่กดหัวใจ ใบที่เหลือเลยกระพริบทั้งกริดแทนที่จะไหลมาแทนที่ */}
          <AnimatePresence initial={false} mode="popLayout">
            {favorites.map((r, i) => (
              <motion.div
                key={r.name}
                layout
                className="h-full min-w-0"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 32,
                  delay: i * 0.04,
                }}
              >
                <RecipeCompactCard
                  recipe={r}
                  onFavoriteChange={onFavoriteChange}
                  onStartCook={onStartCook}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
