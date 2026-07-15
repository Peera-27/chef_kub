export type CookingMode = "classic" | "fusion" | "anime";
export type ImageStyle = "photo" | "anime";

// tags ถูกใช้เป็น filter chips ใน RecipesView — ต้องเป็นชุดคำตายตัว
// ไม่งั้นโมเดลสร้างคำใหม่ทุกครั้งแล้วกรองอะไรไม่ได้เลย
export const RECIPE_TAGS = [
  "ทำง่าย",
  "เร็ว",
  "จานเดียว",
  "เผ็ด",
  "ไม่เผ็ด",
  "มังสวิรัติ",
  "โปรตีนสูง",
  "คอมฟอร์ตฟู้ด",
  "ฟิวชั่น",
  "แปลกใหม่",
  "จากอนิเมะ",
] as const;

interface CookingModeConfig {
  id: CookingMode;
  emoji: string;
  label: string;
  hint: string;
  /** ยิ่งสูงยิ่งกล้าเสนอเมนูแปลก */
  temperature: number;
  imageStyle: ImageStyle;
  promptBlock: string;
}

export const COOKING_MODES: CookingModeConfig[] = [
  {
    id: "classic",
    emoji: "🍳",
    label: "ปกติ",
    hint: "เมนูคุ้นเคย ทำได้ชัวร์",
    temperature: 0.7,
    imageStyle: "photo",
    promptBlock: `สไตล์เมนู: อาหารบ้าน ๆ ที่คนไทยคุ้นเคย ทำได้จริงในครัวทั่วไป
เน้นรสชาติที่ลงตัวมากกว่าความแปลกใหม่ ไม่ต้องใส่ inspiration`,
  },
  {
    id: "fusion",
    emoji: "🌏",
    label: "ฟิวชั่น",
    hint: "จับอาหารสองชาติมาชนกัน",
    temperature: 1.0,
    imageStyle: "photo",
    promptBlock: `สไตล์เมนู: ฟิวชั่น — จับวัตถุดิบที่มีมาข้ามวัฒนธรรมอาหาร เช่น ไทย×ญี่ปุ่น ไทย×อิตาเลียน เกาหลี×เม็กซิกัน
- กล้าเสนอเมนูที่ไม่เคยเห็นในร้านทั่วไป แต่รสชาติต้องเข้ากันได้จริง
- อธิบายเหตุผลที่รสชาติเข้ากันไว้ในฟิลด์ note (ห้ามใส่ใน instructions)
- inspiration ให้เขียนว่าผสมอาหารชาติไหนกับชาติไหน เช่น "ไทย × ญี่ปุ่น"`,
  },
  {
    id: "anime",
    emoji: "🍜",
    label: "จากอนิเมะ",
    hint: "เมนูที่โผล่ในอนิเมะ/ซีรีส์",
    temperature: 1.0,
    imageStyle: "anime",
    promptBlock: `สไตล์เมนู: เมนูที่ปรากฏในอนิเมะ ภาพยนตร์ หรือซีรีส์
- เลือกเฉพาะเรื่องที่มีอยู่จริงและเป็นที่รู้จักกว้าง ๆ ห้ามแต่งชื่อเรื่องหรือชื่อตัวละครขึ้นมาเอง
- ถ้าเมนูในเรื่องต้องใช้วัตถุดิบที่ผู้ใช้ไม่มี ให้ดัดแปลงสูตรด้วยวัตถุดิบที่มี
  แล้วอธิบายว่าดัดแปลงตรงไหนไว้ในฟิลด์ note (ห้ามใส่ใน instructions)
- inspiration ให้เขียนเป็น "ชื่อเมนูในเรื่อง — ชื่อเรื่อง" เช่น "ราเมงอิจิรากุ — Naruto"
- ทุกเมนูต้องมี tag "จากอนิเมะ"`,
  },
];

export const DEFAULT_COOKING_MODE: CookingMode = "classic";

export function getCookingMode(id: CookingMode): CookingModeConfig {
  return COOKING_MODES.find((mode) => mode.id === id) ?? COOKING_MODES[0];
}
