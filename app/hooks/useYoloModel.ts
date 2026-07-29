import { useCallback, useRef } from "react";
/* import type เท่านั้น — ถูกลบทิ้งตอน compile จึงไม่ดึง tfjs (~1.2MB) เข้า bundle
   ตัวไลบรารีจริงโหลดด้วย dynamic import ใน loadModel() ข้างล่าง */
import type * as tf from "@tensorflow/tfjs";

/**
 * โหลดโมเดล YOLO แบบ lazy — เริ่มโหลดตอนผู้ใช้จะสแกนจริงเท่านั้น
 *
 * เดิมโหลดตอน mount ทำให้คนที่แค่เปิดดูหน้าเว็บเฉย ๆ ต้องดาวน์โหลดน้ำหนัก 11MB
 * ทิ้งเปล่า ๆ ซึ่งบนเน็ตมือถือคือรอเป็นสิบวินาทีโดยไม่ได้ใช้อะไรเลย
 */

/** ต่ำกว่านี้ inference หนึ่งรูปกินเวลาหลายสิบวินาที รอไม่ไหว */
const USABLE_BACKENDS = new Set(["webgl", "webgpu"]);

/* v2 = น้ำหนักชุดเดียวกับ v1 เป๊ะ ๆ แค่เก็บเป็น float16 แทน float32 → 10.8MB เหลือ 5.4MB
   (สร้างด้วย scripts/quantize-model.ts) tfjs คลายกลับเป็น float32 ให้เองตอนโหลด */
const MODEL_VERSIONS = ["v2", "v1"] as const;
type ModelVersion = (typeof MODEL_VERSIONS)[number];
const DEFAULT_MODEL_VERSION: ModelVersion = "v2";

/**
 * เลือกเวอร์ชันน้ำหนักจาก ?model=v1 ได้ — มีไว้เทียบ v1/v2 บนเครื่องจริงโดยไม่ต้อง deploy ใหม่
 * จำเป็นเพราะบน iPhone เปิด devtools ไม่ได้ถ้าไม่มี Mac ต้องเทียบด้วยการถ่ายรูปเดิมสองรอบเอา
 *
 * ต้องเช็คกับรายชื่อที่อนุญาต ไม่ใช่เอาค่าจาก URL ไปต่อ path ตรง ๆ
 * ไม่งั้นใครก็ส่ง ?model=../.. มาชี้ให้โหลดไฟล์อะไรก็ได้เข้ามารันเป็นโมเดล
 */
export function getModelVersion(): ModelVersion {
  if (typeof window === "undefined") return DEFAULT_MODEL_VERSION;
  const requested = new URLSearchParams(window.location.search).get("model");
  return MODEL_VERSIONS.includes(requested as ModelVersion)
    ? (requested as ModelVersion)
    : DEFAULT_MODEL_VERSION;
}

/** คืนค่าเฉพาะตอนถูกบังคับให้ใช้เวอร์ชันที่ไม่ใช่ค่าปกติ — เอาไว้โชว์ให้คนเทสรู้ว่าสลับติดจริง */
export function getModelVersionOverride(): ModelVersion | null {
  const version = getModelVersion();
  return version === DEFAULT_MODEL_VERSION ? null : version;
}

export function useYoloModel() {
  /* เก็บเป็น promise ไม่ใช่ผลลัพธ์ เพราะถ้าผู้ใช้กดสแกนรูปที่สองระหว่างที่รูปแรก
     ยังโหลดโมเดลไม่เสร็จ ต้องให้เกาะ promise เดิม ไม่ใช่สั่งโหลด 11MB ซ้ำ */
  const pending = useRef<Promise<tf.GraphModel | null> | null>(null);
  /* แยกจาก pending เพราะตั้งแต่มี prefetch แล้ว "สั่งโหลดไปแล้ว" ไม่ได้แปลว่า
     "โหลดเสร็จแล้ว" อีกต่อไป — ข้อความรอต้องดูตัวนี้ ไม่ใช่ดูว่า pending ว่างหรือเปล่า */
  const settled = useRef(false);

  const ensureModel = useCallback((): Promise<tf.GraphModel | null> => {
    if (!pending.current) {
      pending.current = loadModel()
        .then((model) => {
          settled.current = true;
          return model;
        })
        .catch((error) => {
          console.error("Model load error", error);
          // ปล่อยให้ลองใหม่รอบหน้าได้ ไม่ใช่พังถาวรทั้ง session
          pending.current = null;
          return null;
        });
    }
    return pending.current;
  }, []);

  /* เรียกตอนผู้ใช้ "ส่อแวว" ว่ากำลังจะสแกน (เปิดกล้อง / เปิดตัวเลือกไฟล์) ไม่ใช่ตอนสแกนจริง —
     ช่วงที่ผู้ใช้เล็งกล้องหรือไล่หารูปคือเวลาว่างหลายวินาทีที่เอามาโหลด 11MB คู่ขนานได้ฟรี ๆ
     ต่างจาก ensureModel ตรงที่ไม่มีใครรอผลอันนี้ — โหลดไม่ทันก็แค่ไปรอต่อที่ ensureModel เหมือนเดิม
     (ensureModel กลืน error เองอยู่แล้ว ตรงนี้จึงไม่มี unhandled rejection) */
  const prefetchModel = useCallback(() => {
    void ensureModel();
  }, [ensureModel]);

  /** โหลดเสร็จแล้วหรือยัง — ถ้ายัง แปลว่ารอบนี้ผู้ใช้ต้องรอดาวน์โหลดจริง ใช้เลือกข้อความรอ */
  const isModelReady = useCallback(() => settled.current, []);

  return { ensureModel, prefetchModel, isModelReady };
}

