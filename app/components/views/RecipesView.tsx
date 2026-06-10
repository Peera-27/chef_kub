import { Recipe } from "../../types/recipe";
import { RecipeCard } from "../RecipeCard";

interface RecipesViewProps {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  allTags: string[];
  tagFilter: string | null;
  onTagFilterChange: (tag: string | null) => void;
  onFavoriteChange: () => void;
}

export function RecipesView({
  filteredRecipes,
  allTags,
  tagFilter,
  onTagFilterChange,
  onFavoriteChange,
}: RecipesViewProps) {
  return (
    <div className="space-y-4 pb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-orange-500">สูตรที่แนะนำ</h2>
        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
          {filteredRecipes.length} เมนู
        </span>
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

      {filteredRecipes.map((r, i) => (
        <RecipeCard
          key={i}
          recipe={r}
          onFavoriteChange={onFavoriteChange}
        />
      ))}
    </div>
  );
}
