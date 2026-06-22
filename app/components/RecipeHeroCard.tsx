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
    <div className="rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      {recipe.imageUrl ? (
        <div className="relative h-44">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-orange-600/80 to-transparent" />
        </div>
      ) : (
        <div className="h-28 flex items-center justify-center text-4xl opacity-70 bg-orange-600/30">
          🍳
        </div>
      )}

      <div className="p-5 -mt-2 relative">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-orange-100/90 mb-1">แนะนำ</p>
            <h3 className="text-xl font-bold leading-snug">{recipe.name}</h3>
          </div>
          <button
            onClick={() => {
              toggleFavorite(recipe);
              onFavoriteChange();
            }}
            className="cursor-pointer text-xl shrink-0 opacity-90 hover:opacity-100 transition-opacity"
            aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
          >
            {favorited ? "❤️" : "🤍"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs mb-4">
          {recipe.readyInMinutes != null && (
            <span className="bg-white/20 px-2.5 py-1 rounded-full">
              {recipe.readyInMinutes} นาที
            </span>
          )}
          <span className="bg-white/20 px-2.5 py-1 rounded-full">
            {recipe.calories}
          </span>
          {recipe.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="bg-white/20 px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {firstStep && (
          <p className="text-sm text-orange-50/90 mb-5 line-clamp-2 leading-relaxed">
            {firstStep}
          </p>
        )}

        <button
          onClick={() => onStartCook(recipe)}
          className="cursor-pointer w-full py-3.5 bg-white text-orange-600 rounded-xl font-bold active:scale-[0.98] transition-transform"
        >
          เริ่มทำเลย
        </button>
      </div>
    </div>
  );
}
