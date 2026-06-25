import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";

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

  return (
    <div className="card p-3 md:p-4 flex gap-3 md:gap-4 items-center fade-in">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-[var(--radius-md)] bg-[var(--color-brand-pale)] flex items-center justify-center shrink-0 overflow-hidden">
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
        <h4 className="font-semibold text-[var(--color-ink)] truncate">{recipe.name}</h4>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          {recipe.readyInMinutes != null && `${recipe.readyInMinutes} นาที · `}
          {recipe.calories}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            toggleFavorite(recipe);
            onFavoriteChange();
          }}
          className="icon-btn w-9 h-9 md:w-10 md:h-10 text-lg tap"
          aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
        >
          {favorited ? "❤️" : "🤍"}
        </button>
        <button
          onClick={() => onStartCook(recipe)}
          className="btn-primary text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 tap"
        >
          ทำเมนู
        </button>
      </div>
    </div>
  );
}
