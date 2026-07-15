export type ImageResult =
  | { ok: true; imageUrl: string }
  // quota = โควตา neurons รายวันหมด รีเซ็ตวันถัดไป ลองใหม่ตอนนี้ไม่มีประโยชน์
  | { ok: false; reason: "quota" | "unconfigured" | "failed" };
