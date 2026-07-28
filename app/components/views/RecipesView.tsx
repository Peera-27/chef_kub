import type { Recipe } from "../../types/recipe";
import { RecipeCard } from "../RecipeCard";
import { RecipeHeroCard } from "../RecipeHeroCard";
import { EmptyState } from "../EmptyState";

interface RecipesViewProps {
  recipes: Recipe[];
  /** gen สดแค่การ์ดใบแรก — ใบอื่นได้รูปจากแคช ไม่งั้นรอตอนกดเข้าไปทำ */
  imageGenPending?: boolean;
  onFavoriteChange: () => void;
  onStartCook: (recipe: Recipe) => void;
  onStartScan: () => void;
}

export function RecipesView({
  recipes,
  imageGenPending = false,
  onFavoriteChange,
  onStartCook,
  onStartScan,
}: RecipesViewProps) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="🍜"
        title="ยังไม่มีเมนู"
        description="กลับไปสแกนวัตถุดิบเพื่อให้ AI แนะนำสูตรอาหาร"
        action={
          <button type="button" onClick={onStartScan} className="btn-primary">
            สแกนวัตถุดิบ
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 pb-6 fade-in">
      <div>
        <h2 className="section-title">เมนูที่แนะนำ</h2>
        <p className="section-subtitle">
          {recipes.length} เมนูจากวัตถุดิบของคุณ
        </p>
      </div>

      <RecipeHeroCard
        recipe={recipes[0]}
        imageLoading={imageGenPending}
        onFavoriteChange={onFavoriteChange}
        onStartCook={onStartCook}
      />

      {/* Recipe grid: 1 col mobile, 2 cols tablet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-5 stagger">
        {recipes.slice(1).map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="h-full"
            style={{ "--i": i } as Record<string, string | number>}
          >
            <RecipeCard
              recipe={r}
              onFavoriteChange={onFavoriteChange}
              onStartCook={onStartCook}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
