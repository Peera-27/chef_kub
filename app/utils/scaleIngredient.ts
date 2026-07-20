// จับ "1 1/2", "1/2", "300", "0.5" — เรียงจากรูปแบบยาวไปสั้น
// ไม่งั้น "1 1/2" จะโดน \d+ ตัวแรกกินไปก่อนเหลือ "1/2" ค้าง
const QUANTITY_RE = /\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?/g;

// เศษส่วนที่คนครัวใช้จริง — เขียน "½ ช้อนชา" อ่านง่ายกว่า "0.5 ช้อนชา"
const FRACTIONS: ReadonlyArray<readonly [number, string]> = [
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

// ยอมให้เพี้ยนได้นิดหน่อย เพราะ 1/3 คูณกลับไปมาแล้วไม่ลงตัวเป๊ะ
const FRACTION_TOLERANCE = 0.02;

function parseQuantity(raw: string): number {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }
  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2]);
  }
  return Number.parseFloat(raw);
}

function formatQuantity(value: number): string {
  const whole = Math.floor(value);
  const remainder = value - whole;

  if (remainder < FRACTION_TOLERANCE) return String(whole);

  for (const [amount, symbol] of FRACTIONS) {
    if (Math.abs(remainder - amount) < FRACTION_TOLERANCE) {
      return whole > 0 ? `${whole}${symbol}` : symbol;
    }
  }

  // ไม่ตรงเศษส่วนไหน — ปัดทศนิยมตำแหน่งเดียวพอ ครัวไม่ได้ชั่งละเอียดขนาดนั้น
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * คูณปริมาณในข้อความวัตถุดิบตามตัวคูณที่ให้มา
 * "หมูสับ 300 กรัม" ×2 → "หมูสับ 600 กรัม"
 *
 * แตะเฉพาะตัวเลขในรายการวัตถุดิบ ซึ่งเกือบทั้งหมดคือปริมาณอยู่แล้ว
 */
export function scaleIngredient(text: string, factor: number): string {
  if (factor === 1) return text;

  return text.replace(QUANTITY_RE, (raw) => {
    const value = parseQuantity(raw);
    if (!Number.isFinite(value) || value <= 0) return raw;
    return formatQuantity(value * factor);
  });
}
