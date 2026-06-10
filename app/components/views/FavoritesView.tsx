import type { Recipe } from "../../types/recipe";
import { RecipeCard } from "../RecipeCard";

interface FavoritesViewProps {
  favorites: Recipe[];
  favVersion: number;
  onFavoriteChange: () => void;
}

export function FavoritesView({
  favorites,
  favVersion,
  onFavoriteChange,
}: FavoritesViewProps) {
  return (
    <div className="space-y-4 pb-6">
      <h2 className="text-lg font-bold text-orange-500">รายการโปรด</h2>
      {favorites.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีสูตรโปรด</p>
      ) : (
        favorites.map((r, i) => (
          <RecipeCard
            key={`${r.name}-${i}-${favVersion}`}
            recipe={r}
            onFavoriteChange={onFavoriteChange}
          />
        ))
      )}
    </div>
  );
}
