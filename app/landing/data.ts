import { labelThMap } from "../utils/labelsTh";

/**
 * กรอบตรวจจับจริง — ได้จากการรัน public/model/v2 (ตัวเดียวกับที่แอปใช้) บนรูปในหน้านี้
 * ด้วย letterbox 640 + threshold 0.5 แบบเดียวกับ lib/yolo/runYoloDetection.ts
 * หน่วยเป็น % ของรูป ถ้าเปลี่ยนรูปหรือเปลี่ยนโมเดล ต้องรันใหม่ อย่าแก้ตัวเลขเอง
 */
export const EGG_BOXES = [
  { score: 0.87, x: 48.7, y: 57.9, w: 19.1, h: 28.7 },
  { score: 0.83, x: 28.4, y: 49.9, w: 19.0, h: 32.5 },
  { score: 0.82, x: 69.4, y: 63.3, w: 21.5, h: 30.3 },
  { score: 0.8, x: 10.9, y: 47.5, w: 16.7, h: 28.2 },
  { score: 0.71, x: 0, y: 37.5, w: 11.8, h: 34.4 },
];

/* ===== ของที่โมเดลรู้จัก จัดกลุ่มจากคลาสจริงใน metadata.yaml =====
   นับจากชื่อไทยที่ไม่ซ้ำ (หลายคลาสแปลเป็นชื่อเดียวกัน เช่น Lemon/Lime = มะนาว) */
const GROUP_OF: Record<string, string> = {};
const groups: { id: string; name: string; photo: string; alt: string; keys: string[] }[] = [
  {
    id: "leaf",
    name: "ผักใบและสมุนไพร",
    photo: "/photos/thai-market-vegetables-01.webp",
    alt: "แผงผักในตลาดธานินทร์ เชียงใหม่ มีพริก มะเขือเทศ ต้นหอม ตะไคร้ และมะเขือเปราะ",
    keys: ["Bethu ko Saag", "Coriander -Dhaniya-", "Garden cress-Chamsur ko saag-", "Green Mint -Pudina-", "Moringa Leaves -Sajyun ko Munta-", "Onion Leaves", "Palak -Indian Spinach-", "Palungo -Nepali Spinach-", "Rayo ko Saag", "Tori ko Saag", "Taro Leaves -Karkalo-", "Stinging Nettle -Sisnu-", "Fiddlehead Ferns -Niguro-", "Gundruk", "Cabbage", "Broccoli", "Cauliflower", "Asparagus -Kurilo-", "Bamboo Shoots -Tama-", "seaweed"],
  },
  {
    id: "veg",
    name: "ผักผล หัว และเห็ด",
    photo: "/photos/onion-and-a-group-of-vegetables-on.webp",
    alt: "หอมแดงผ่าครึ่งวางบนเขียงไม้ ข้างหลังเป็นผักใบและพริกไทย",
    keys: ["Akabare Khursani", "Chili Pepper -Khursani-", "Ash Gourd -Kubhindo-", "Artichoke", "Beetroot", "Bitter Gourd", "Bottle Gourd -Lauka-", "Brinjal", "Green Brinjal", "Capsicum", "Carrot", "Cassava -Ghar Tarul-", "Chayote-iskus-", "Corn", "Cucumber", "Farsi ko Munta", "Garlic", "Ginger", "Okra -Bhindi-", "Onion", "Pointed Gourd -Chuche Karela-", "Potato", "Pumpkin -Farsi-", "Radish", "Snake Gourd -Chichindo-", "Sponge Gourd -Ghiraula-", "Sweet Potato -Suthuni-", "Taro Root-Pidalu-", "Tomato", "Tree Tomato -Rukh Tamatar-", "Turnip", "Mushroom", "Sajjyun -Moringa Drumsticks-", "Long Beans -Bodi-"],
  },
  {
    id: "meat",
    name: "เนื้อสัตว์ ไข่ และปลา",
    photo: "/photos/thai-fish-market-unsplash.webp",
    alt: "ปลาสดในกะละมังสีเขียวที่ตลาด ป้ายเขียนว่าตัวละ 70 บาท",
    keys: ["Bacon", "Beef", "Buff Meat", "Chicken", "Chicken Gizzards", "Crab Meat", "Egg", "Fish", "Ham", "Minced Meat", "Mutton", "Pork", "Sausage"],
  },
  {
    id: "fruit",
    name: "ผลไม้",
    photo: "/photos/exotic-asian-fruit-market.webp",
    alt: "เงาะ มังคุด และส้มในกระด้งที่ตลาด มองจากด้านบน",
    keys: ["Apple", "Avocado", "Banana", "Jack Fruit", "Lapsi -Nepali Hog Plum-", "Lemon -Nimbu-", "Lime -Kagati-", "Orange", "Papaya", "Pear", "Strawberry", "Water Melon"],
  },
  {
    id: "dry",
    name: "ถั่ว ข้าว เส้น และเต้าหู้",
    photo: "/photos/dried-broad-beans.webp",
    alt: "ถั่วปากอ้าแห้งเต็มเฟรม",
    keys: ["Beans", "Black Lentils", "Black beans", "Broad Beans -Bakullo-", "Chickpeas", "Garden Peas", "Green Lentils", "Green Peas", "Green Soyabean -Hariyo Bhatmas-", "Pea", "Rahar ko Daal", "Red Beans", "Red Lentils", "Soyabean -Bhatmas-", "Yellow Lentils", "Beaten Rice -Chiura-", "Rice -Chamal-", "Wheat", "Chowmein Noodles", "Thukpa Noodles", "noodle", "Bread", "Cornflakec", "Masyaura", "Nutrela -Soya Chunks-", "Tofu", "Wallnut"],
  },
  {
    id: "pantry",
    name: "นม ซอส และเครื่องปรุง",
    photo: "/photos/ingredients-for-pad-thai.webp",
    alt: "ถาดเครื่องผัดไทย มีถั่วงอก กุยช่าย เต้าหู้ ไข่ และถ้วยเครื่องปรุงเล็ก ๆ",
    keys: ["Butter", "Cheese", "Milk", "Paneer", "Chili Powder", "Cinnamon", "Ice", "Ketchup", "Olive Oil", "Salt", "Soy Sauce", "Sugar", "mayonnaise", "kimchi"],
  },
];
for (const g of groups) for (const k of g.keys) GROUP_OF[k] = g.id;

