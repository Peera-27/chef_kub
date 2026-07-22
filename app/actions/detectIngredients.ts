"use server";

import { GoogleGenAI, Type } from "@google/genai";

import { checkRateLimit } from "../lib/rateLimit";

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
// ลำดับ property ตั้งใจเรียงแบบนี้ — structured output ไล่สร้างตามลำดับ ให้มันตอบ
// คำถามกว้างสุดก่อน ("รูปนี้มีของกินไหม" → "เป็นจานที่ทำเสร็จแล้วไหม") แล้วค่อยไล่ชื่อ
const verdictSchema = {
  type: Type.OBJECT,
  properties: {
    foodImage: { type: Type.BOOLEAN },
    preparedDish: { type: Type.BOOLEAN },
    confirmed: { type: Type.ARRAY, items: { type: Type.STRING } },
    added: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["foodImage", "preparedDish", "confirmed", "added"],
};

export type DetectResult =
  // confirmed = ของที่ YOLO เดาแล้ว Gemini ยืนยัน (สะกดตรงกับ label YOLO)
  // added = ของที่ Gemini เห็นเพิ่มเอง (YOLO ไม่ได้เดา)
  | { ok: true; confirmed: string[]; added: string[] }
  // quota = โควตา free tier รายวันหมด | unconfigured = ไม่มี API key
  // rate_limited = ยิงถี่เกินเพดานต่อ IP รอครบชั่วโมงแล้วได้ต่อ
  // prepared_dish = รูปเป็นอาหารที่ทำเสร็จแล้ว ไม่ใช่วัตถุดิบที่เอาไปทำต่อได้
  // not_food = ในรูปไม่มีของกินเลย (รูปคน สัตว์ วิว หน้าจอ ฯลฯ)
  | {
      ok: false;
      reason:
        | "quota"
        | "unconfigured"
        | "failed"
        | "rate_limited"
        | "prepared_dish"
        | "not_food";
    };

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
      : `ยังไม่มีการเดาเบื้องต้นมาให้ ให้คุณดูรูปแล้วบอกเฉพาะวัตถุดิบที่เห็นชัดใน added`;

  return `คุณเป็นผู้ช่วยแยกแยะวัตถุดิบอาหารจากรูปภาพ และเป็น "คนตัดสินสุดท้าย"

${guessBlock}

ตอบกลับ 4 ฟิลด์:
- foodImage: true ถ้าในรูปมี "ของกินได้" อยู่จริงอย่างน้อยหนึ่งอย่าง
  ไม่ว่าจะเป็นวัตถุดิบดิบ ของสด ของแห้ง เครื่องปรุงในขวด หรืออาหารที่ทำเสร็จแล้ว
  false ถ้ารูปนี้ไม่เกี่ยวกับของกินเลย เช่น รูปคน รูปสัตว์เลี้ยง เซลฟี่ วิว ตึก รถ
  หน้าจอคอม ข้อความ เอกสาร เสื้อผ้า ของใช้ หรือรูปมืด/เบลอจนดูไม่ออกว่าเป็นอะไร
  คนถือของกินอยู่ = true (มีของกินในรูป) แต่คนเปล่า ๆ ไม่มีของกิน = false
- preparedDish: true ถ้ารูปนี้คือ "อาหารที่ทำเสร็จแล้ว จัดจานพร้อมกิน"
  เช่น ข้าวผัดกะเพราราดข้าวมีไข่ดาว, แกงในถ้วย, ก๋วยเตี๋ยวในชาม, ข้าวกล่อง, จานอาหารในร้าน
  false เฉพาะกรณีที่เป็นวัตถุดิบซึ่งยังรอเอาไปทำอาหาร เช่น ของในตู้เย็น ของสดบนเขียง ถุงของจากตลาด
  วัตถุดิบที่แค่สุกหรือหั่นเตรียมไว้ แต่ยังไม่ได้จัดเป็นจาน ให้ถือว่า false
- confirmed: ชื่อจากรายการที่ตัวตรวจจับเดามา "ที่มองเห็นจริงในรูปเท่านั้น"
  สะกดให้ตรงกับที่เดามาเป๊ะ ๆ อันไหนไม่เห็นจริงในรูปห้ามใส่ (ถ้าเดาผิดหมด ให้เป็น array ว่าง)
- added: วัตถุดิบอื่นที่คุณเห็นในรูปจริง แต่ไม่มีอยู่ในรายการที่เดามา

กติกา:
- ถ้า foodImage = false ให้ confirmed กับ added เป็น array ว่างทั้งคู่เสมอ
  ต่อให้ตัวตรวจจับเดาชื่อวัตถุดิบมาให้ก็ห้ามยืนยันสักอันเดียว เพราะมันเดามั่วจากรูปที่ไม่ใช่ของกิน
- ถ้า preparedDish = true ให้ confirmed กับ added เป็น array ว่างทั้งคู่เสมอ
  ห้ามแตกจานที่ทำเสร็จแล้วกลับเป็นวัตถุดิบ ถึงจะมองเห็นข้าว ไข่ดาว หรือใบกะเพราชัดแค่ไหนก็ตาม
  เพราะผู้ใช้เอาของบนจานนั้นไปทำอาหารต่อไม่ได้แล้ว
- เอาเฉพาะวัตถุดิบ/ของกินได้จริงในรูป ไม่เอาจาน ชาม ภาชนะ หรือฉากหลัง
- ห้ามเดาเครื่องปรุงที่มองไม่เห็น (เกลือ น้ำปลา ฯลฯ)
- ตัดสินจากสิ่งที่ "เห็นเป็นชิ้นแยกได้" ในรูปเท่านั้น ห้ามใช้ความรู้ว่าเมนูนี้ปกติใส่อะไร
- ไม่แน่ใจว่าใช่หรือเปล่า = ไม่ใส่ ตอบน้อยแต่ถูก ดีกว่าตอบครบแต่มั่ว
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

  // เช็คก่อนแตะ Gemini — กันไม่ให้ค่าใช้จ่ายเกิดขึ้นก่อนแล้วค่อยปฏิเสธ
  const rate = await checkRateLimit("detect");
  if (!rate.allowed) return { ok: false, reason: "rate_limited" };

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
        foodImage?: unknown;
        preparedDish?: unknown;
        confirmed?: unknown;
        added?: unknown;
      };

      /* รูปที่ไม่มีของกินเลย (รูปคน วิว หน้าจอ) ตัดจบก่อนเพื่อน — ปล่อยผ่านเมื่อไหร่
         ผู้ใช้จะได้รูปเปล่า ๆ เข้าแกลเลอรี แล้วลากกรอบแปะชื่อวัตถุดิบทับหน้าคนได้
         ซึ่งไหลไปเป็น training data เสียทั้งชุด
         เช็ค === false ไม่ใช่ !== true — ถ้าโมเดลไม่ตอบฟิลด์นี้มา ให้ไปต่อตามปกติ */
      if (parsed.foodImage === false) {
        return { ok: false, reason: "not_food" };
      }

      // จานที่ทำเสร็จแล้วตัดจบตรงนี้ ไม่ต้องสน list ที่มันตอบมา — บางทีมันก็ยัง
      // แตกวัตถุดิบมาให้ทั้งที่สั่งห้าม การเช็คฝั่งนี้จึงเป็นตัวบังคับจริง
      if (parsed.preparedDish === true) {
        return { ok: false, reason: "prepared_dish" };
      }

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
