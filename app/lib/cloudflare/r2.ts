const API_BASE = "https://api.cloudflare.com/client/v4";

export function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN &&
    process.env.CLOUDFLARE_R2_BUCKET,
  );
}

export interface DecodedImage {
  bytes: ArrayBuffer;
  contentType: string;
  extension: string;
}

export function decodeDataUrl(dataUrl: string): DecodedImage | null {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  const [, contentType, subtype, base64] = match;
  const buf = Buffer.from(base64, "base64");

  return {
    // Buffer อาจเป็น view บน pool ที่ใหญ่กว่า — slice ออกมาให้เหลือเฉพาะไบต์ของรูป
    bytes: buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer,
    contentType,
    extension: subtype === "jpeg" ? "jpg" : subtype,
  };
}

function objectEndpoint(key: string): { url: string; token: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;

  if (!accountId || !token || !bucket) {
    throw new Error("missing_r2_config");
  }

  // เข้ารหัสทีละ segment เพื่อไม่ให้ "/" ใน key กลายเป็น %2F (R2 ใช้มันเป็น prefix)
  const objectPath = key.split("/").map(encodeURIComponent).join("/");

  return {
    url: `${API_BASE}/accounts/${accountId}/r2/buckets/${bucket}/objects/${objectPath}`,
    token,
  };
}

/**
 * อัพ object ขึ้น R2 ผ่าน REST API — ใช้ token เดียวกับ D1 (ต้องมี permission
 * "Workers R2 Storage: Edit"). endpoint นี้จำกัดไฟล์ละ 300 MB ซึ่งเกินพอสำหรับรูปถ่าย
 */
export async function r2PutObject(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { url, token } = objectEndpoint(key);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 upload failed: HTTP ${res.status} ${detail}`.trim());
  }
}

/**
 * ดึง object กลับมา — คืน null เมื่อยังไม่มี key นี้ในบักเก็ต
 *
 * ระวัง: endpoint นี้เสิร์ฟผ่าน edge cache ของ Cloudflare (มีเฮดเดอร์ cf-cache-status)
 * และมันแคช 404 ด้วย ห้ามใช้เช็คว่ามีไฟล์อยู่ก่อนจะอัพ ไม่งั้น 404 ที่ค้างอยู่จะทำให้
 * ไฟล์ที่เพิ่งอัพไปกลายเป็น "ไม่มี" ไปอีกหลายนาที — ให้เช็คจาก index ใน D1 แทน
 */
export async function r2GetObject(key: string): Promise<Response | null> {
  const { url, token } = objectEndpoint(key);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    // ต้องอ่าน body ทิ้งให้จบ ไม่ใช่ cancel() — stream ที่ fetch ของ Next ห่อไว้
    // ค้างยาวเมื่อถูกยกเลิกกลางคัน (route ตอบช้าเป็นนาทีแทนที่จะ 404 ทันที)
    const detail = await res.text().catch(() => "");
    if (res.status === 404) return null;
    throw new Error(`R2 get failed: HTTP ${res.status} ${detail}`.trim());
  }

  return res;
}
