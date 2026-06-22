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
      `${recipe.name}`,
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
    <div className="rounded-2xl bg-orange-50 border border-orange-100 overflow-hidden">
      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-40 object-cover"
        />
      )}

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-lg font-bold text-orange-600 leading-snug flex-1">
            {recipe.name}
          </h3>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-[10px] bg-gray-900 text-white px-2.5 py-1 rounded-full whitespace-nowrap">
              🔥 {recipe.calories}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  toggleFavorite(recipe);
                  onFavoriteChange();
                }}
                className="cursor-pointer text-lg leading-none"
                aria-label={favorited ? "เอาออกจากโปรด" : "เพิ่มในโปรด"}
              >
                {favorited ? "❤️" : "🤍"}
              </button>
              <button
                onClick={handleCopy}
                className="cursor-pointer text-[10px] bg-orange-500 text-white px-2 py-1 rounded-lg"
              >
                คัดลอก
              </button>
            </div>
          </div>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white text-orange-600 border border-orange-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div>
          <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-2">
            • วัตถุดิบ
          </h4>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, idx) => (
              <li
                key={idx}
                className="text-sm text-orange-700/80 flex gap-2 leading-relaxed"
              >
                <span className="text-orange-400 shrink-0">•</span>
                <span>{ing}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-3">
            • วิธีทำ
          </h4>
          <div className="space-y-3">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex gap-3 text-sm text-orange-700/80">
                <span className="w-6 h-6 shrink-0 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {onStartCook && (
          <button
            onClick={() => onStartCook(recipe)}
            className="btn-primary w-full py-3.5 text-sm font-medium"
          >
            เริ่มทำอาหาร (Voice AI)
          </button>
        )}
      </div>
    </div>
  );
}
