import {
  EquipmentCategory,
  KitchenSettings,
} from "@/app/types/kitchen";

export const equipmentCategories: EquipmentCategory[] = [
  {
    id: "heating",
    name: "อุปกรณ์ให้ความร้อน",
    icon: "🔥",
    description: "อุปกรณ์สำหรับให้ความร้อนและปรุงอาหาร",
    items: [
      { id: "gas-stove", name: "เตาแก๊ส", important: true },
      { id: "electric-stove", name: "เตาไฟฟ้า" },
      { id: "induction-stove", name: "เตาแม่เหล็กไฟฟ้า" },
      { id: "oven", name: "เตาอบ", important: true },
      { id: "microwave", name: "ไมโครเวฟ" },
      { id: "air-fryer", name: "หม้อทอดไร้น้ำมัน", important: true },
      { id: "rice-cooker", name: "หม้อหุงข้าว" },
      { id: "electric-pot", name: "หม้อไฟฟ้า" },
      { id: "electric-pan", name: "กระทะไฟฟ้า" },
    ],
  },

  {
    id: "cooking",
    name: "อุปกรณ์ปรุงอาหาร",
    icon: "🍳",
    description: "อุปกรณ์สำหรับต้ม ผัด ทอด และนึ่ง",
    items: [
      { id: "pot", name: "หม้อ", important: true },
      { id: "pan", name: "กระทะ", important: true },
      { id: "deep-pan", name: "กระทะก้นลึก" },
      { id: "pressure-cooker", name: "หม้อแรงดัน" },
      { id: "steamer", name: "หม้อนึ่ง" },
      { id: "grill-pan", name: "กระทะย่าง" },
    ],
  },

  {
    id: "preparation",
    name: "อุปกรณ์เตรียมวัตถุดิบ",
    icon: "🔪",
    description: "อุปกรณ์สำหรับหั่น สับ บด และเตรียมวัตถุดิบ",
    items: [
      { id: "chef-knife", name: "มีดเชฟ", important: true },
      { id: "paring-knife", name: "มีดปอก" },
      { id: "cutting-board", name: "เขียง", important: true },
      { id: "mortar", name: "ครก" },
      { id: "pestle", name: "สาก" },
      { id: "blender", name: "เครื่องปั่น", important: true },
      { id: "food-processor", name: "เครื่องบดอาหาร" },
      { id: "food-chopper", name: "เครื่องสับอาหาร" },
      { id: "peeler", name: "ที่ปอกเปลือก" },
      { id: "grater", name: "ที่ขูด" },
    ],
  },

  {
    id: "mixing",
    name: "อุปกรณ์ผสมและตวง",
    icon: "🥣",
    description: "อุปกรณ์สำหรับผสมและเตรียมส่วนผสม",
    items: [
      { id: "mixing-bowl", name: "ชามผสม" },
      { id: "measuring-cup", name: "ถ้วยตวง" },
      { id: "measuring-spoon", name: "ช้อนตวง" },
      { id: "whisk", name: "ตะกร้อมือ" },
      { id: "rubber-spatula", name: "พายยาง" },
      { id: "strainer", name: "กระชอน" },
      { id: "tongs", name: "ที่คีบอาหาร" },
    ],
  },

  {
    id: "baking",
    name: "อุปกรณ์ทำขนม",
    icon: "🧁",
    description: "อุปกรณ์สำหรับทำขนมและเบเกอรี่",
    items: [
      { id: "stand-mixer", name: "เครื่องตีแป้ง" },
      { id: "hand-mixer", name: "เครื่องตีไข่" },
      { id: "cake-pan", name: "พิมพ์เค้ก" },
      { id: "baking-tray", name: "ถาดอบ" },
      { id: "rolling-pin", name: "ไม้คลึงแป้ง" },
      { id: "piping-bag", name: "ถุงบีบครีม" },
      { id: "cooling-rack", name: "ตะแกรงพักขนม" },
      { id: "kitchen-scale", name: "เครื่องชั่งดิจิทัล" },
    ],
  },
];

const STORAGE_KEY = "chef-kub-kitchen-settings";

export function loadKitchenSettings(): KitchenSettings {
  if (typeof window === "undefined") {
    return {
      equipment: [],
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {
        equipment: [],
      };
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !Array.isArray(parsed.equipment)
    ) {
      return {
        equipment: [],
      };
    }

    return {
      equipment: parsed.equipment,
    };
  } catch {
    return {
      equipment: [],
    };
  }
}

export function saveKitchenSettings(
  settings: KitchenSettings,
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(settings),
  );
}