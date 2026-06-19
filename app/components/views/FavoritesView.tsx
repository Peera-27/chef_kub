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
    <div className="space-y-4 pb-6">
      <div>
        <h2 className="text-lg font-bold text-orange-500">รายการโปรด</h2>
        <p className="text-xs text-gray-500 mt-0.5">กดทำเมนูนี้เพื่อเริ่มทันที</p>
      </div>
      {favorites.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีสูตรโปรด</p>
      ) : (
        favorites.map((r, i) => (
          <RecipeCompactCard
            key={`${r.name}-${i}-${favVersion}`}
            recipe={r}
            onFavoriteChange={onFavoriteChange}
            onStartCook={onStartCook}
          />
        ))
      )}
    </div>
  );
}
