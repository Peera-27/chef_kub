"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateFoodImage(recipeName: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    สร้างรูปอาหารไทยชื่อ "${recipeName}"
    มุมมองจากด้านบน จานสวย แสงธรรมชาติ สไตล์ food photography
    ไม่มีข้อความ ไม่มี watermark
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9" }, // หรือ "1:1", "4:3"
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
}