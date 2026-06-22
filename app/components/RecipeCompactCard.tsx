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
    <div className="card p-3 flex gap-3 items-center">
      <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xl">🍽️</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-800 truncate">{recipe.name}</h4>
        <p className="text-xs text-gray-400 mt-0.5">
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
          className="cursor-pointer text-lg opacity-80 hover:opacity-100 transition-opacity"
          aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
        >
          {favorited ? "❤️" : "🤍"}
        </button>
        <button
          onClick={() => onStartCook(recipe)}
          className="btn-primary text-xs px-3 py-2"
        >
          ทำเมนูนี้
        </button>
      </div>
    </div>
  );
}
