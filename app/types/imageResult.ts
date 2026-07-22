export type ImageResult =
  | { ok: true; imageUrl: string }
  // quota = โควตา neurons รายวันหมด รีเซ็ตวันถัดไป ลองใหม่ตอนนี้ไม่มีประโยชน์
  // rate_limited = ยิงถี่เกินเพดานต่อ IP รอครบชั่วโมงแล้วได้ต่อ
  | { ok: false; reason: "quota" | "unconfigured" | "failed" | "rate_limited" };