async function loadModel(): Promise<tf.GraphModel | null> {
  /* โหลดไลบรารีตรงนี้ ไม่ใช่บนหัวไฟล์ — tfjs หนัก ~1.2MB (ก่อนบีบอัด) ถ้า import
     แบบ static มันจะติดไปกับ bundle ก้อนแรกที่ทุกคนต้องโหลดตอนเปิดหน้า ทั้งที่
     คนที่ไม่กดสแกนไม่ได้ใช้เลย
     backend-webgl ต้อง import ให้ลงทะเบียนตัวเองก่อนเรียก tf.ready() */
  const [tfjs] = await Promise.all([
    import("@tensorflow/tfjs"),
    import("@tensorflow/tfjs-backend-webgl"),
  ]);

  // ต้องรอ backend ลงทะเบียนเสร็จก่อน ไม่งั้น getBackend() ยังตอบไม่ตรง
  await tfjs.ready();

  const backend = tfjs.getBackend();
  if (!USABLE_BACKENDS.has(backend)) {
    /* WebGL ใช้ไม่ได้ (มือถือเก่า / GPU โดน blacklist) tfjs จะตกไปใช้ CPU เงียบ ๆ
       ซึ่ง YOLO 640×640 บน CPU มือถือกินเวลาหลายสิบวินาทีต่อรูป — ผู้ใช้นึกว่าแอปค้าง
       ข้ามไปเลยดีกว่า เพราะ Gemini เป็นตัวตัดสินสุดท้ายอยู่แล้ว ไม่มี YOLO ก็ยังใช้งานได้ครบ */
    console.warn(
      `TensorFlow.js ได้ backend "${backend}" ซึ่งช้าเกินกว่าจะรัน YOLO บนเครื่องผู้ใช้ — ข้ามไปใช้ Gemini อย่างเดียว`,
    );
    return null;
  }

  /* path มีเลขเวอร์ชันเพราะไฟล์ชุดนี้ถูกแคชแบบ immutable หนึ่งปี (public/_headers)
     เปลี่ยนน้ำหนักเมื่อไหร่ "ต้อง" ขึ้นเลขใหม่แล้วเพิ่มใน MODEL_VERSIONS — ถ้าทับไฟล์เดิม
     เครื่องที่เคยเข้าเว็บแล้วจะใช้ของเก่าต่อไปเงียบ ๆ โดยไม่มี error ให้เห็น

     ถ้าเจอว่า v2 ตรวจจับแย่ลง เปลี่ยน DEFAULT_MODEL_VERSION เป็น "v1" ได้ทันที ไฟล์ยังอยู่ครบ */
  const version = getModelVersion();
  const model = await tfjs.loadGraphModel(`/model/${version}/model.json`);

  /* warmup: ยิงรูปเปล่าเข้าไปหนึ่งครั้งให้ shader คอมไพล์เสร็จก่อน
     ไม่งั้นผู้ใช้จะไปเจอค่าคอมไพล์นั้นตอนสแกนรูปจริง

     ใช้ executeAsync ไม่ใช่ execute — ตัว sync บล็อก main thread จนหน้าค้าง
     บนเครื่องอ่อน ๆ และต้อง dispose ผลลัพธ์ด้วย ไม่ใช่แค่ input ไม่งั้น
     tensor ค้างใน GPU ตลอดอายุหน้าเว็บ */
  const dummyInput = tfjs.zeros([1, 640, 640, 3]);
  try {
    const warmup = await model.executeAsync(dummyInput);
    tfjs.dispose(warmup);
  } finally {
    tfjs.dispose(dummyInput);
  }

  return model;
}
