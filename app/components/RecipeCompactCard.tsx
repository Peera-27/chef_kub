import { motion } from "motion/react";
import { useHeartPop } from "../hooks/useHeartPop";
import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";
import { IconHeart } from "./Icons";

interface RecipeCompactCardProps {
  recipe: Recipe;
  onStartCook: (recipe: Recipe) => void;
  onFavoriteChange: () => void;
}

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

  return (
    <motion.div
      className="card grid h-full min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] grid-rows-[1fr_auto] items-center gap-x-3 gap-y-4 overflow-hidden p-3.5 md:grid-cols-[6.5rem_minmax(0,1fr)] md:p-4"
      whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
    >
      {/* 16:9 ให้ตรงกับรูปที่ flux คืนมา (1024×576) — กรอบจตุรัสจะครอบซ้ายขวาทิ้งข้างละ ~30% */}
      <div className="aspect-video w-[5.5rem] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-brand-pale)] flex items-center justify-center md:w-[6.5rem]">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xl md:text-2xl">🍽️</span>
        )}
      </div>

      <div className="min-w-0 self-stretch flex flex-col justify-center">
        <h4 className="line-clamp-2 min-h-[2.75rem] overflow-hidden break-words [overflow-wrap:anywhere] font-semibold leading-snug text-[var(--color-ink)]">
          {recipe.name}
        </h4>
        <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
          {recipe.readyInMinutes != null && `${recipe.readyInMinutes} นาที · `}
          {recipe.calories}
        </p>
      </div>

      <div className="col-span-2 mt-auto flex w-full min-w-0 items-center gap-2 border-t border-[var(--color-line-soft)] pt-3">
        <motion.button
          onClick={onToggle}
          animate={heart.controls}
          whileTap={{ scale: 0.85 }}
          className={`icon-btn w-9 h-9 md:w-10 md:h-10 tap ${
            favorited
              ? "text-[var(--color-favorite)]"
              : "text-[var(--color-muted)]"
          }`}
          aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
        >
          <IconHeart size={18} filled={favorited} />
        </motion.button>
        <button
          onClick={() => onStartCook(recipe)}
          className="btn-primary min-w-0 flex-1 whitespace-nowrap px-4 text-sm tap"
        >
          เริ่มทำเมนู
        </button>
      </div>
    </motion.div>
  );
}
