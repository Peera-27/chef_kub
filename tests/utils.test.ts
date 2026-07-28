import { describe, expect, test } from "bun:test";

import {
  isRecipeImagePath,
  recipeImagePath,
  recipeImageUrl,
} from "../app/lib/recipeImageCache";
import { formatDuration, parseStepDuration } from "../app/utils/parseStepDuration";
import { scaleIngredient } from "../app/utils/scaleIngredient";
import { mergeIngredients } from "../app/utils/mergeIngredients";
import { getActiveIngredients } from "../app/utils/activeIngredients";
import { findSimilarLabels, normalizeLabelName } from "../app/utils/normalizeLabel";
import {
  normalizePixelRect,
  toYoloBBoxFromImagePixels,
  yoloToImagePixels,
  type PixelBBox,
} from "../app/utils/toYoloBBox";

describe("isRecipeImagePath — ด่านกัน path traversal", () => {
  const valid = `photo/${"a".repeat(64)}.jpg`;

  test("ยอมรับ path ที่ recipeImagePath สร้างเอง", () => {
    expect(isRecipeImagePath(recipeImagePath("ผัดกะเพรา", "photo"))).toBe(true);
    expect(isRecipeImagePath(recipeImagePath("ผัดกะเพรา", "anime"))).toBe(true);
    expect(isRecipeImagePath(valid)).toBe(true);
  });

  test("ปฏิเสธการไถออกนอก prefix", () => {
    expect(isRecipeImagePath("../secret.jpg")).toBe(false);
    expect(isRecipeImagePath("photo/../../etc/passwd")).toBe(false);
    expect(isRecipeImagePath(`photo/${"a".repeat(64)}.jpg/../x`)).toBe(false);
    expect(isRecipeImagePath("sessionid/xxx.jpg")).toBe(false);
    expect(isRecipeImagePath("")).toBe(false);
  });

  test("ปฏิเสธ hash ผิดรูปแบบ", () => {
    expect(isRecipeImagePath(`photo/${"a".repeat(63)}.jpg`)).toBe(false);
    expect(isRecipeImagePath(`photo/${"a".repeat(65)}.jpg`)).toBe(false);
    expect(isRecipeImagePath(`photo/${"A".repeat(64)}.jpg`)).toBe(false); // ตัวใหญ่
    expect(isRecipeImagePath(`photo/${"g".repeat(64)}.jpg`)).toBe(false); // ไม่ใช่ hex
    expect(isRecipeImagePath(`photo/${"a".repeat(64)}.png`)).toBe(false);
  });

  test("newline หลอก regex ไม่ได้", () => {
    expect(isRecipeImagePath(`photo/${"a".repeat(64)}.jpg\n../evil`)).toBe(false);
    expect(isRecipeImagePath(`\nphoto/${"a".repeat(64)}.jpg`)).toBe(false);
  });

  test("ชื่อเมนูเดียวกันได้ path เดิมเสมอ (แคชชนกันได้จริง)", () => {
    expect(recipeImagePath("ผัดกะเพรา", "photo")).toBe(
      recipeImagePath("  ผัดกะเพรา  ", "photo"),
    );
    expect(recipeImagePath("Pad Kaprao", "photo")).toBe(
      recipeImagePath("pad   kaprao", "photo"),
    );
  });

  test("สไตล์ต่างกันต้องได้คนละรูป", () => {
    expect(recipeImagePath("ผัดกะเพรา", "photo")).not.toBe(
      recipeImagePath("ผัดกะเพรา", "anime"),
    );
  });

  test("URL ที่สร้างชี้เข้า route ที่ถูกต้อง", () => {
    expect(recipeImageUrl(valid)).toBe(`/api/recipe-image/${valid}`);
  });
});

describe("parseStepDuration", () => {
  test("ดึงเวลาจากขั้นตอนปกติ", () => {
    expect(parseStepDuration("ผัดไฟกลาง 3 นาที")).toBe(180);
    expect(parseStepDuration("ต้มน้ำ 10 นาที")).toBe(600);
    expect(parseStepDuration("พัก 30 วินาที")).toBe(30);
    expect(parseStepDuration("อบ 1.5 ชั่วโมง")).toBe(5400);
    expect(parseStepDuration("ตุ๋น 2 ชม")).toBe(7200);
  });

  test("ช่วงเวลาใช้ค่าน้อย (เตือนเร็วดีกว่าไหม้)", () => {
    expect(parseStepDuration("ทอด 3-4 นาที")).toBe(180);
    expect(parseStepDuration("ทอด 3–4 นาที")).toBe(180);
    expect(parseStepDuration("ทอด 3~4 นาที")).toBe(180);
  });

  test("ไม่มีเวลา → null", () => {
    expect(parseStepDuration("ล้างผักให้สะอาด")).toBeNull();
    expect(parseStepDuration("")).toBeNull();
  });

  test("สั้น/ยาวเกินกว่าจะจับเวลา → null", () => {
    expect(parseStepDuration("พัก 2 วินาที")).toBeNull();
    expect(parseStepDuration("หมักข้ามคืน 12 ชั่วโมง")).toBeNull();
  });

  test("0 นาที ไม่ควรกลายเป็นตัวจับเวลา", () => {
    expect(parseStepDuration("ผัด 0 นาที")).toBeNull();
  });
});

