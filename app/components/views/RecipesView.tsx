import type { Recipe } from "../../types/recipe";
import { RecipeCompactCard } from "../RecipeCompactCard";
import { RecipeHeroCard } from "../RecipeHeroCard";

interface RecipesViewProps {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  allTags: string[];
  tagFilter: string | null;
  onTagFilterChange: (tag: string | null) => void;
  onFavoriteChange: () => void;
  onStartCook: (recipe: Recipe) => void;
}

export function RecipesView({
  filteredRecipes,
  allTags,
  tagFilter,
  onTagFilterChange,
  onFavoriteChange,
  onStartCook,
}: RecipesViewProps) {
  const hero = filteredRecipes[0];
  const alternatives = filteredRecipes.slice(1);

  if (filteredRecipes.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        ไม่พบเมนูในหมวดนี้
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h2 className="text-lg font-bold text-orange-500">พร้อมทำแล้ว</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          เลือกเมนูแนะนำหรือสลับทางเลือกด้านล่าง
        </p>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTagFilterChange(null)}
            className={`cursor-pointer text-xs px-3 py-1 rounded-full ${
              !tagFilter
                ? "bg-orange-500 text-white"
                : "bg-white text-orange-600 border border-orange-200"
            }`}
          >
            ทั้งหมด
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagFilterChange(tag)}
              className={`cursor-pointer text-xs px-3 py-1 rounded-full ${
                tagFilter === tag
                  ? "bg-orange-500 text-white"
                  : "bg-white text-orange-600 border border-orange-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {hero && (
        <RecipeHeroCard
          recipe={hero}
          onStartCook={onStartCook}
          onFavoriteChange={onFavoriteChange}
        />
      )}

      {alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">ทางเลือกอื่น</p>
          {alternatives.map((r, i) => (
            <RecipeCompactCard
              key={`${r.name}-${i}`}
              recipe={r}
              onStartCook={onStartCook}
              onFavoriteChange={onFavoriteChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
