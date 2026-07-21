"use server";

import {
  filterCachedRecipeImages,
  isRecipeImageCacheEnabled,
  recipeImagePath,
  recipeImageUrl,
} from "../lib/recipeImageCache";
import type { ImageStyle } from "../utils/cookingModes";

/**
 * เมนูไหนเคย gen รูปไว้แล้วบ้าง — คืน map ชื่อเมนู → URL
 *
 * ใช้เติมรูปให้การ์ดที่เหลือโดยไม่จ่าย neurons เลย ถามทีเดียวได้ทุกเมนู
 * เมนูที่ยังไม่มีรูปจะไม่อยู่ใน map แล้วค่อย gen ตอนผู้ใช้กดเข้าไปทำจริง
 */
export async function getCachedRecipeImages(
  dishNames: string[],
  style: ImageStyle,
): Promise<Record<string, string>> {
  if (!isRecipeImageCacheEnabled() || dishNames.length === 0) return {};

  // คนละชื่อ hash ลง path เดียวกันได้ (normalize แล้วเหมือนกัน) — ถาม path ที่ไม่ซ้ำ
  // แต่ตอบกลับให้ครบทุกชื่อที่ขอมา ไม่งั้นการ์ดที่ชื่อต่างกันนิดหน่อยจะไม่ได้รูป
  const pathByName = dishNames.map(
    (name) => [name, recipeImagePath(name, style)] as const,
  );

  try {
    const cached = new Set(
      await filterCachedRecipeImages([
        ...new Set(pathByName.map(([, path]) => path)),
      ]),
    );
    return Object.fromEntries(
      pathByName
        .filter(([, path]) => cached.has(path))
        .map(([name, path]) => [name, recipeImageUrl(path)]),
    );
  } catch (error) {
    // ถามแคชไม่ได้ก็แค่ไม่มีรูปมาเติม ไม่ควรทำให้หน้าเมนูพัง
    console.error("recipe image cache lookup error:", error);
    return {};
  }
}