describe("formatDuration", () => {
  test("ต่ำกว่าชั่วโมงแสดง m:ss", () => {
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  test("เกินชั่วโมงต้องแยกหลักชั่วโมง", () => {
    expect(formatDuration(5400)).toBe("1:30:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  test("ศูนย์", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
});

describe("scaleIngredient", () => {
  test("factor 1 ไม่แตะข้อความ", () => {
    expect(scaleIngredient("หมูสับ 300 กรัม", 1)).toBe("หมูสับ 300 กรัม");
  });

  test("คูณจำนวนเต็ม", () => {
    expect(scaleIngredient("หมูสับ 300 กรัม", 2)).toBe("หมูสับ 600 กรัม");
    expect(scaleIngredient("ไข่ไก่ 2 ฟอง", 3)).toBe("ไข่ไก่ 6 ฟอง");
  });

  test("ครึ่งหนึ่งได้เศษส่วนอ่านง่าย", () => {
    expect(scaleIngredient("น้ำปลา 1 ช้อนโต๊ะ", 0.5)).toBe("น้ำปลา ½ ช้อนโต๊ะ");
    expect(scaleIngredient("น้ำตาล 3 ช้อนชา", 0.5)).toBe("น้ำตาล 1½ ช้อนชา");
  });

  test("รับเศษส่วนที่เขียนมาแต่แรก", () => {
    expect(scaleIngredient("เกลือ 1/2 ช้อนชา", 2)).toBe("เกลือ 1 ช้อนชา");
    expect(scaleIngredient("เกลือ 1 1/2 ช้อนชา", 2)).toBe("เกลือ 3 ช้อนชา");
  });

  test("ไม่ทำให้ปริมาณหายไปเป็นศูนย์", () => {
    // ปริมาณน้อย ๆ ที่ถูกหารแล้วต้องยังเหลือค่าอ่านได้ ไม่ใช่ "0"
    const result = scaleIngredient("เกลือ 1 ช้อนชา", 0.25);
    expect(result).not.toBe("เกลือ 0 ช้อนชา");
  });
});

describe("mergeIngredients", () => {
  test("รวมชื่อซ้ำเหลือรายการเดียว", () => {
    const merged = mergeIngredients([
      { name: "ไข่ไก่", source: "yolo" },
      { name: "ไข่ไก่", source: "gemini" },
      { name: "หมูสับ", source: "gemini" },
    ]);
    expect(merged).toHaveLength(2);
  });

  test("เก็บรายการแรกไว้ (yolo ชนะ gemini เมื่อชื่อซ้ำ)", () => {
    const merged = mergeIngredients([
      { name: "ไข่ไก่", source: "yolo" },
      { name: "ไข่ไก่", source: "gemini" },
    ]);
    expect(merged[0].source).toBe("yolo");
  });

  test("รายการว่าง", () => {
    expect(mergeIngredients([])).toEqual([]);
  });
});

describe("getActiveIngredients", () => {
  const gallery = [
    {
      id: "scan-1",
      url: "data:image/jpeg;base64,test",
      items: [{ name: "chicken drumstick", source: "yolo" as const }],
    },
  ];

  test("combines Gallery and selected history ingredients", () => {
    expect(getActiveIngredients(gallery, ["egg", "onion"])).toEqual([
      "chicken drumstick",
      "egg",
      "onion",
    ]);
  });

  test("falls back to Gallery when all selected history items are removed", () => {
    const historyItems = ["egg", "onion"];
    const afterRemovingEgg = historyItems.filter((name) => name !== "egg");
    const afterRemovingOnion = afterRemovingEgg.filter(
      (name) => name !== "onion",
    );

    expect(getActiveIngredients(gallery, afterRemovingOnion)).toEqual([
      "chicken drumstick",
    ]);
    expect(gallery[0].items.map((item) => item.name)).toEqual([
      "chicken drumstick",
    ]);
  });

  test("deduplicates names shared by Gallery and history", () => {
    expect(
      getActiveIngredients(gallery, ["chicken drumstick", "egg", "egg"]),
    ).toEqual(["chicken drumstick", "egg"]);
  });

  test("is empty only when both sources are empty", () => {
    expect(getActiveIngredients([], [])).toEqual([]);
    expect(getActiveIngredients([], null)).toEqual([]);
  });
});

describe("normalizeLabelName / findSimilarLabels", () => {
  test("normalize ช่องว่างและตัวพิมพ์", () => {
    expect(normalizeLabelName("  ไข่   ไก่  ")).toBe("ไข่ ไก่");
    expect(normalizeLabelName("Egg")).toBe("egg");
  });

  test("หา label ที่คล้ายกันเจอ", () => {
    const existing = ["ไข่ไก่", "หมูสับ", "พริกหวาน"];
    expect(findSimilarLabels("ไข่ไก่", existing)).toContain("ไข่ไก่");
    expect(findSimilarLabels("ไข่", existing)).toContain("ไข่ไก่");
  });

  test("input ว่างไม่ควร match ทุกอย่าง", () => {
    expect(findSimilarLabels("", ["ไข่ไก่", "หมูสับ"])).toEqual([]);
    expect(findSimilarLabels("   ", ["ไข่ไก่", "หมูสับ"])).toEqual([]);
  });
});

describe("toYoloBBox — พิกัดที่กลายเป็น training data", () => {
  test("กรอบกลางภาพได้ 0.5, 0.5", () => {
    const yolo = toYoloBBoxFromImagePixels({ x: 25, y: 25, w: 50, h: 50 }, 100, 100);
    expect(yolo.x_center).toBeCloseTo(0.5);
    expect(yolo.y_center).toBeCloseTo(0.5);
    expect(yolo.width).toBeCloseTo(0.5);
    expect(yolo.height).toBeCloseTo(0.5);
  });

  test("แปลงไปกลับต้องได้ค่าเดิม", () => {
    const box = { x: 10, y: 20, w: 30, h: 40 };
    const back = yoloToImagePixels(toYoloBBoxFromImagePixels(box, 200, 300), 200, 300);
    expect(back.x).toBeCloseTo(box.x);
    expect(back.y).toBeCloseTo(box.y);
    expect(back.w).toBeCloseTo(box.w);
    expect(back.h).toBeCloseTo(box.h);
  });

  test("ลากกรอบย้อนทิศ (w/h ติดลบ) ต้องถูกกลับด้านให้", () => {
    expect(normalizePixelRect({ x: 50, y: 50, w: -20, h: -30 })).toEqual({
      x: 30,
      y: 20,
      w: 20,
      h: 30,
    });
  });

  /* ผู้ใช้ลากกรอบเลยขอบรูปได้ ไม่มีอะไรกั้นใน EditImageView
     ทุกเคสต้องอยู่ในกรอบ 0..1 ทั้งตัวเลขเองและขอบทั้งสี่ด้าน */
  const outOfBounds: ReadonlyArray<readonly [string, PixelBBox]> = [
    ["ล้นซ้ายบนไปไกล", { x: -50, y: -50, w: 60, h: 60 }],
    ["ล้นขวาล่าง", { x: 80, y: 80, w: 60, h: 60 }],
    ["ล้นซ้ายอย่างเดียว", { x: -20, y: 10, w: 50, h: 50 }],
    ["ล้นบนอย่างเดียว", { x: 10, y: -20, w: 50, h: 50 }],
    ["ใหญ่กว่ารูปทั้งใบ", { x: -10, y: -10, w: 200, h: 200 }],
    ["ลากย้อนทิศแล้วล้นขอบ", { x: 20, y: 20, w: -60, h: -60 }],
  ];

  for (const [name, box] of outOfBounds) {
    test(`กรอบ${name}ต้องถูกตัดให้อยู่ใน 0..1`, () => {
      const y = toYoloBBoxFromImagePixels(box, 100, 100);

      expect(y.width).toBeGreaterThanOrEqual(0);
      expect(y.height).toBeGreaterThanOrEqual(0);
      expect(y.width).toBeLessThanOrEqual(1);
      expect(y.height).toBeLessThanOrEqual(1);

      // ขอบทั้งสี่ด้านต้องไม่ทะลุออกนอกรูป
      expect(y.x_center - y.width / 2).toBeGreaterThanOrEqual(0);
      expect(y.x_center + y.width / 2).toBeLessThanOrEqual(1);
      expect(y.y_center - y.height / 2).toBeGreaterThanOrEqual(0);
      expect(y.y_center + y.height / 2).toBeLessThanOrEqual(1);
    });
  }

  test("กรอบที่อยู่ในรูปทั้งหมดต้องไม่ถูกตัด", () => {
    const y = toYoloBBoxFromImagePixels({ x: 10, y: 10, w: 50, h: 50 }, 100, 100);
    expect(y.x_center).toBeCloseTo(0.35);
    expect(y.width).toBeCloseTo(0.5);
  });
});
