"use client";

import { useEffect } from "react";

/**
 * กันจอดับระหว่างทำอาหาร — มือเปื้อนแล้วปลดล็อกจอใหม่ยาก
 *
 * Wake Lock จะถูกปล่อยอัตโนมัติเมื่อผู้ใช้สลับแท็บหรือย่อแอป
 * จึงต้องขอใหม่ทุกครั้งที่กลับมาหน้าจอ ไม่งั้นขอครั้งเดียวแล้วหลุดถาวร
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    // Safari เก่า / เบราว์เซอร์ที่ไม่รองรับ — ข้ามไปเงียบ ๆ ไม่ใช่ฟีเจอร์บังคับ
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        // unmount ระหว่างรอ await — ปล่อยทิ้งทันที ไม่งั้นจอค้างไม่ดับ
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // ระบบปฏิเสธได้ เช่น แบตต่ำ หรือหน้าไม่ได้ active — ปล่อยผ่าน
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
