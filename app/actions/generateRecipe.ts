"use server";

import { GoogleGenAI } from "@google/genai";
import type { Recipe } from "../types/recipe";

export async function generateRecipes(ingredients: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";

  const prompt = `
คุณเป็นเชฟมืออาชีพ ผู้ใช้พร้อมทำอาหารแล้ว — อย่าถามคำถามเพิ่ม ให้คำตอบที่ทำได้ทันที

วัตถุดิบที่มี: ${ingredients.join(", ")}

สร้างเมนูอาหารไทย 3 เมนู เรียงจาก "ทำเร็วที่สุด/ง่ายที่สุด" ไปก่อน
- ใช้วัตถุดิบที่มีเป็นหลัก (เครื่องปรุงพื้นฐานเพิ่มได้)
- ขั้นตอนชัดเจน ทำตามได้จริง ไม่ต้องถามผู้ใช้เพิ่ม
- เมนูแรกควรเป็นตัวเลือกที่ดีที่สุดสำหรับเริ่มทำทันที

ตอบเป็น JSON Array เท่านั้น:
[
  {
    "name": "ชื่อเมนูภาษาไทย",
    "ingredients": ["วัตถุดิบพร้อมปริมาณ"],
    "instructions": ["ขั้นตอนที่ 1", "ขั้นตอนที่ 2"],
    "calories": "ประมาณ xxx kcal",
    "readyInMinutes": 15,
    "tags": ["ทำง่าย", "เร็ว"]
  }
]
Raw JSON เท่านั้น ไม่มี markdown
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Recipe[];
  } catch (error) {
    console.error("Recipe Error:", error);
    return [];
  }
}
