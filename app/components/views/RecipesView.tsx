import { useState } from "react";
import type { Recipe } from "../../types/recipe";
import { RecipeCard } from "../RecipeCard";
import { RecipeHeroCard } from "../RecipeHeroCard";
import { EmptyState } from "../EmptyState";

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
  recipes,
  filteredRecipes,
  allTags,
  tagFilter,
  onTagFilterChange,
  onFavoriteChange,
  onStartCook,
}: RecipesViewProps) {
  const [viewMode, setViewMode] = useState<"hero" | "list">("hero");

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="🍜"
        title="ยังไม่มีเมนู"
        description="กลับไปสแกนวัตถุดิบเพื่อให้ AI แนะนำสูตรอาหาร"
      />
    );
  }

  if (filteredRecipes.length === 0) {
    return (
      <div className="space-y-5">
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 no-scrollbar overflow-x-auto pb-1">
            <button
              onClick={() => onTagFilterChange(null)}
              className={`pill cursor-pointer shrink-0 tap ${!tagFilter ? "pill-active" : "pill-inactive"}`}
            >
              ทั้งหมด
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagFilterChange(tag)}
                className={`pill cursor-pointer shrink-0 tap ${tagFilter === tag ? "pill-active" : "pill-inactive"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <EmptyState
          icon="🔍"
          title="ไม่พบเมนู"
          description={`ไม่มีเมนูที่มีแท็ก "${tagFilter}" ลองเลือกแท็กอื่น`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 pb-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="section-title">เมนูที่แนะนำ</h2>
        <div className="flex gap-1 bg-white rounded-full p-1 border border-[var(--color-line)]">
          <button
            onClick={() => setViewMode("hero")}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-full text-sm flex items-center justify-center transition-colors tap ${
              viewMode === "hero"
                ? "bg-[var(--color-brand)] text-white"
                : "text-[var(--color-muted)]"
            }`}
            aria-label="ดูแบบ Hero"
          >
            ★
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-full text-sm flex items-center justify-center transition-colors tap ${
              viewMode === "list"
                ? "bg-[var(--color-brand)] text-white"
                : "text-[var(--color-muted)]"
            }`}
            aria-label="ดูแบบ List"
          >
            ≡
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 no-scrollbar overflow-x-auto pb-1">
          <button
            onClick={() => onTagFilterChange(null)}
            className={`pill cursor-pointer shrink-0 tap ${!tagFilter ? "pill-active" : "pill-inactive"}`}
          >
            ทั้งหมด
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagFilterChange(tag)}
              className={`pill cursor-pointer shrink-0 tap ${tagFilter === tag ? "pill-active" : "pill-inactive"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Hero card (only in hero mode) */}
      {viewMode === "hero" && filteredRecipes.length > 0 && (
        <RecipeHeroCard
          recipe={filteredRecipes[0]}
          onFavoriteChange={onFavoriteChange}
          onStartCook={onStartCook}
        />
      )}

      {/* Recipe grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-5">
        {viewMode === "hero"
          ? filteredRecipes
              .slice(1)
              .map((r, i) => (
                <RecipeCard
                  key={`${r.name}-${i}`}
                  recipe={r}
                  onFavoriteChange={onFavoriteChange}
                  onStartCook={onStartCook}
                />
              ))
          : filteredRecipes.map((r, i) => (
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
