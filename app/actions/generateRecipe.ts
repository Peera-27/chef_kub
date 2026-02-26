"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  calories: string;
  tags: string[];
}

export async function generateRecipes(ingredients: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    
        คุณเป็นเชฟมืออาชีพ ฉันมีวัตถุดิบดังนี้: ${ingredients.join(", ")}
    
    ช่วยคิดเมนูอาหารไทย 3 เมนูโดยบอกวิธีการทำที่ละเอียดและกินได้จริง ที่ใช้วัตถุดิบเหล่านี้เป็นหลัก (สามารถเพิ่มเครื่องปรุงพื้นฐานได้)
    ขอผลลัพธ์เป็น JSON Array เท่านั้น โดยมี Format ดังนี้:
    [
      {
        "name": "ชื่อเมนูภาษาไทย",
        "ingredients": ["รายชื่อวัตถุดิบพร้อมปริมาณ"],
        "instructions": ["ขั้นตอนที่ 1", "ขั้นตอนที่ 2"],
        "calories": "ประมาณ xxx kcal",
        "tags": ["เผ็ด", "ทำง่าย", "โปรตีนสูง"]
      }
    ]
    ไม่ต้องมีคำเกริ่น หรือ Markdown ใดๆ ขอแค่ Raw JSON
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as Recipe[];
  } catch (error) {
    console.error("Recipe Error:", error);
    return [];
  }
}