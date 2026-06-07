import { Recipe } from "../actions/generateRecipe";
import { isFavorite, toggleFavorite } from "../utils/storage";

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteChange: () => void;
}

export function RecipeCard({ recipe, onFavoriteChange }: RecipeCardProps) {
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
    <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-md">
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-orange-100 flex items-center justify-center text-orange-400 text-sm">
          ไม่สามารถสร้างรูปได้
        </div>
      )}

      <div className="p-4 border-b border-orange-100 flex justify-between items-start gap-2">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-orange-600">{recipe.name}</h3>
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded bg-orange-50 text-orange-500 border border-orange-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] bg-orange-600 text-white px-2 py-1 rounded-full">
            {recipe.calories}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                toggleFavorite(recipe);
                onFavoriteChange();
              }}
              className="cursor-pointer text-lg"
            >
              {favorited ? "❤️" : "🤍"}
            </button>
            <button
              onClick={handleCopy}
              className="cursor-pointer text-xs bg-orange-500 text-white px-2 py-1 rounded"
            >
              คัดลอก
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-orange-500 mb-2">วัตถุดิบ</h4>
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="text-sm text-gray-600">
                • {ing}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-orange-500 mb-2">วิธีทำ</h4>
          <div className="space-y-2">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex gap-2 text-sm text-gray-600">
                <span className="font-bold text-orange-500">{idx + 1}.</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
