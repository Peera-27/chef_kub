"use client";

import { MotionConfig } from "motion/react";

/**
 * reducedMotion="user" ทำให้ Motion ตัด transform/layout animation ทิ้งเอง
 * เมื่อผู้ใช้ตั้ง prefers-reduced-motion — เหลือแค่ opacity
 *
 * จำเป็นเพราะ media query ใน globals.css คุมได้แค่ CSS animation
 * ส่วนที่ Motion สั่งผ่าน JS ไม่ได้อยู่ใต้ media query นั้น
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
