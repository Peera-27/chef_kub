import { useState } from "react";
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
  const [pulse, setPulse] = useState(false);

  const onToggle = () => {
    toggleFavorite(recipe);
    onFavoriteChange();
    setPulse(true);
    window.setTimeout(() => setPulse(false), 450);
  };

  return (
    <div className="card p-3 md:p-4 flex gap-3 md:gap-4 items-center slide-up card-lift">
      {/* 16:9 ให้ตรงกับรูปที่ flux คืนมา (1024×576) — กรอบจตุรัสจะครอบซ้ายขวาทิ้งข้างละ ~30% */}
      <div className="w-24 md:w-28 aspect-video rounded-[var(--radius-md)] bg-[var(--color-brand-pale)] flex items-center justify-center shrink-0 overflow-hidden">
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

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[var(--color-ink)] leading-snug break-words">
          {recipe.name}
        </h4>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          {recipe.readyInMinutes != null && `${recipe.readyInMinutes} นาที · `}
          {recipe.calories}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggle}
          className={`icon-btn w-9 h-9 md:w-10 md:h-10 tap ${
            pulse ? "heart-pop" : ""
          } ${favorited ? "text-[var(--color-favorite)]" : "text-[var(--color-muted)]"}`}
          aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
        >
          <IconHeart size={18} filled={favorited} />
        </button>
        <button
          onClick={() => onStartCook(recipe)}
          className="btn-primary text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 tap bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-dark)]"
        >
          ทำเมนู
        </button>
      </div>
    </div>
  );
}
