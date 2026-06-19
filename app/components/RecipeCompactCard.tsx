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
    <div className="bg-white rounded-xl border border-orange-100 p-3 flex gap-3 items-center shadow-sm">
      <div className="w-14 h-14 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 text-2xl overflow-hidden">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          "🍽️"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-800 truncate">{recipe.name}</h4>
        <p className="text-xs text-gray-400 mt-0.5">
          {recipe.readyInMinutes != null && `${recipe.readyInMinutes} นาที · `}
          {recipe.calories}
        </p>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => onStartCook(recipe)}
          className="cursor-pointer text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-medium"
        >
          ทำเมนูนี้
        </button>
        <button
          onClick={() => {
            toggleFavorite(recipe);
            onFavoriteChange();
          }}
          className="cursor-pointer text-center text-sm"
        >
          {favorited ? "❤️" : "🤍"}
        </button>
      </div>
    </div>
  );
}
