"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";
import { getVisionCache, setVisionCache } from "../lib/visionCache";

export async function identifyIngredients(imageBase64: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("ไม่พบ API Key");

  const hash = createHash("sha256").update(imageBase64).digest("hex");
  const cached = getVisionCache(hash);
  if (cached) {
    console.log("🚀 Cache Hit: ใช้ข้อมูลเดิม");
    return cached;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" }
  });

  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  const prompt = `วิเคราะห์รูปภาพนี้แล้วบอก "ชื่อวัตถุดิบอาหาร" เป็นภาษาไทย ตอบเป็น JSON Array เท่านั้น เช่น ["ไข่ไก่", "หมูสับ"]`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);
    
    const detectedItems = JSON.parse(result.response.text()) as string[];

    setVisionCache(hash, detectedItems);
    return detectedItems;
  } catch (error) {
    console.error("Vision Error:", error);
    return []; 
  }
}