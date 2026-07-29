"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  stream: MediaStream | null;
  onCapture: (video: HTMLVideoElement) => void;
  onCancel: () => void;
}

export function CameraView({ stream, onCapture, onCancel }: CameraViewProps) {
  const ring = useAnimationControls();
  const [flash, setFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ต่อ stream จากในคอมโพเนนต์นี้เอง ไม่ใช่จาก hook ข้างนอก
     เพราะ ViewTransition ใช้ mode="wait" — หน้านี้ mount ช้ากว่าที่กด "สแกน" ราว 150ms
     ถ้ารอบสองที่ permission ผ่านแล้ว getUserMedia resolve เร็วกว่านั้น
     effect ข้างนอกจะวิ่งตอน <video> ยังไม่เกิด แล้วไม่มีใครวิ่งซ้ำ = จอดำ
     ส่วน effect ในนี้การันตีว่าได้ element แน่นอน ไม่ว่า stream จะมาก่อนหรือหลัง mount */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => {
      // `autoPlay` ปกติจัดการให้อยู่แล้ว บางเบราว์เซอร์บนมือถือต้องสั่ง play เอง
      // และจะไปเริ่มเล่นเองหลังผู้ใช้แตะหน้าจอครั้งถัดไป
    });

    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    // เฟรมแรกยังไม่มา = ยังไม่มีอะไรให้ถ่าย กันภาพ 0x0 หลุดไปเข้าโมเดล
    if (!video || !video.videoWidth) return;

    /* สั่งริปเปิลด้วย JS ไม่ใช่ `active:` ของ Tailwind
       เพราะคลาสจาก :active จะหลุดทันทีที่ปล่อยนิ้ว อนิเมชัน 0.6s เลยโดนตัดกลางคัน
       แตะเร็ว ๆ จะเห็นแค่เสี้ยวเดียว เท่ากับแทบไม่มีผลตอบรับให้เห็นเลย */
    ring.set({ scale: 1, opacity: 0.5 });
    ring.start({
      scale: 2,
      opacity: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    });

    // แฟลชขาววาบบนภาพพรีวิว — บอกว่า "เก็บภาพนี้ไปแล้ว" แบบที่กล้องจริงทำ
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);

    onCapture(video);
  };

  return (
    <div className="flex flex-col items-center gap-6 slide-up py-5 md:py-8">
      <div className="flex w-full max-w-[540px] items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[var(--color-ink)]">ถ่ายวัตถุดิบ</h2>
          <p className="text-xs text-[var(--color-muted)]">
            ให้เห็นวัตถุดิบชัดและไม่ซ้อนกัน
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary min-h-11 px-4 text-sm"
        >
          ยกเลิก
        </button>
      </div>

      <p className="text-sm md:text-base text-[var(--color-muted)] text-center px-4">
        จัดวัตถุดิบให้อยู่ในกรอบ แล้วกดปุ่มถ่ายรูป
      </p>

      <div className="relative">
        <div className="w-full md:w-[480px] lg:w-[540px] aspect-[3/4] md:aspect-[4/3] bg-black rounded-[var(--radius-xl)] overflow-hidden shadow-lg md:shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-6 md:inset-8 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 md:w-10 md:h-10 border-t-2 border-l-2 border-white/60 rounded-tl-lg glow-pulse" />
            <div className="absolute top-0 right-0 w-8 h-8 md:w-10 md:h-10 border-t-2 border-r-2 border-white/60 rounded-tr-lg glow-pulse" />
            <div className="absolute bottom-0 left-0 w-8 h-8 md:w-10 md:h-10 border-b-2 border-l-2 border-white/60 rounded-bl-lg glow-pulse" />
            <div className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 border-b-2 border-r-2 border-white/60 rounded-br-lg glow-pulse" />
          </div>

          <AnimatePresence>
            {flash && (
              <motion.div
                key="shutter-flash"
                aria-hidden
                className="absolute inset-0 bg-white pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
            )}
          </AnimatePresence>

          <div className="absolute inset-0 rounded-[var(--radius-xl)] ring-1 ring-inset ring-white/10 pointer-events-none" />
        </div>

        {/* Fake scan bar */}
        <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-xl)] pointer-events-none md:inset-8">
          <div className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-white/10 to-transparent breathing" />
        </div>
      </div>

      <button
        onClick={handleCapture}
        className="icon-btn relative w-[76px] h-[76px] md:w-[90px] md:h-[90px] bg-white border-[5px] md:border-[6px] border-[var(--color-brand)] rounded-full shadow-lg md:shadow-xl active:scale-90 transition-transform tap"
        aria-label="ถ่ายรูป"
      >
        <span
          className="absolute inset-0 -z-10 rounded-full bg-[var(--color-brand-glow)] blur-md float-y"
          aria-hidden
        />
        {/* วงแหวนกระจายออก — อยู่หลังปุ่ม ส่วนที่โผล่พ้นขอบขาวคือส่วนที่เห็น */}
        <motion.span
          className="absolute inset-0 -z-10 rounded-full border-2 border-[var(--color-brand)]"
          initial={{ scale: 1, opacity: 0 }}
          animate={ring}
          aria-hidden
        />
        <div className="w-12 h-12 md:w-14 md:h-14 bg-[var(--color-brand)] rounded-full transition-transform" />
      </button>
      <p className="-mt-3 text-xs font-medium text-[var(--color-muted)]">
        แตะปุ่มเพื่อถ่าย
      </p>
    </div>
  );
}
