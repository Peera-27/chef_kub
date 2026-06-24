"use server";

import {
  getFoodImageCache,
  setFoodImageCache,
} from "../lib/foodImageCache";

interface UnsplashSearchResponse {
  results?: Array<{
    urls?: { regular?: string; small?: string };
    user?: { name?: string; links?: { html?: string } };
  }>;
}

export async function fetchRecipeImage(
  recipeName: string,
): Promise<string | null> {
  const cached = getFoodImageCache(recipeName);
  if (cached) return cached;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("ไม่พบ UNSPLASH_ACCESS_KEY — ข้ามการโหลดรูป");
    return null;
  }

  const query = encodeURIComponent(`${recipeName} thai food`);
  const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error("Unsplash error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as UnsplashSearchResponse;
    const photo = data.results?.[0];
    const imageUrl = photo?.urls?.regular ?? photo?.urls?.small ?? null;

    if (imageUrl) {
      setFoodImageCache(recipeName, imageUrl);
    }

    return imageUrl;
  } catch (error) {
    console.error("Unsplash fetch error:", error);
    return null;
  }
}
