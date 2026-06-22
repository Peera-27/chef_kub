import type { Recipe } from "../../types/recipe";
import { RecipeCard } from "../RecipeCard";

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
  if (filteredRecipes.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        ไม่พบเมนูในหมวดนี้
      </p>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex justify-between items-center">
        <h2 className="section-title">เมนูที่แนะนำ</h2>
        <span className="pill bg-orange-100 text-orange-600">
          {filteredRecipes.length} เมนู
        </span>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTagFilterChange(null)}
            className={`pill cursor-pointer ${!tagFilter ? "pill-active" : "pill-inactive"}`}
          >
            ทั้งหมด
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagFilterChange(tag)}
              className={`pill cursor-pointer ${tagFilter === tag ? "pill-active" : "pill-inactive"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-5">
        {filteredRecipes.map((r, i) => (
          <RecipeCard
            key={`${r.name}-${i}`}
            recipe={r}
            onFavoriteChange={onFavoriteChange}
            onStartCook={onStartCook}
          />
        ))}
      </div>
    </div>
  );
}
