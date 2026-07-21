import { createHash } from "crypto";

import { chunkRows, d1Query, isD1Configured } from "./cloudflare/d1";
import { isR2Configured } from "./cloudflare/r2";
import { IMAGE_STYLES, type ImageStyle } from "../utils/cookingModes";

/**
 * รูปเมนูที่ gen แล้วเก็บไว้ใน R2 ใต้ prefix นี้ แยกจากรูป training ของผู้ใช้
 * (ที่อยู่ใต้ sessionId) — เมนูชื่อเดิมสไตล์เดิมจึงจ่าย neurons แค่ครั้งเดียวตลอดกาล
 */
const PREFIX = "recipes";

/** ชื่อเมนูจากโมเดลมีเว้นวรรค/ตัวพิมพ์ไม่คงที่ — normalize ก่อน hash ให้ cache ชนกันได้จริง */
function normalizeDishName(dishName: string): string {
  return dishName.trim().toLowerCase().replace(/\s+/g, " ");
}

/** ส่วนที่อยู่หลัง prefix เช่น "photo/<sha256>.jpg" */
export function recipeImagePath(dishName: string, style: ImageStyle): string {
  const hash = createHash("sha256")
    .update(`${style}:${normalizeDishName(dishName)}`)
    .digest("hex");
  return `${style}/${hash}.jpg`;
}

export function recipeImageKey(path: string): string {
  return `${PREFIX}/${path}`;
}

export function recipeImageUrl(path: string): string {
  return `/api/recipe-image/${path}`;
}

export function isRecipeImageCacheEnabled(): boolean {
  return isD1Configured() && isR2Configured();
}

/**
 * ต้องถาม D1 ว่าเคย gen รูปนี้แล้วหรือยัง ถามจาก R2 ตรง ๆ ไม่ได้ — REST API ของ R2
 * เสิร์ฟผ่าน edge cache (เห็น cf-cache-status ในเฮดเดอร์) พอ GET ครั้งแรกได้ 404
 * มันจะจำ 404 นั้นไว้อีกหลายนาที รูปที่เพิ่งอัพขึ้นไปจึงกลายเป็น "ไม่มี" แล้ว gen ซ้ำ
 */
export async function isRecipeImageCached(path: string): Promise<boolean> {
  const rows = await d1Query(
    "SELECT 1 FROM recipe_images WHERE storage_path = ? LIMIT 1",
    [recipeImageKey(path)],
  );
  return rows.length > 0;
}

/** ถามหลาย path ทีเดียว — คืนเฉพาะ path ที่มีรูปอยู่แล้ว */
export async function filterCachedRecipeImages(
  paths: string[],
): Promise<string[]> {
  const keyToPath = new Map(paths.map((path) => [recipeImageKey(path), path]));
  const found: string[] = [];

  for (const chunk of chunkRows([...keyToPath.keys()], 100)) {
    const rows = await d1Query<{ storage_path: string }>(
      `SELECT storage_path FROM recipe_images
       WHERE storage_path IN (${chunk.map(() => "?").join(", ")})`,
      chunk,
    );
    for (const row of rows) {
      const path = keyToPath.get(row.storage_path);
      if (path) found.push(path);
    }
  }

  return found;
}

export async function recordRecipeImage(
  path: string,
  dishName: string,
  style: ImageStyle,
): Promise<void> {
  await d1Query(
    `INSERT OR REPLACE INTO recipe_images (storage_path, dish_name, style)
     VALUES (?, ?, ?)`,
    [recipeImageKey(path), normalizeDishName(dishName), style],
  );
}

/**
 * route อ่านไฟล์จากบักเก็ตเดียวกับรูป training — ต้องกันไม่ให้ path ที่ผู้ใช้ยิงมาเอง
 * ไถออกนอก prefix ไปหยิบรูปของ session อื่น จึงรับเฉพาะรูปแบบที่ recipeImagePath สร้าง
 */
const PATH_PATTERN = new RegExp(
  `^(${IMAGE_STYLES.join("|")})/[0-9a-f]{64}\\.jpg$`,
);

export function isRecipeImagePath(path: string): boolean {
  return PATH_PATTERN.test(path);
}
