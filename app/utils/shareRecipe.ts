import type { Recipe } from "../types/recipe";
import { renderRecipeCard, type CardFormat } from "./recipeCard";
import type { CookRating } from "./types";

export type ShareResult =
  | "shared"
  /** ผู้ใช้กดยกเลิกเอง — ไม่ใช่ความผิดพลาด อย่าเด้งข้อความอะไรให้รก */
  | "cancelled"
  /** เบราว์เซอร์ไม่มี share sheet เลยคัดลอกให้แทน */
  | "copied"
  /** แชร์ไฟล์ไม่ได้ เลยโหลดรูปลงเครื่องแทน */
  | "downloaded"
  | "failed";

/** จัดสูตรเป็นข้อความอ่านรู้เรื่องในแชต — Line/Messenger ไม่ render markdown */
export function buildRecipeText(recipe: Recipe): string {
  const lines: string[] = [`🍳 ${recipe.name}`];

  if (recipe.inspiration) lines.push(`✨ ${recipe.inspiration}`);

  const meta = [
    recipe.readyInMinutes != null ? `⏱ ${recipe.readyInMinutes} นาที` : null,
    recipe.servings ? `👥 ${recipe.servings} ที่` : null,
    recipe.calories ? `🔥 ${recipe.calories}` : null,
  ].filter(Boolean);
  if (meta.length > 0) lines.push("", meta.join(" · "));

  if (recipe.ingredients.length > 0) {
    lines.push("", "📝 วัตถุดิบ");
    recipe.ingredients.forEach((item) => lines.push(`• ${item}`));
  }

  if (recipe.extraIngredients && recipe.extraIngredients.length > 0) {
    lines.push("", "🛒 ต้องซื้อเพิ่ม");
    recipe.extraIngredients.forEach((item) => lines.push(`• ${item}`));
  }

  if (recipe.instructions.length > 0) {
    lines.push("", "👨‍🍳 วิธีทำ");
    recipe.instructions.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
  }

  if (recipe.note) lines.push("", `💡 ${recipe.note}`);

  lines.push("", "— จาก Chef Kub");
  return lines.join("\n");
}

/**
 * แชร์สูตรผ่าน share sheet ของเครื่อง ถ้าไม่มีก็คัดลอกลงคลิปบอร์ดแทน
 * ต้องเรียกจากการกดของผู้ใช้โดยตรง ไม่งั้นเบราว์เซอร์บล็อกทั้งสองทาง
 */
export async function shareRecipe(recipe: Recipe): Promise<ShareResult> {
  const text = buildRecipeText(recipe);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: recipe.name, text });
      return "shared";
    } catch (error) {
      // ปิด share sheet ทิ้งถือว่าตั้งใจ — ไม่ต้องไปคัดลอกให้เขาโดยไม่ได้ขอ
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // พังด้วยเหตุอื่น (เช่นไม่ได้อยู่ใน secure context) — ตกไปใช้คลิปบอร์ด
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** ชื่อไฟล์ให้พออ่านออกตอนเซฟลงเครื่อง แต่ตัดอักขระที่ตั้งชื่อไฟล์ไม่ได้ทิ้ง */
function cardFileName(recipe: Recipe, format: CardFormat): string {
  const safeName =
    recipe.name.replace(/[\\/:*?"<>|]/g, "").trim() || "recipe";
  return `chefkub-${safeName}-${format}.png`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // ปล่อย object URL ทิ้ง ไม่งั้นรูปค้างใน memory จนกว่าจะปิดแท็บ
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * สร้างการ์ดรูปของสูตร — แยกจากขั้นแชร์เพื่อให้ UI ปิดสถานะ "กำลังสร้าง" ได้
 * ทันทีที่ไฟล์เสร็จ ไม่ต้องค้างรอ share sheet ของระบบ
 */
export async function buildRecipeCardFile(
  recipe: Recipe,
  format: CardFormat,
  rating?: CookRating | null,
): Promise<File> {
  const blob = await renderRecipeCard(recipe, format, rating);
  return new File([blob], cardFileName(recipe, format), { type: "image/png" });
}

/**
 * ส่งไฟล์การ์ดออกไป — ผ่าน share sheet ถ้าได้ ไม่ได้ก็โหลดลงเครื่อง
 *
 * ห้ามให้ UI ผูกสถานะ loading กับฟังก์ชันนี้ เพราะ navigator.share
 * บนเดสก์ท็อปบางเครื่องไม่ยอม settle เลยแม้ปิดหน้าต่างแชร์ไปแล้ว
 */
export async function shareCardFile(
  file: File,
  title: string,
): Promise<ShareResult> {
  // canShare ต้องเช็คพร้อมไฟล์จริง — บางเครื่องมี share แต่ส่งไฟล์ไม่ได้
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    downloadBlob(file, file.name);
    return "downloaded";
  } catch {
    return "failed";
  }
}
