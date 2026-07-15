"use server";

import { GoogleGenAI, Type } from "@google/genai";

const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// free tier โดน 503/429 บ่อยเวลาโมเดลคนใช้เยอะ — รอแล้วลองใหม่มักผ่าน
const isRetryable = (error: unknown) => {
  const status = (error as { status?: number }).status;
  return status === 503 || status === 429;
};

const isQuota = (error: unknown) =>
  (error as { status?: number }).status === 429;

// Gemini เป็นตัวตัดสิน: ยืนยันของที่ YOLO เดาถูก + เติมของที่ YOLO พลาด
const verdictSchema = {
  type: Type.OBJECT,
  properties: {
    confirmed: { type: Type.ARRAY, items: { type: Type.STRING } },
    added: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["confirmed", "added"],
};

export type DetectResult =
  // confirmed = ของที่ YOLO เดาแล้ว Gemini ยืนยัน (สะกดตรงกับ label YOLO)
  // added = ของที่ Gemini เห็นเพิ่มเอง (YOLO ไม่ได้เดา)
  | { ok: true; confirmed: string[]; added: string[] }
  // quota = โควตา free tier รายวันหมด | unconfigured = ไม่มี API key
  | { ok: false; reason: "quota" | "unconfigured" | "failed" };

// base64Url จากแอปเป็น data URL เช่น "data:image/jpeg;base64,...."
// Gemini ต้องการ mimeType กับ data ที่แยก prefix ออกแล้ว
function splitDataUrl(base64Url: string) {
  const match = /^data:(.+?);base64,([\s\S]*)$/.exec(base64Url);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function buildPrompt(yoloLabels: string[]) {
  const guessBlock =
    yoloLabels.length > 0
      ? `ตัวตรวจจับอัตโนมัติเดาว่าในรูปมี: ${yoloLabels.join(", ")}
แต่มันเดาผิดได้บ่อย ให้คุณดูรูปจริงแล้วตัดสินว่าอันไหนถูกอันไหนมั่ว`
      : `ยังไม่มีการเดาเบื้องต้นมาให้ ให้คุณดูรูปแล้วบอกวัตถุดิบทั้งหมดเองใน added`;

  return `คุณเป็นผู้ช่วยแยกแยะวัตถุดิบอาหารจากรูปภาพ และเป็น "คนตัดสินสุดท้าย"

${guessBlock}

ตอบกลับเป็น 2 กลุ่ม:
- confirmed: ชื่อจากรายการที่ตัวตรวจจับเดามา "ที่มองเห็นจริงในรูปเท่านั้น"
  สะกดให้ตรงกับที่เดามาเป๊ะ ๆ อันไหนไม่เห็นจริงในรูปห้ามใส่ (ถ้าเดาผิดหมด ให้เป็น array ว่าง)
- added: วัตถุดิบอื่นที่คุณเห็นในรูปจริง แต่ไม่มีอยู่ในรายการที่เดามา

กติกา:
- เอาเฉพาะวัตถุดิบ/ของกินได้จริงในรูป ไม่เอาจาน ชาม ภาชนะ หรือฉากหลัง
- ห้ามเดาเครื่องปรุงที่มองไม่เห็น (เกลือ น้ำปลา ฯลฯ)
- ชื่อเป็นภาษาไทย รวมของซ้ำเป็นชื่อเดียว`;
}

const cleanNames = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    : [];

/**
 * Gemini เป็นตัวตัดสินสุดท้ายของทุกภาพ (YOLO "มั่นใจแต่มั่ว" ได้ จึงไม่เชื่อผลมันตรง ๆ)
 * รับ label ที่ YOLO เดามาด้วย เพื่อให้ Gemini ยืนยัน/ปฏิเสธด้วยคำเดิม —
 * แก้ทั้งปัญหา false positive และปัญหาชื่อไม่ตรงกันในทีเดียว
 */
export async function detectIngredients(
  base64Url: string,
  yoloLabels: string[] = [],
): Promise<DetectResult> {
  // แยกโควตา: detect ใช้ key ของตัวเอง (คนละ free-tier รายวันกับ gen สูตร)
  // ถ้ายังไม่ตั้ง key เฉพาะ ให้ fallback ไป key หลัก จะได้ไม่พังตอน dev
  const apiKey = process.env.GEMINI_DETECT_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "unconfigured" };

  const image = splitDataUrl(base64Url);
  if (!image) return { ok: false, reason: "failed" };

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-flash-lite";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: buildPrompt(yoloLabels) },
              { inlineData: { mimeType: image.mimeType, data: image.data } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: verdictSchema,
          // งานตัดสินภาพต้องการความนิ่ง ไม่ใช่ความสร้างสรรค์
          temperature: 0,
        },
      });

      const text = response.text;
      if (!text) return { ok: true, confirmed: [], added: [] };

      const parsed = JSON.parse(text) as {
        confirmed?: unknown;
        added?: unknown;
      };

      // กันโมเดลแอบใส่ชื่อที่ไม่ได้อยู่ในรายการที่ YOLO เดา เข้ามาใน confirmed
      const allowed = new Set(yoloLabels);
      const confirmed = cleanNames(parsed.confirmed).filter((name) =>
        allowed.has(name),
      );
      const added = cleanNames(parsed.added);

      return { ok: true, confirmed, added };
    } catch (error) {
      if (isRetryable(error) && attempt < MAX_ATTEMPTS) {
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }
      if (isQuota(error)) return { ok: false, reason: "quota" };
      console.error("Detect Error:", error);
      return { ok: false, reason: "failed" };
    }
  }

  return { ok: false, reason: "quota" };
}
