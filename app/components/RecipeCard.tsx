import type { Recipe } from "../types/recipe";
import { isFavorite, toggleFavorite } from "../utils/storage";

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteChange: () => void;
  onStartCook?: (recipe: Recipe) => void;
}

export function RecipeCard({
  recipe,
  onFavoriteChange,
  onStartCook,
}: RecipeCardProps) {
  const favorited = isFavorite(recipe.name);

  const handleCopy = () => {
    const text = [
      recipe.name,
      `${recipe.calories}`,
      "",
      "วัตถุดิบ:",
      ...recipe.ingredients.map((i) => `• ${i}`),
      "",
      "วิธีทำ:",
      ...recipe.instructions.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    alert("คัดลอกสูตรแล้ว!");
  };

  return (
    <div className="card overflow-hidden fade-in flex flex-col">
      {recipe.imageUrl && (
        <div className="relative h-40 md:h-48 lg:h-52 bg-[var(--color-brand-pale)]">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => {
                toggleFavorite(recipe);
                onFavoriteChange();
              }}
              className="icon-btn w-9 h-9 bg-white/90 backdrop-blur-sm shadow-sm text-lg tap"
              aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
            >
              {favorited ? "❤️" : "🤍"}
            </button>
          </div>
        </div>
      )}

      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-baseline gap-2">
          <h3 className="flex-1 text-base font-bold text-[var(--color-ink)] leading-snug md:text-lg line-clamp-2 md:line-clamp-none">
            {recipe.name}
          </h3>
          <span className="pill bg-gray-100 text-gray-600 shrink-0">
            🔥 {recipe.calories}
          </span>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((tag, idx) => (
              <span
                key={idx}
                className="pill bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1">
          <h4 className="text-xs font-bold text-[var(--color-brand)] uppercase tracking-wide mb-2">
            วัตถุดิบ
          </h4>
          <ul className="space-y-1">
            {recipe.ingredients.slice(0, 4).map((ing, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-600 flex gap-2 leading-relaxed"
              >
                <span className="text-[var(--color-brand)] shrink-0">•</span>
                <span>{ing}</span>
              </li>
            ))}
            {recipe.ingredients.length > 4 && (
              <li className="text-xs text-[var(--color-muted)] pl-4">
                +{recipe.ingredients.length - 4} รายการ
              </li>
            )}
          </ul>
        </div>

        {onStartCook && (
          <button
            onClick={() => onStartCook(recipe)}
            className="btn-primary w-full py-3 md:py-3.5 text-sm font-medium mt-2 tap"
          >
            เริ่มทำอาหาร
          </button>
        )}
      </div>
    </div>
  );
}
