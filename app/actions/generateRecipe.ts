"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { checkRateLimit } from "../lib/rateLimit";
import type { Recipe } from "../types/recipe";
import {
  DEFAULT_COOKING_MODE,
  RECIPE_TAGS,
  getCookingMode,
  type CookingMode,
} from "../utils/cookingModes";

const MAX_ATTEMPTS = 3;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error: unknown) => {
  const status = (error as { status?: number }).status;
  return status === 503 || status === 429;
};

const recipeListSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      inspiration: { type: Type.STRING },
      note: { type: Type.STRING },
      imagePrompt: { type: Type.STRING },
      servings: { type: Type.INTEGER },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      extraIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      calories: { type: Type.STRING },
      readyInMinutes: { type: Type.INTEGER },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING, enum: [...RECIPE_TAGS] },
      },
    },
    required: [
      "name",
      "imagePrompt",
      "servings",
      "ingredients",
      "extraIngredients",
      "instructions",
      "calories",
      "readyInMinutes",
      "tags",
    ],
  },
};



// โมเดลอาจคืน object เดี่ยวหรือเมนูที่ฟิลด์ไม่ครบ — กันไม่ให้หลุดไปพังตอน render
export type RecipeResult =
  // recipes ว่างได้ = โมเดลตอบมาแต่ไม่มีเมนูไหนใช้ได้จริง ต่างจาก ok:false ที่ยิงไม่ถึง
  | { ok: true; recipes: Recipe[] }
  // rate_limited = ยิงถี่เกินเพดานต่อ IP | unconfigured = ไม่มี API key
  | { ok: false; reason: "unconfigured" | "failed" | "rate_limited" };

function isUsableRecipe(value: unknown): value is Recipe {
  const recipe = value as Partial<Recipe> | null;
  return (
    !!recipe &&
    typeof recipe.name === "string" &&
    recipe.name.trim().length > 0 &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.instructions) &&
    recipe.instructions.length > 0
  );
}

function buildPrompt(
  ingredients: string[],
  mode: CookingMode,
  equipment: string[],
) {
  return `
คุณเป็นเชฟที่เก่งเรื่องพลิกแพลงวัตถุดิบ ผู้ใช้ยืนอยู่หน้าเตาพร้อมทำอาหารแล้ว

วัตถุดิบที่ผู้ใช้มี: ${ingredients.join(", ")}

อุปกรณ์ในครัวที่ผู้ใช้มี: ${
    equipment.length > 0
      ? equipment.join(", ")
      : "ไม่ได้ระบุอุปกรณ์"
  }

${getCookingMode(mode).promptBlock}

กติกาของทุกเมนู:
- ทำ 3 เมนู สำหรับ 2 ที่ ใช้วิธีปรุงต่างกันทั้ง 3 เมนู (เช่น ผัด ต้ม ยำ ทอด นึ่ง อบ)
- เรียง readyInMinutes จากน้อยไปมาก เมนูแรกคือเมนูที่เสร็จเร็วที่สุด
- วัตถุดิบที่ผู้ใช้มีต้องเป็นตัวหลักของจาน ทุกเมนูต้องใช้อย่างน้อย 1 อย่างจากรายการข้างบน
- ต้องออกแบบสูตรอาหารโดยคำนึงถึงอุปกรณ์ในครัวที่ผู้ใช้มี
- ควรเลือกวิธีปรุงที่สามารถทำได้ด้วยอุปกรณ์ที่ผู้ใช้มีเป็นหลัก
- ห้ามกำหนดให้อุปกรณ์ที่ผู้ใช้ไม่มีเป็นอุปกรณ์หลักของขั้นตอนการทำอาหาร
- หากสามารถเลือกวิธีปรุงได้หลายแบบ ให้เลือกวิธีที่เหมาะกับอุปกรณ์ที่ผู้ใช้มีมากที่สุด
- หากเมนูจำเป็นต้องใช้อุปกรณ์ที่ผู้ใช้ไม่มีจริง ๆ ให้ปรับวิธีการทำเป็นทางเลือกที่ใช้ทดแทนได้
- เพิ่มของนอกรายการได้ไม่เกิน 3 อย่างต่อเมนู ต้องหาซื้อได้ในร้านสะดวกซื้อหรือซูเปอร์ทั่วไป
  และห้ามให้ของที่เพิ่มเป็นตัวหลักของจาน มันมีไว้เสริมของที่ผู้ใช้มีอยู่แล้วเท่านั้น
  ใส่ของที่ต้องซื้อเพิ่มลงใน extraIngredients ด้วย
  แต่เครื่องปรุงพื้นฐาน (เกลือ น้ำตาล น้ำมัน น้ำเปล่า น้ำปลา ซีอิ๊ว พริกไทย) ไม่ต้องนับโควตา
  และห้ามใส่เครื่องปรุงพื้นฐานใน extraIngredients
- ingredients ระบุปริมาณสำหรับ 2 ที่ และต้องรวมของใน extraIngredients ไว้ด้วย
- instructions มี 4-8 ขั้นตอน ต้องเป็นขั้นตอนลงมือทำอาหารจริงเท่านั้น
  ทุกขั้นตอนบอกระดับไฟและเวลาโดยประมาณ เช่น "ผัดไฟกลาง 3 นาที"
  ห้ามใส่หมายเหตุ ที่มา หรือเหตุผลการดัดแปลงลงใน instructions ให้ไปใส่ใน note แทน
- ถ้ามีเนื้อสัตว์ ไข่ หรืออาหารทะเล ต้องมีขั้นตอนที่บอกวิธีสังเกตว่าสุกแล้ว
- calories เป็นค่าต่อ 2 ที่ เขียนแบบ "ประมาณ 350 kcal ต่อที่"
- tags เลือกจากรายการนี้เท่านั้น เมนูละ 1-3 อัน: ${RECIPE_TAGS.join(", ")}
- imagePrompt เขียนเป็นภาษาอังกฤษ หนึ่งประโยค บรรยายหน้าตาจานที่ทำเสร็จแล้ว
บอกวัตถุดิบหลัก สี และภาชนะที่ใส่ ห้ามมีคนหรือตัวหนังสือในภาพ
`;
}

export async function generateRecipes(
  ingredients: string[],
  mode: CookingMode = DEFAULT_COOKING_MODE,
  equipment: string[] = [],
): Promise<RecipeResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return { ok: false, reason: "unconfigured" };

  // เช็คก่อนแตะ Gemini — กันไม่ให้ค่าใช้จ่ายเกิดขึ้นก่อนแล้วค่อยปฏิเสธ
  const rate = await checkRateLimit("recipes");
  if (!rate.allowed) return { ok: false, reason: "rate_limited" };

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-flash-lite";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildPrompt(
          ingredients,
          mode,
          equipment,
        ),
        config: {
          responseMimeType: "application/json",
          responseSchema: recipeListSchema,
          temperature: getCookingMode(mode).temperature,
        },
      });

      const text = response.text;

      if (!text) return { ok: true, recipes: [] };

      const parsed: unknown = JSON.parse(text);

      if (!Array.isArray(parsed)) return { ok: true, recipes: [] };

      return { ok: true, recipes: parsed.filter(isUsableRecipe) };
    } catch (error) {
      if (
        isRetryable(error) &&
        attempt < MAX_ATTEMPTS
      ) {
        await sleep(
          1000 * 2 ** (attempt - 1),
        );
        continue;
      }

      console.error(
        "Recipe Error:",
        error,
      );

      return { ok: false, reason: "failed" };
    }
  }

  return { ok: false, reason: "failed" };
}
