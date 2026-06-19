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
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl overflow-hidden shadow-lg text-white">
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-40 object-cover opacity-90"
        />
      ) : (
        <div className="w-full h-24 flex items-center justify-center text-4xl opacity-80">
          🍳
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-orange-100 mb-1">
              แนะนำให้เริ่มทำเมนูนี้
            </p>
            <h3 className="text-xl font-bold leading-tight">{recipe.name}</h3>
          </div>
          <button
            onClick={() => {
              toggleFavorite(recipe);
              onFavoriteChange();
            }}
            className="cursor-pointer text-xl shrink-0"
          >
            {favorited ? "❤️" : "🤍"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs mb-3">
          {recipe.readyInMinutes != null && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full">
              ⏱ {recipe.readyInMinutes} นาที
            </span>
          )}
          <span className="bg-white/20 px-2 py-0.5 rounded-full">
            🔥 {recipe.calories}
          </span>
          {recipe.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="bg-white/20 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {firstStep && (
          <p className="text-sm text-orange-50 mb-4 line-clamp-2">
            เริ่มเลย: {firstStep}
          </p>
        )}

        <button
          onClick={() => onStartCook(recipe)}
          className="cursor-pointer w-full py-4 bg-white text-orange-600 rounded-xl font-bold text-base active:scale-95 transition-transform shadow-md"
        >
          เริ่มทำเลย →
        </button>
      </div>
    </div>
  );
}
