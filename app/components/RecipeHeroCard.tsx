import { AnimatePresence, motion } from "motion/react";
import { useHeartPop } from "../hooks/useHeartPop";
import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";
import { IconClock, IconFlame, IconHeart } from "./Icons";

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
      className="rounded-[var(--radius-xl)] overflow-hidden shadow-md md:shadow-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] text-white"
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
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-brand-dark)]/80 to-transparent" />
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
        ) : (
          <div
            key="placeholder"
            className="h-32 md:h-40 flex items-center justify-center text-5xl md:text-6xl opacity-70 bg-[var(--color-brand-dark)]/30"
          >
            <span className="float-y">🍳</span>
          </div>
        )}
      </AnimatePresence>

      <div className="p-5 md:p-6 lg:p-7 -mt-2 relative">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-white/70 mb-1">แนะนำ</p>
            <h3 className="text-xl font-bold leading-snug md:text-2xl">
              {recipe.name}
            </h3>
          </div>
          <motion.button
            onClick={onToggle}
            animate={heart.controls}
            whileTap={{ scale: 0.85 }}
            className="icon-btn w-10 h-10 bg-white/20 backdrop-blur-sm shrink-0 tap"
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            <IconHeart size={20} filled={favorited} />
          </motion.button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs mb-4">
          {recipe.readyInMinutes != null && (
            <span className="inline-flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
              <IconClock size={12} />
              {recipe.readyInMinutes} นาที
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
            <IconFlame size={12} />
            {recipe.calories}
          </span>
          {recipe.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="bg-white/20 px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {firstStep && (
          <p className="text-sm md:text-base text-white/80 mb-5 line-clamp-2 leading-relaxed">
            {firstStep}
          </p>
        )}

        <button
          onClick={() => onStartCook(recipe)}
          className="btn-inverse w-full py-3.5 md:py-4 tap"
        >
          เริ่มทำเลย
        </button>
      </div>
    </motion.div>
  );
}