const unique = (keys: string[]) => [...new Set(keys.map((k) => labelThMap[k] ?? k))];

export const KNOWN_GROUPS = groups.map((g) => {
  const names = unique(g.keys);
  return { id: g.id, name: g.name, photo: g.photo, alt: g.alt, count: names.length, names };
});

/** จำนวนชื่อไทยที่ไม่ซ้ำทั้งหมดที่โมเดลรู้จัก */
export const KNOWN_TOTAL = unique(Object.keys(labelThMap)).length;

// ทุกคลาสต้องอยู่ในกลุ่มใดกลุ่มหนึ่งพอดี ไม่งั้นตัวเลขบนหน้าจะไม่ตรงกับโมเดล
const missing = Object.keys(labelThMap).filter((k) => !GROUP_OF[k]);
if (missing.length) throw new Error(`landing/data: ยังไม่ได้จัดกลุ่ม ${missing.join(", ")}`);
if (KNOWN_GROUPS.reduce((n, g) => n + g.count, 0) < KNOWN_TOTAL)
  throw new Error("landing/data: ผลรวมของกลุ่มน้อยกว่าจำนวนชื่อทั้งหมด");

/** ของที่ยังไม่อยู่ในโมเดล — ครัวไทยใช้บ่อย และเป็นเป้าของการเทรนรอบถัดไป */
export const NOT_YET = ["ข่า", "ตะไคร้", "ใบมะกรูด", "ใบกะเพรา", "กุ้ง", "หมึก"];

/* ===== เมนูตัวอย่างของเดโมบนหน้าแรก =====
   ในแอปจริงสูตรมาจาก AI ตามของที่สแกนเจอ — ตรงนี้เป็นชุดเขียนไว้ล่วงหน้าเพื่อให้เดโมทำงานโดยไม่ต้องเรียก API */
export const PANTRY_EXTRAS = ["ต้นหอม", "หมูสับ", "มะเขือเทศ", "ข้าวสวย", "หัวหอม"] as const;
export type Extra = (typeof PANTRY_EXTRAS)[number];

export const EGG_MENUS: { name: string; minutes: number; needs: Extra[] }[] = [
  { name: "ไข่เจียว", minutes: 8, needs: [] },
  { name: "ไข่ดาวน้ำปลา", minutes: 5, needs: [] },
  { name: "ไข่ต้มยางมะตูม", minutes: 7, needs: [] },
  { name: "ไข่เจียวต้นหอม", minutes: 8, needs: ["ต้นหอม"] },
  { name: "ไข่ตุ๋นต้นหอม", minutes: 20, needs: ["ต้นหอม"] },
  { name: "ไข่เจียวหมูสับ", minutes: 10, needs: ["หมูสับ"] },
  { name: "ไข่ตุ๋นหมูสับ", minutes: 25, needs: ["หมูสับ", "ต้นหอม"] },
  { name: "ไข่ผัดมะเขือเทศ", minutes: 10, needs: ["มะเขือเทศ"] },
  { name: "แกงจืดมะเขือเทศหมูสับ", minutes: 20, needs: ["มะเขือเทศ", "หมูสับ"] },
  { name: "ข้าวไข่เจียว", minutes: 10, needs: ["ข้าวสวย"] },
  { name: "ข้าวผัดไข่", minutes: 12, needs: ["ข้าวสวย", "หัวหอม"] },
  { name: "ข้าวผัดหมูใส่ไข่", minutes: 15, needs: ["ข้าวสวย", "หมูสับ"] },
  { name: "ข้าวต้มหมูสับไข่", minutes: 20, needs: ["ข้าวสวย", "หมูสับ", "ต้นหอม"] },
  { name: "ยำไข่ดาว", minutes: 15, needs: ["มะเขือเทศ", "หัวหอม"] },
  { name: "ไข่เจียวหัวหอม", minutes: 8, needs: ["หัวหอม"] },
];

/** เมนูที่ทำได้จากของที่เลือก — เมนูที่ใช้ของที่เลือกได้มากที่สุดขึ้นก่อน */
export function menusFor(selected: readonly Extra[]) {
  return EGG_MENUS.filter((m) => m.needs.every((n) => selected.includes(n))).sort(
    (a, b) => b.needs.length - a.needs.length || a.minutes - b.minutes,
  );
}
