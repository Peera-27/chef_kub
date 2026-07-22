import { useCallback, useRef } from "react";
import * as tf from "@tensorflow/tfjs";

/**
 * โหลดโมเดล YOLO แบบ lazy — เริ่มโหลดตอนผู้ใช้จะสแกนจริงเท่านั้น
 *
 * เดิมโหลดตอน mount ทำให้คนที่แค่เปิดดูหน้าเว็บเฉย ๆ ต้องดาวน์โหลดน้ำหนัก 11MB
 * ทิ้งเปล่า ๆ ซึ่งบนเน็ตมือถือคือรอเป็นสิบวินาทีโดยไม่ได้ใช้อะไรเลย
 */

/** ต่ำกว่านี้ inference หนึ่งรูปกินเวลาหลายสิบวินาที รอไม่ไหว */
const USABLE_BACKENDS = new Set(["webgl", "webgpu"]);

export function useYoloModel() {
  /* เก็บเป็น promise ไม่ใช่ผลลัพธ์ เพราะถ้าผู้ใช้กดสแกนรูปที่สองระหว่างที่รูปแรก
     ยังโหลดโมเดลไม่เสร็จ ต้องให้เกาะ promise เดิม ไม่ใช่สั่งโหลด 11MB ซ้ำ */
  const pending = useRef<Promise<tf.GraphModel | null> | null>(null);

  const ensureModel = useCallback((): Promise<tf.GraphModel | null> => {
    if (!pending.current) {
      pending.current = loadModel().catch((error) => {
        console.error("Model load error", error);
        // ปล่อยให้ลองใหม่รอบหน้าได้ ไม่ใช่พังถาวรทั้ง session
        pending.current = null;
        return null;
      });
    }
    return pending.current;
  }, []);

  /** ยังไม่เคยสั่งโหลด = รอบนี้จะต้องดาวน์โหลด 11MB — ใช้เลือกข้อความรอให้ตรงความจริง */
  const isFirstLoad = useCallback(() => pending.current === null, []);

  return { ensureModel, isFirstLoad };
}

async function loadModel(): Promise<tf.GraphModel | null> {
  // ต้องรอ backend ลงทะเบียนเสร็จก่อน ไม่งั้น getBackend() ยังตอบไม่ตรง
  await tf.ready();

  const backend = tf.getBackend();
  if (!USABLE_BACKENDS.has(backend)) {
    /* WebGL ใช้ไม่ได้ (มือถือเก่า / GPU โดน blacklist) tfjs จะตกไปใช้ CPU เงียบ ๆ
       ซึ่ง YOLO 640×640 บน CPU มือถือกินเวลาหลายสิบวินาทีต่อรูป — ผู้ใช้นึกว่าแอปค้าง
       ข้ามไปเลยดีกว่า เพราะ Gemini เป็นตัวตัดสินสุดท้ายอยู่แล้ว ไม่มี YOLO ก็ยังใช้งานได้ครบ */
    console.warn(
      `TensorFlow.js ได้ backend "${backend}" ซึ่งช้าเกินกว่าจะรัน YOLO บนเครื่องผู้ใช้ — ข้ามไปใช้ Gemini อย่างเดียว`,
    );
    return null;
  }

  const model = await tf.loadGraphModel("/model/model.json");

  /* warmup: ยิงรูปเปล่าเข้าไปหนึ่งครั้งให้ shader คอมไพล์เสร็จก่อน
     ไม่งั้นผู้ใช้จะไปเจอค่าคอมไพล์นั้นตอนสแกนรูปจริง

     ใช้ executeAsync ไม่ใช่ execute — ตัว sync บล็อก main thread จนหน้าค้าง
     บนเครื่องอ่อน ๆ และต้อง dispose ผลลัพธ์ด้วย ไม่ใช่แค่ input ไม่งั้น
     tensor ค้างใน GPU ตลอดอายุหน้าเว็บ */
  const dummyInput = tf.zeros([1, 640, 640, 3]);
  try {
    const warmup = await model.executeAsync(dummyInput);
    tf.dispose(warmup);
  } finally {
    tf.dispose(dummyInput);
  }

  return model;
}
