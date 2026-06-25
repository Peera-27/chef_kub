"use server";

import { GoogleGenAI } from "@google/genai";

const globalForCache = global as unknown as {
  foodImageCache: Map<string, string>;
};
const foodImageCache =
  globalForCache.foodImageCache || new Map<string, string>();
if (process.env.NODE_ENV !== "production")
  globalForCache.foodImageCache = foodImageCache;

export async function getFoodImageCache(
  recipeName: string,
): Promise<string | undefined> {
  return foodImageCache.get(recipeName);
}

export async function setFoodImageCache(
  recipeName: string,
  imageUrl: string,
): Promise<void> {
  foodImageCache.set(recipeName, imageUrl);
}

export async function generateRecipeImage(
  recipeName: string,
): Promise<string | null> {
  const cached = await getFoodImageCache(recipeName);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("ไม่พบ GEMINI_API_KEY — ข้ามการสร้างรูป");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Professional food photography of the Thai dish "${recipeName}". Clean white background, natural lighting, high resolution, appetizing plating, realistic style.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "4:3",
        },
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data,
    );
    const image = imagePart?.inlineData;
    const imageData = image?.data ?? response.data;
    if (!imageData) return null;

    const mimeType = image?.mimeType || "image/png";
    const dataUrl = `data:${mimeType};base64,${imageData}`;
    await setFoodImageCache(recipeName, dataUrl);
    return dataUrl;
  } catch (error) {
    console.error("Gemini image generation error:", error);
    return null;
  }
}
