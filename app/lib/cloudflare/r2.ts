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

/**
 * อัพ object ขึ้น R2 ผ่าน REST API — ใช้ token เดียวกับ D1 (ต้องมี permission
 * "Workers R2 Storage: Edit"). endpoint นี้จำกัดไฟล์ละ 300 MB ซึ่งเกินพอสำหรับรูปถ่าย
 */
export async function r2PutObject(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;

  if (!accountId || !token || !bucket) {
    throw new Error("missing_r2_config");
  }

  // เข้ารหัสทีละ segment เพื่อไม่ให้ "/" ใน key กลายเป็น %2F (R2 ใช้มันเป็น prefix)
  const objectPath = key.split("/").map(encodeURIComponent).join("/");

  const res = await fetch(
    `${API_BASE}/accounts/${accountId}/r2/buckets/${bucket}/objects/${objectPath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 upload failed: HTTP ${res.status} ${detail}`.trim());
  }
}
