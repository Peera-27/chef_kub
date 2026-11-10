import type { Recipe } from "../../types/recipe";
import { RecipeCompactCard } from "../RecipeCompactCard";
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
        <h1 className="section-title text-2xl md:text-[28px]">เมนูที่แนะนำ</h1>
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

      {/* เมนูที่เหลือ: แถวเดียวบนมือถือ สองคอลัมน์บนจอกว้าง */}
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4 stagger">
        {recipes.slice(1).map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="h-full"
            style={{ "--i": i } as Record<string, string | number>}
          >
            <RecipeCompactCard
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
