"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";

// ป้องกัน Cache หายตอน Hot Reload ในโหมด Development
const globalForCache = global as unknown as { visionCache: Map<string, string[]> };
const visionCache = globalForCache.visionCache || new Map<string, string[]>();
if (process.env.NODE_ENV !== "production") globalForCache.visionCache = visionCache;

export async function identifyIngredients(imageBase64: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("ไม่พบ API Key");

  // 1. สร้าง Hash เพื่อเช็ค Cache (ถ้าส่งรูปเดิมมาจะตอบทันที)
  const hash = createHash("sha256").update(imageBase64).digest("hex");
  if (visionCache.has(hash)) {
    console.log("🚀 Cache Hit: ใช้ข้อมูลเดิม");
    return visionCache.get(hash)!;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
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
    
    // 2. บันทึกลง Cache
    visionCache.set(hash, detectedItems);
    return detectedItems;
  } catch (error) {
    console.error("Vision Error:", error);
    return []; 
  }
}