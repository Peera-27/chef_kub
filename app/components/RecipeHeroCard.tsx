import { AnimatePresence, motion } from "motion/react";
import { useHeartPop } from "../hooks/useHeartPop";
import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";
import { IconHeart } from "./Icons";

interface RecipeHeroCardProps {
  recipe: Recipe;
  onStartCook: (recipe: Recipe) => void;
  onFavoriteChange: () => void;
  /** true = กำลังทยอย gen รูปอยู่ — โชว์ skeleton แทน placeholder */
  imageLoading?: boolean;
}

export function RecipeHeroCard({
  recipe,
  onStartCook,
  onFavoriteChange,
  imageLoading = false,
}: RecipeHeroCardProps) {
  const favorited = isFavorite(recipe.name);
  const firstStep = recipe.instructions[0];
  const heart = useHeartPop();

  const onToggle = () => {
    toggleFavorite(recipe);
    onFavoriteChange();
    heart.pop();
  };

  return (
    <motion.div
      className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-ink)] text-white"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* รูปถูก gen ทีหลัง — พอมาถึงให้ค่อยๆ จางแทนที่ skeleton
          ไม่ใช่กระโดดสลับ ซึ่งกวนตามากตอนกำลังอ่านชื่อเมนูอยู่ */}
      <AnimatePresence mode="wait" initial={false}>
        {recipe.imageUrl ? (
          <motion.div
            key="image"
            className="relative aspect-video"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ) : imageLoading ? (
          <motion.div
            key="skeleton"
            className="aspect-video relative overflow-hidden bg-white/10"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 shimmer-linear" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="p-5 md:p-6 lg:p-7">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-snug md:text-2xl">
              {recipe.name}
            </h3>
          </div>
          <motion.button
            onClick={onToggle}
            animate={heart.controls}
            whileTap={{ scale: 0.85 }}
            className="icon-btn w-11 h-11 text-white hover:bg-white/10 shrink-0 tap"
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            <IconHeart size={20} filled={favorited} />
          </motion.button>
        </div>

        <p className="text-sm text-white/80 mb-4 tabular-nums">
          {[
            recipe.readyInMinutes != null ? `${recipe.readyInMinutes} นาที` : null,
            recipe.calories,
            ...recipe.tags.slice(0, 2),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {firstStep && (
          <p className="text-[15px] md:text-base text-white/90 mb-5 line-clamp-2 leading-relaxed">
            {firstStep}
          </p>
        )}

        <button
          onClick={() => onStartCook(recipe)}
          className="btn-accent w-full min-h-13 tap"
        >
          เริ่มทำเลย
        </button>
      </div>
    </motion.div>
  );
}
