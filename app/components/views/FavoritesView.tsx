import type { Recipe } from "../../types/recipe";
import { RecipeCompactCard } from "../RecipeCompactCard";

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
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="section-title">รายการโปรด</h2>
        <p className="section-subtitle">กดทำเมนูนี้เพื่อเริ่มทันที</p>
      </div>
      {favorites.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          ยังไม่มีสูตรโปรด
        </p>
      ) : (
        <div className="space-y-2">
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
