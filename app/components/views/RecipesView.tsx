import { useState } from "react";
import type { Recipe } from "../../types/recipe";
import { RecipeCard } from "../RecipeCard";
import { RecipeHeroCard } from "../RecipeHeroCard";
import { EmptyState } from "../EmptyState";
import { IconList, IconStar } from "../Icons";

interface RecipesViewProps {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  allTags: string[];
  tagFilter: string | null;
  imageGenPending?: boolean;
  onTagFilterChange: (tag: string | null) => void;
  onFavoriteChange: () => void;
  onStartCook: (recipe: Recipe) => void;
}

export function RecipesView({
  recipes,
  filteredRecipes,
  allTags,
  tagFilter,
  imageGenPending = false,
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
      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="section-title">เมนูที่แนะนำ</h2>
          <p className="section-subtitle">
            {filteredRecipes.length} เมนูจากวัตถุดิบของคุณ
          </p>
        </div>
        <div className="seg">
          <button
            onClick={() => setViewMode("hero")}
            className={`seg-btn ${viewMode === "hero" ? "seg-btn-active" : "seg-btn-idle"}`}
            aria-label="ดูแบบ Hero"
          >
            <IconStar size={16} filled={viewMode === "hero"} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`seg-btn ${viewMode === "list" ? "seg-btn-active" : "seg-btn-idle"}`}
            aria-label="ดูแบบ List"
          >
            <IconList size={16} />
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
          imageLoading={imageGenPending}
          onFavoriteChange={onFavoriteChange}
          onStartCook={onStartCook}
        />
      )}

      {/* Recipe grid: 1 col mobile, 2 cols tablet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-5 stagger">
        {(viewMode === "hero" ? filteredRecipes.slice(1) : filteredRecipes).map(
          (r, i) => (
            <div
              key={`${r.name}-${i}`}
              style={{ "--i": i } as Record<string, string | number>}
            >
              <RecipeCard
                recipe={r}
                imageLoading={imageGenPending}
                onFavoriteChange={onFavoriteChange}
                onStartCook={onStartCook}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
