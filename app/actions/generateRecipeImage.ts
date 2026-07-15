"use server";

import type { ImageResult } from "../types/imageResult";
import type { ImageStyle } from "../utils/cookingModes";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

const MAX_ATTEMPTS = 3;

// 429 มาได้จากสองสาเหตุที่ต่างกันมาก:
//   - ยิงถี่เกินไปชั่วคราว → รอแล้วลองใหม่ได้
//   - โควตา neurons ฟรีรายวันหมด (code 4006) → ลองใหม่กี่ครั้งก็โดนเหมือนเดิม ต้องรอวันถัดไป
const OUT_OF_NEURONS_CODE = 4006;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// ตัวกรอง NSFW ของ flux เป็นแบบสุ่ม — prompt อาหารเดิมเป๊ะ ยิง 6 ครั้งโดนบ้างไม่โดนบ้าง
// จึงถือเป็น retryable: ยิงซ้ำมักผ่าน (วัดแล้วโดน ~17% ต่อครั้ง เหลือ ~0.5% หลังลอง 3 ครั้ง)
const NSFW_CODE = 3030;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface WorkersAiImageResponse {
  result?: { image?: string };
  success?: boolean;
  errors?: { code: number; message: string }[];
}

// Cloudflare บอกมาเองว่าให้รอกี่วินาที ถ้าไม่บอกค่อย backoff แบบเท่าตัว
function retryDelayMs(res: Response, attempt: number) {
  const seconds = Number(res.headers.get("retry-after"));
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  return 1000 * 2 ** (attempt - 1);
}

async function readErrors(res: Response) {
  try {
    const json = (await res.json()) as WorkersAiImageResponse;
    return json.errors ?? [];
  } catch {
    return [];
  }
}

// flux-1-schnell ไม่รับ negative prompt แยก — ต้องเขียนสิ่งที่ไม่อยากได้ลงใน prompt ตรง ๆ
const NO_CLUTTER = "No text, no watermark, no hands, no people.";

// คำว่า "anime" ทำให้ตัวกรอง NSFW ตื่นตูมหนักมาก (วัดแล้วโดน 4/6 เทียบกับ 1/6 เมื่อตัดออก)
// จึงบรรยายลุคแบบเดียวกันโดยไม่เอ่ยคำนั้น — รูปที่ได้ยังเป็นภาพวาดเซลเชดเหมือนเดิม
const STYLE_PROMPT: Record<ImageStyle, (dish: string) => string> = {
  photo: (dish) =>
    `Professional food photography of a dish: ${dish}. Natural lighting, appetizing plating, shallow depth of field, clean neutral background, realistic style. ${NO_CLUTTER}`,
  anime: (dish) =>
    `Hand-painted food illustration of a dish: ${dish}. Cel shading, bold clean linework, vibrant saturated colours, warm inviting glow, lovingly detailed painted food art in the style of a classic animated film, simple background. ${NO_CLUTTER}`,
};

export async function generateRecipeImage(
  dishDescription: string,
  style: ImageStyle = "photo",
): Promise<ImageResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    console.warn(
      "ไม่พบ CLOUDFLARE_ACCOUNT_ID หรือ CLOUDFLARE_API_TOKEN — ข้ามการสร้างรูป",
    );
    return { ok: false, reason: "unconfigured" };
  }

  const prompt = STYLE_PROMPT[style](dishDescription);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          // 16:9 ให้ตรงกับกรอบ aspect-video ของการ์ดในแอป — แสดงเต็มรูปโดยไม่ต้อง crop
          body: JSON.stringify({ prompt, steps: 4, width: 1024, height: 576 }),
        },
      );

      if (!res.ok) {
        const errors = await readErrors(res);

        if (errors.some((e) => e.code === OUT_OF_NEURONS_CODE)) {
          console.error(
            "Workers AI: โควตา neurons ฟรีรายวันหมดแล้ว — ข้ามการสร้างรูปจนกว่าจะถึงวันถัดไป",
          );
          return { ok: false, reason: "quota" };
        }

        const isNsfwFalsePositive = errors.some((e) => e.code === NSFW_CODE);
        const retryable =
          isNsfwFalsePositive || RETRYABLE_STATUS.has(res.status);

        if (retryable && attempt < MAX_ATTEMPTS) {
          // NSFW เป็นการสุ่ม ไม่ใช่ rate limit — ยิงซ้ำได้เลยไม่ต้องหน่วง
          if (!isNsfwFalsePositive) await sleep(retryDelayMs(res, attempt));
          continue;
        }

        console.error(
          `Workers AI image generation failed: ${res.status} ${res.statusText}`,
          errors,
        );
        return { ok: false, reason: "failed" };
      }

      const json = (await res.json()) as WorkersAiImageResponse;
      if (!json.success || !json.result?.image) {
        console.error("Workers AI image generation error:", json.errors);
        return { ok: false, reason: "failed" };
      }

      return {
        ok: true,
        imageUrl: `data:image/jpeg;base64,${json.result.image}`,
      };
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }
      console.error("Workers AI image generation error:", error);
      return { ok: false, reason: "failed" };
    }
  }

  return { ok: false, reason: "failed" };
}
