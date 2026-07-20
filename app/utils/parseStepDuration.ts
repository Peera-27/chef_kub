const UNIT_SECONDS: Record<string, number> = {
  วินาที: 1,
  นาที: 60,
  ชั่วโมง: 3600,
  ชม: 3600,
};

// จับ "10 นาที", "3-4 นาที", "1.5 ชั่วโมง", "30 วินาที"
// ช่วงเวลาจะเก็บแค่ตัวหน้า (ดูคำอธิบายใน parseStepDuration)
const DURATION_RE =
  /(\d+(?:\.\d+)?)\s*(?:[-–~]\s*\d+(?:\.\d+)?\s*)?(วินาที|นาที|ชั่วโมง|ชม)/;

// ขั้นตอนที่ยาวกว่านี้คือหมัก/แช่ข้ามคืน ไม่มีใครยืนจับเวลารอ
const MAX_TIMER_SECONDS = 2 * 3600;
// สั้นกว่านี้กดจับเวลาไม่ทันด้วยซ้ำ
const MIN_TIMER_SECONDS = 5;

/**
 * ดึงเวลาจากข้อความขั้นตอนทำอาหาร เช่น "ต้มน้ำ 10 นาที" → 600
 * คืน null ถ้าไม่มีเวลา หรือเวลายาว/สั้นเกินกว่าจะจับเวลาได้มีประโยชน์
 *
 * ถ้าเป็นช่วง ("ทอด 3-4 นาที") จะใช้ค่าน้อยไว้ก่อน — เตือนเร็วแล้วเปิดดู
 * ดีกว่าปล่อยจนไหม้
 */
export function parseStepDuration(text: string): number | null {
  const match = text.match(DURATION_RE);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = UNIT_SECONDS[match[2]];
  if (!Number.isFinite(value) || value <= 0 || !unit) return null;

  const seconds = Math.round(value * unit);
  if (seconds < MIN_TIMER_SECONDS || seconds > MAX_TIMER_SECONDS) return null;
  return seconds;
}

/**
 * 90 → "1:30", 5400 → "1:30:00"
 * เกินชั่วโมงต้องแยกหลักชั่วโมง ไม่งั้น 1.5 ชม. โผล่เป็น "90:00" ซึ่งอ่านสับสน
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}
