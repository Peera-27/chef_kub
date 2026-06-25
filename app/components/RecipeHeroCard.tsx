import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";

interface RecipeHeroCardProps {
  recipe: Recipe;
  onStartCook: (recipe: Recipe) => void;
  onFavoriteChange: () => void;
}

export function RecipeHeroCard({
  recipe,
  onStartCook,
  onFavoriteChange,
}: RecipeHeroCardProps) {
  const favorited = isFavorite(recipe.name);
  const firstStep = recipe.instructions[0];

  return (
    <div className="rounded-[var(--radius-xl)] overflow-hidden shadow-md md:shadow-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] text-white fade-in">
      {recipe.imageUrl ? (
        <div className="relative h-48 md:h-56 lg:h-64">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-brand-dark)]/80 to-transparent" />
        </div>
      ) : (
        <div className="h-32 md:h-40 flex items-center justify-center text-5xl md:text-6xl opacity-70 bg-[var(--color-brand-dark)]/30">
          🍳
        </div>
      )}

      <div className="p-5 md:p-6 lg:p-7 -mt-2 relative">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-white/70 mb-1">แนะนำ</p>
            <h3 className="text-xl font-bold leading-snug line-clamp-2 md:text-2xl md:line-clamp-none md:whitespace-nowrap md:overflow-visible">
              {recipe.name}
            </h3>
          </div>
          <button
            onClick={() => {
              toggleFavorite(recipe);
              onFavoriteChange();
            }}
            className="icon-btn w-10 h-10 bg-white/20 backdrop-blur-sm shrink-0 text-xl tap"
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            {favorited ? "❤️" : "🤍"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs mb-4">
          {recipe.readyInMinutes != null && (
            <span className="bg-white/20 px-2.5 py-1 rounded-full">
              ⏱ {recipe.readyInMinutes} นาที
            </span>
          )}
          <span className="bg-white/20 px-2.5 py-1 rounded-full">
            🔥 {recipe.calories}
          </span>
        </div>

        {firstStep && (
          <p className="text-sm md:text-base text-white/80 mb-5 line-clamp-2 leading-relaxed">
            {firstStep}
          </p>
        )}

        <button
          onClick={() => onStartCook(recipe)}
          className="cursor-pointer w-full py-3.5 md:py-4 bg-white text-[var(--color-brand)] rounded-[var(--radius-md)] font-bold active:scale-[0.97] transition-transform tap"
        >
          เริ่มทำเลย
        </button>
      </div>
    </div>
  );
}
