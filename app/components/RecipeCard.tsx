import { useState } from "react";
import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";
import { IconClock, IconFlame, IconHeart } from "./Icons";

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteChange: () => void;
  onStartCook?: (recipe: Recipe) => void;
  /** true = กำลังทยอย gen รูปอยู่ — โชว์ skeleton แทน placeholder */
  imageLoading?: boolean;
}

export function RecipeCard({
  recipe,
  onFavoriteChange,
  onStartCook,
  imageLoading = false,
}: RecipeCardProps) {
  const favorited = isFavorite(recipe.name);
  const [pulse, setPulse] = useState(false);

  const onToggle = () => {
    toggleFavorite(recipe);
    onFavoriteChange();
    setPulse(true);
    window.setTimeout(() => setPulse(false), 450);
  };

  return (
    <div className="card overflow-hidden flex flex-col card-lift">
      <div className="relative aspect-video bg-[var(--color-brand-pale)]">
        {recipe.imageUrl ? (
          <>
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </>
        ) : imageLoading ? (
          <div className="skeleton w-full h-full rounded-none" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[var(--color-brand-soft)] to-[var(--color-brand-pale)]">
            <span className="text-5xl md:text-6xl select-none opacity-80">
              🍽️
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={onToggle}
            className={`icon-btn w-9 h-9 bg-white/90 backdrop-blur-sm shadow-sm tap ${
              pulse ? "heart-pop" : ""
            } ${favorited ? "text-[var(--color-favorite)]" : "text-[var(--color-muted)]"}`}
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            <IconHeart size={18} filled={favorited} />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-baseline gap-2">
          <h3 className="flex-1 text-base font-bold text-[var(--color-ink)] leading-snug md:text-lg line-clamp-2 md:line-clamp-none">
            {recipe.name}
          </h3>
          <span className="pill gap-1 bg-[var(--color-brand-soft)] text-[var(--color-brand)] shrink-0">
            <IconFlame size={13} />
            {recipe.calories}
          </span>
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
    </div>
  );
}
