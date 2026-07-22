import { motion } from "motion/react";
import { useHeartPop } from "../hooks/useHeartPop";
import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";
import { IconClock, IconFlame, IconHeart } from "./Icons";

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteChange: () => void;
  onStartCook?: (recipe: Recipe) => void;
}

/**
 * การ์ดเมนูรอง — ไม่มีรูปโดยตั้งใจ มีแต่ชื่อกับข้อมูลของเมนู
 * รูปโชว์แค่การ์ดใบแรก (RecipeHeroCard) กับตอนเปิดเข้าไปทำจริง (CookView)
 */
export function RecipeCard({
  recipe,
  onFavoriteChange,
  onStartCook,
}: RecipeCardProps) {
  const favorited = isFavorite(recipe.name);
  const heart = useHeartPop();

  const onToggle = () => {
    toggleFavorite(recipe);
    onFavoriteChange();
    heart.pop();
  };

  return (
    // h-full + mt-auto ที่ปุ่ม = การ์ดในแถวเดียวกันสูงเท่ากัน ปุ่มเรียงตรงกันทุกใบ
    // ไม่ว่าชื่อเมนูจะยาวกี่บรรทัดหรือมี tag ไม่เท่ากัน
    <motion.div
      className="card overflow-hidden flex flex-col h-full"
      whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
    >
      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start gap-2">
          {/* ชื่อเมนูยาวแค่ไหนก็ต้องอ่านครบ — ตัดคำทิ้งแล้วเดาไม่ออกว่าเมนูอะไร */}
          <h3 className="flex-1 text-base font-bold text-[var(--color-ink)] leading-snug md:text-lg">
            {recipe.name}
          </h3>
          <span className="pill gap-1 bg-[var(--color-brand-soft)] text-[var(--color-brand)] shrink-0 mt-0.5">
            <IconFlame size={13} />
            {recipe.calories}
          </span>
          <motion.button
            onClick={onToggle}
            animate={heart.controls}
            whileTap={{ scale: 0.85 }}
            className={`icon-btn w-9 h-9 shrink-0 -mt-1 -mr-1 tap ${
              favorited
                ? "text-[var(--color-favorite)]"
                : "text-[var(--color-muted)]"
            }`}
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            <IconHeart size={18} filled={favorited} />
          </motion.button>
        </div>

        {(recipe.readyInMinutes != null || recipe.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.readyInMinutes != null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[var(--color-muted)]">
                <IconClock size={11} />
                {recipe.readyInMinutes} นาที
              </span>
            )}
            {recipe.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[var(--color-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {onStartCook && (
          <button
            onClick={() => onStartCook(recipe)}
            className="btn-primary w-full py-3 md:py-3.5 text-sm font-medium mt-auto tap bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-dark)]"
          >
            เริ่มทำอาหาร
          </button>
        )}
      </div>
    </motion.div>
  );
}
