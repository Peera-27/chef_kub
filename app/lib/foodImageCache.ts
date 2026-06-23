const globalForCache = global as unknown as {
  foodImageCache: Map<string, string>;
};
const foodImageCache =
  globalForCache.foodImageCache || new Map<string, string>();
if (process.env.NODE_ENV !== "production")
  globalForCache.foodImageCache = foodImageCache;

export function getFoodImageCache(recipeName: string): string | undefined {
  return foodImageCache.get(recipeName);
}

export function setFoodImageCache(recipeName: string, imageUrl: string): void {
  foodImageCache.set(recipeName, imageUrl);
}
