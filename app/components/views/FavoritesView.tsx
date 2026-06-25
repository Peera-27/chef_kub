import type { Recipe } from "../../types/recipe";
import { RecipeCompactCard } from "../RecipeCompactCard";
import { EmptyState } from "../EmptyState";

interface FavoritesViewProps {
  favorites: Recipe[];
  favVersion: number;
  onFavoriteChange: () => void;
  onStartCook: (recipe: Recipe) => void;
}

export function FavoritesView({
  favorites,
  favVersion,
  onFavoriteChange,
  onStartCook,
}: FavoritesViewProps) {
  return (
    <div className="space-y-6 pb-6 fade-in">
      <div>
        <h2 className="section-title">รายการโปรด</h2>
        <p className="section-subtitle">กดทำเมนูนี้เพื่อเริ่มทันที</p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon="💝"
          title="ยังไม่มีสูตรโปรด"
          description="กดไอคอนหัวใจที่สูตรอาหารเพื่อเพิ่มในรายการโปรด"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {favorites.map((r, i) => (
            <RecipeCompactCard
              key={`${r.name}-${i}-${favVersion}`}
              recipe={r}
              onFavoriteChange={onFavoriteChange}
              onStartCook={onStartCook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
