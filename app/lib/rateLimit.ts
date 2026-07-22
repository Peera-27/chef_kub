import { headers } from "next/headers";

import { d1Query, isD1Configured } from "./cloudflare/d1";

/**
 * Server action ของ Next เป็น endpoint ที่ยิงจากข้างนอกได้ตรง ๆ ไม่ต่างจาก REST
 * เปิดสาธารณะโดยไม่คุมอะไรเลย = ใครก็เขียน loop เผาโควตา Gemini/Workers AI ได้
 * จึงคุมด้วย fixed window ต่อ IP เก็บตัวนับไว้ใน D1 (serverless หลาย instance
 * แชร์ตัวนับใน memory กันไม่ได้)
 *
 * ไม่ตั้งเพดานรวมทั้งระบบต่อวัน เพราะนั่นแปลว่าคนเดียวยิงจนเต็มแล้วทุกคนใช้ไม่ได้ —
 * กลายเป็นช่อง DoS ทั้งที่โควตา free tier ฝั่ง Gemini/Workers AI มีเพดานรายวัน
 * คุมค่าใช้จ่ายให้อยู่แล้ว และแอปมีทางลงนุ่ม ๆ ตอนโควตาหมด (reason "quota")
 */

const WINDOW_MS = 60 * 60 * 1000;

/**
 * เพดานต่อ IP ต่อชั่วโมง — ตั้งจากราคาต่อครั้ง ไม่ใช่ตัวเลขกลม ๆ
 * รอบใช้งานปกติหนึ่งรอบ = detect 1 + recipes 1 + image 1 ครั้ง
 */
const HOURLY_LIMIT = {
  /** Gemini vision — แพงสุดฝั่ง Gemini เพราะส่งรูปเข้าไปด้วย */
  detect: 30,
  /** Gemini text */
  recipes: 30,
  /** Workers AI กินโควตา neurons ที่ฟื้นวันละครั้ง — รัดกว่าตัวอื่น */
  image: 20,
  /** เขียน R2 + D1 ไม่เรียกโมเดล ค่าใช้จ่ายต่อครั้งต่ำกว่ามาก */
  label: 60,
} as const;

export type RateLimitAction = keyof typeof HOURLY_LIMIT;

/**
 * ต้องมี proxy ที่ไว้ใจได้เขียนเฮดเดอร์พวกนี้ให้ ไม่งั้นผู้ใช้ปลอมเองได้ทั้งหมด:
 *   - cf-connecting-ip  Cloudflare เขียนเสมอและทับของเดิม ปลอมไม่ได้ → เชื่อก่อน
 *   - x-forwarded-for   Vercel และ reverse proxy ทั่วไปเขียนให้
 *
 * ถ้าเอาไป self-host แบบเปิด Node ตรงเข้าอินเทอร์เน็ต ต้องมี reverse proxy คั่นเสมอ
 */
async function clientIp(): Promise<string> {
  const headerList = await headers();

  const cfIp = headerList.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    // ตัวแรกในเชนคือผู้ใช้จริง ตัวถัด ๆ ไปคือ proxy ที่ผ่านมา
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  return headerList.get("x-real-ip")?.trim() || "unknown";
}

/** ลบแถวของ window ที่ผ่านไปแล้วแบบสุ่ม — ไม่ต้องตั้ง cron มาคอยกวาด */
function sweepExpired(currentWindow: number): void {
  if (Math.random() >= 0.02) return;

  void d1Query("DELETE FROM rate_limits WHERE window_start < ?", [
    currentWindow - 1,
  ]).catch((error) => {
    console.error("rate limit sweep error:", error);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  /** วินาทีที่ต้องรอจนกว่า window จะรีเซ็ต — ใช้บอกผู้ใช้ว่าอีกนานแค่ไหน */
  retryAfterSeconds: number;
}

/**
 * นับหนึ่งครั้งแล้วบอกว่าผ่านไหม
 *
 * ปล่อยผ่านเมื่อ D1 ล่มหรือยังไม่ได้ตั้งค่า (ตอน dev) — D1 สะดุดชั่วคราวไม่ควร
 * ทำให้ทั้งแอปใช้ไม่ได้ และเพดานรายวันฝั่งผู้ให้บริการโมเดลยังกันค่าใช้จ่ายอยู่
 *
 * แลกมาด้วยข้อควรรู้: ถ้าลืมสร้างตาราง rate_limits ระบบจะปล่อยผ่านทุกคำขอเงียบ ๆ
 */
export async function checkRateLimit(
  action: RateLimitAction,
): Promise<RateLimitResult> {
  const limit = HOURLY_LIMIT[action];
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS);
  const retryAfterSeconds = Math.ceil(
    ((windowStart + 1) * WINDOW_MS - now) / 1000,
  );

  if (!isD1Configured()) return { allowed: true, retryAfterSeconds: 0 };

  try {
    const ip = await clientIp();
    const bucket = `${action}:${ip}`;

    /*
     * ต้องนับแบบ atomic ใน statement เดียว — ถ้าอ่านแล้วค่อยเขียน request ที่มา
     * พร้อมกันจะอ่านค่าเก่าตัวเดียวกันแล้วผ่านทะลุเพดานไปทั้งคู่
     * window เปลี่ยนเมื่อไหร่ให้ CASE รีเซ็ตตัวนับกลับเป็น 1 แทนการบวกต่อ
     */
    const rows = await d1Query<{ hits: number }>(
      `INSERT INTO rate_limits (bucket, window_start, hits)
       VALUES (?, ?, 1)
       ON CONFLICT(bucket) DO UPDATE SET
         hits = CASE
           WHEN rate_limits.window_start = ? THEN rate_limits.hits + 1
           ELSE 1
         END,
         window_start = ?
       RETURNING hits`,
      [bucket, windowStart, windowStart, windowStart],
    );

    sweepExpired(windowStart);

    const hits = rows[0]?.hits ?? 0;
    if (hits > limit) {
      console.warn(`rate limit: ${bucket} ยิงไป ${hits} ครั้ง (เพดาน ${limit})`);
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("rate limit check error:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
