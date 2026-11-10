import { motion } from "motion/react";
import { useHeartPop } from "../hooks/useHeartPop";
import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";
import { IconChefHat, IconHeart } from "./Icons";

interface RecipeCompactCardProps {
  recipe: Recipe;
  onStartCook: (recipe: Recipe) => void;
  onFavoriteChange: () => void;
}

/**
 * การ์ดเมนูแบบแถว ใช้ทั้งหน้าเมนู (ใบที่ 2 เป็นต้นไป) และหน้ารายการโปรด
 * รูปซ้าย · ชื่อ+ข้อมูลกลาง · หัวใจมุมขวา — ปุ่มเริ่มทำเป็นเขียวอ่อน
 * ให้ปุ่มเขียวเข้มเหลือแค่ action หลักของจอ ไม่ใช่ปุ่มดำเรียงเต็มจอทุกใบ
 */
export function RecipeCompactCard({
  recipe,
  onStartCook,
  onFavoriteChange,
}: RecipeCompactCardProps) {
  const favorited = isFavorite(recipe.name);
  const heart = useHeartPop();

  const onToggle = () => {
    toggleFavorite(recipe);
    onFavoriteChange();
    heart.pop();
  };

  const meta = [
    recipe.readyInMinutes != null ? `${recipe.readyInMinutes} นาที` : null,
    recipe.calories,
    ...recipe.tags.slice(0, 1),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card card-lift flex h-full min-w-0 gap-3 p-3 md:gap-4 md:p-4">
      {/* 4:3 จตุรัสเกินไปสำหรับรูป 16:9 แต่ 16:9 เตี้ยจนชื่อเมนูสองบรรทัดล้นรูป — 4:3 กลางทาง */}
      <div className="grid aspect-[4/3] w-24 shrink-0 place-items-center self-start overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] md:w-28">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <IconChefHat size={28} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-1">
          <h3 className="line-clamp-2 min-w-0 flex-1 [overflow-wrap:anywhere] text-base font-semibold leading-snug text-[var(--color-ink)]">
            {recipe.name}
          </h3>
          <motion.button
            onClick={onToggle}
            animate={heart.controls}
            whileTap={{ scale: 0.85 }}
            className={`icon-btn -mr-2 -mt-2 h-11 w-11 shrink-0 ${
              favorited
                ? "text-[var(--color-favorite)]"
                : "text-[var(--color-muted)]"
            }`}
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            <IconHeart size={18} filled={favorited} />
          </motion.button>
        </div>
        {meta && (
          <p className="mb-3 mt-0.5 truncate text-sm text-[var(--color-muted)] tabular-nums">
            {meta}
          </p>
        )}
        <button
          onClick={() => onStartCook(recipe)}
          className="btn-soft mt-auto self-start"
          aria-label={`เริ่มทำ ${recipe.name}`}
        >
          เริ่มทำ
        </button>
      </div>
    </div>
  );
}
