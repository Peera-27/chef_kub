export type Recipe = {
  name: string;
  ingredients: string[];
  instructions: string[];
  calories: string;
  tags: string[];
  readyInMinutes?: number;
  imageUrl?: string;
  // คำอธิบายจานเป็นภาษาอังกฤษ — โมเดลสร้างรูปอ่านภาษาไทยไม่ออก
  imagePrompt?: string;
  // ฟิลด์ใหม่เป็น optional เพราะเมนูโปรดที่เก็บใน localStorage ก่อนหน้านี้ยังไม่มี
  servings?: number;
  // ของที่ต้องซื้อเพิ่ม (ไม่นับเครื่องปรุงพื้นฐาน)
  extraIngredients?: string[];
  // ที่มาของเมนู เช่น "ไทย × ญี่ปุ่น" หรือ "ราเมงอิจิรากุ — Naruto"
  inspiration?: string;
  // หมายเหตุของเชฟ เช่น เหตุผลที่รสเข้ากัน หรือดัดแปลงตรงไหน — ไม่ใช่ขั้นตอนทำอาหาร
  note?: string;
};
