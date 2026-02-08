"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// กำหนดหน้าตาข้อมูลสูตรอาหารที่จะส่งกลับไปหน้าเว็บ
export interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  calories: string;
  tags: string[];
}

export async function generateRecipes(ingredients: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("ไม่พบ API Key! กรุณาเช็คไฟล์ .env.local");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // ใช้รุ่น Flash เพื่อความเร็วและประหยัด
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
  // Prompt สั่งงาน AI (สำคัญมาก!)
  const prompt = `
    คุณเป็นเชฟมืออาชีพ ฉันมีวัตถุดิบดังนี้: ${ingredients.join(", ")}
    
    ช่วยคิดเมนูอาหารไทย 3 เมนู ที่ใช้วัตถุดิบเหล่านี้เป็นหลัก (สามารถเพิ่มเครื่องปรุงพื้นฐานได้)
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
  // วางก่อน try...catch ใน generateRecipes

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean text (เผื่อ AI เผลอใส่ Backticks มา)
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // แปลง Text เป็น JSON Object
    const recipes: Recipe[] = JSON.parse(cleanedText) as Recipe[];
    return recipes;

  } catch (error) {
    console.error("Gemini Error:", error);
    return []; // ถ้าพัง ให้ส่งอาเรย์ว่างกลับไป
  }
}

