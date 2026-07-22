"use client";

import { createPortal } from "react-dom";

/**
 * แขวน overlay ไว้ที่ <body> แทนที่จะฝังในตำแหน่งที่เรียกใช้
 *
 * จำเป็นเพราะคอนเทนเนอร์ของแต่ละหน้าอยู่ใน ViewTransition ซึ่งมี transform
 * ระหว่างสลับหน้า — และ transform ที่ไม่ใช่ none
 * จะกลายเป็น containing block ของ position: fixed ข้างใน
 * ผลคือ overlay ไปอิงความสูงของเนื้อหาแทน viewport แล้วโผล่ท้ายหน้าจนต้องเลื่อนหา
 */
export function Portal({ children }: { children: React.ReactNode }) {
  // ตอน SSR ยังไม่มี document — คืน null ไปก่อน
  // ไม่เกิด hydration mismatch เพราะ overlay ทุกตัวเปิดจากการกดของผู้ใช้
  // ซึ่งเกิดหลัง hydrate เสมอ (ตอนเรนเดอร์ครั้งแรกยังปิดอยู่ = เรนเดอร์ null ทั้งสองฝั่ง)
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
