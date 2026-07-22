"use client";

import { useAnimationControls } from "motion/react";

/**
 * จังหวะเด้งของปุ่มหัวใจ — ใช้ร่วมกันทุกการ์ดเมนูให้รู้สึกเป็นปุ่มเดียวกัน
 *
 * สั่งเล่นตรงๆ แทนที่จะ toggle state แล้วตั้ง timeout ถอดคลาสออก
 * ทำให้กดรัวๆ เล่นซ้ำได้ทันที ไม่ต้องรอรอบก่อนหน้าหมดอายุ
 */
export function useHeartPop() {
  const controls = useAnimationControls();

  const pop = () =>
    controls.start({
      scale: [1, 1.4, 0.9, 1],
      transition: { duration: 0.45, times: [0, 0.35, 0.6, 1] },
    });

  return { controls, pop };
}
