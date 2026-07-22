"use server";

import { decodeDataUrl, r2PutObject } from "../lib/cloudflare/r2";
import {
  isRecipeImageCacheEnabled,
  isRecipeImageCached,
  recipeImageKey,
  recipeImagePath,
  recipeImageUrl,
  recordRecipeImage,
} from "../lib/recipeImageCache";
import { checkRateLimit } from "../lib/rateLimit";
import type { ImageResult } from "../types/imageResult";
import type { ImageStyle } from "../utils/cookingModes";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

const MAX_ATTEMPTS = 3;

// Workers AI คิดเงินเป็น tile 512×512 (ปัดขึ้น) คูณจำนวน steps คำขอที่โดนบล็อกก็รัน
// inference ไปแล้วจึงจ่ายเท่ากับที่สำเร็จ — ลองซ้ำ NSFW เกินสองครั้งคือเผาโควตาทิ้ง
const MAX_NSFW_ATTEMPTS = 2;

// 429 มาได้จากสองสาเหตุที่ต่างกันมาก:
//   - ยิงถี่เกินไปชั่วคราว → รอแล้วลองใหม่ได้
//   - โควตา neurons ฟรีรายวันหมด (code 4006) → ลองใหม่กี่ครั้งก็โดนเหมือนเดิม ต้องรอวันถัดไป
const OUT_OF_NEURONS_CODE = 4006;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// ตัวกรอง NSFW ของ flux เป็นแบบสุ่ม — prompt อาหารเดิมเป๊ะ ยิง 6 ครั้งโดนบ้างไม่โดนบ้าง
// จึงถือเป็น retryable: ยิงซ้ำมักผ่าน (วัดแล้วโดน ~17% ต่อครั้ง เหลือ ~3% หลังลองสองครั้ง)
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

/**
 * เมนูเดียวกันที่กำลัง gen ค้างอยู่ — แคชใน D1 ยังไม่มี row จนกว่าจะ gen เสร็จ
 * สองคำขอที่มาพร้อมกันจึงเห็น "ยังไม่มี" ทั้งคู่แล้วจ่าย neurons สองรอบให้รูปเดียวกัน
 * คำขอที่สองเกาะ promise ของคำขอแรกแทน (ช่วยได้เท่าที่อยู่ instance เดียวกัน)
 */
const inFlight = new Map<string, Promise<ImageResult>>();

/**
 * เมนูชื่อเดิมสไตล์เดิมใช้รูปเดิมได้ — ลองหยิบจาก R2 ก่อนเสมอ ยิง Workers AI
 * เฉพาะตอนที่ยังไม่เคยมีใครสั่งเมนูนี้ โควตา neurons รายวันจึงไม่ถูกจ่ายซ้ำ
 */
export async function generateRecipeImage(
  dishDescription: string,
  style: ImageStyle = "photo",
  cacheName: string = dishDescription,
): Promise<ImageResult> {
  if (!isRecipeImageCacheEnabled()) {
    const rate = await checkRateLimit("image");
    if (!rate.allowed) return { ok: false, reason: "rate_limited" };

    return generateFreshImage(dishDescription, style);
  }

  const path = recipeImagePath(cacheName, style);

  try {
    if (await isRecipeImageCached(path)) {
      return { ok: true, imageUrl: recipeImageUrl(path) };
    }
  } catch (error) {
    // เช็คแคชไม่ได้ก็แค่ gen ใหม่ ไม่ควรทำให้ผู้ใช้อดรูป
    console.error("recipe image cache lookup error:", error);
  }

  const pending = inFlight.get(path);
  if (pending) return pending;

  // นับโควตาตรงนี้ ไม่ใช่ตอนเข้าฟังก์ชัน — รูปที่มีในแคชแล้วหรือเกาะคำขอที่กำลังวิ่งอยู่
  // ไม่ได้จ่าย neurons เพิ่มสักนิด ไม่ควรไปกินสิทธิ์ของผู้ใช้
  const rate = await checkRateLimit("image");
  if (!rate.allowed) return { ok: false, reason: "rate_limited" };

  const job = generateAndStore(dishDescription, style, cacheName, path);
  // ลบทิ้งเมื่อจบไม่ว่าสำเร็จหรือไม่ — ล้มเหลวแล้วต้องให้คำขอถัดไปลองใหม่ได้
  const tracked = job.finally(() => inFlight.delete(path));
  inFlight.set(path, tracked);
  return tracked;
}

async function generateAndStore(
  dishDescription: string,
  style: ImageStyle,
  cacheName: string,
  path: string,
): Promise<ImageResult> {
  const result = await generateFreshImage(dishDescription, style);
  if (!result.ok) return result;

  const decoded = decodeDataUrl(result.imageUrl);
  if (!decoded) return result;

  try {
    await r2PutObject(recipeImageKey(path), decoded.bytes, decoded.contentType);
    await recordRecipeImage(path, cacheName, style);
    return { ok: true, imageUrl: recipeImageUrl(path) };
  } catch (error) {
    // เก็บไม่สำเร็จก็ยังส่งรูปที่เพิ่ง gen ให้ผู้ใช้ได้ แค่รอบหน้าต้อง gen ใหม่
    console.error("recipe image cache write error:", error);
    return result;
  }
}

async function generateFreshImage(
  dishDescription: string,
  style: ImageStyle,
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
          // 1024×512 ไม่ใช่ 16:9 เป๊ะ แต่จ่ายแค่ 2 tile ส่วน 576 ล้นเส้น 512 ไป 64px
          // แล้วโดนคิดเต็มแถวที่สอง = 4 tile ทั้งที่ตาแทบไม่เห็นความต่างหลัง object-cover
          // steps: schnell ถูก distill มาให้ทำงานที่ 1-4 steps — 2 พอสำหรับรูปอาหาร
          body: JSON.stringify({ prompt, steps: 2, width: 1024, height: 512 }),
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
        const limit = isNsfwFalsePositive ? MAX_NSFW_ATTEMPTS : MAX_ATTEMPTS;

        if (retryable && attempt < limit) {
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
