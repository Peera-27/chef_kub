"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  stream: MediaStream | null;
  onCapture: (video: HTMLVideoElement) => void;
  onCancel: () => void;
  /** ขอ stream ใหม่จาก getUserMedia ทั้งก้อน — ใช้ตอนกล้องนิ่งจนกู้ด้วยการ play() ซ้ำไม่ขึ้น */
  onRetry: () => void;
}

/* layout จอเล็กกับจอใหญ่ mount CameraView ไว้พร้อมกันทั้งคู่ ตัวที่ไม่ตรง breakpoint
   ถูกซ่อนด้วย display:none (ยังอยู่ใน DOM) — ตัวที่ถูกซ่อนต้องไม่แตะ stream เลย
   เพราะ MediaStream ก้อนเดียวผูกกับ <video> สองตัวไม่ได้จริงทุกเบราว์เซอร์:
   Safari/iOS ให้แค่ตัวที่ผูกทีหลังเล่น อีกตัวดำ ซึ่งอาจเป็นตัวที่ผู้ใช้กำลังมองอยู่ */
const isHiddenByLayout = (el: HTMLElement) =>
  el.offsetWidth === 0 && el.offsetHeight === 0;

type PreviewStatus = "waiting" | "live" | "stalled";

export function CameraView({
  stream,
  onCapture,
  onCancel,
  onRetry,
}: CameraViewProps) {
  const ring = useAnimationControls();
  const [flash, setFlash] = useState(false);
  /* ผูกสถานะไว้กับ stream ที่วัดมา ไม่ใช่เก็บสถานะลอย ๆ — พอได้ stream ก้อนใหม่
     สถานะเก่าจะถูกมองเป็น "waiting" ทันทีตอน render ไม่ต้อง setState ใน effect ให้ render ซ้อน */
  const [measured, setMeasured] = useState<{
    of: MediaStream | null;
    status: PreviewStatus;
  }>({ of: null, status: "waiting" });
  const status: PreviewStatus =
    stream && measured.of === stream ? measured.status : "waiting";
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ต่อ stream จากในคอมโพเนนต์นี้เอง ไม่ใช่จาก hook ข้างนอก
     เพราะ ViewTransition ใช้ mode="wait" — หน้านี้ mount ช้ากว่าที่กด "สแกน" ราว 150ms
     ถ้ารอบสองที่ permission ผ่านแล้ว getUserMedia resolve เร็วกว่านั้น
     effect ข้างนอกจะวิ่งตอน <video> ยังไม่เกิด แล้วไม่มีใครวิ่งซ้ำ = จอดำ
     ส่วน effect ในนี้การันตีว่าได้ element แน่นอน ไม่ว่า stream จะมาก่อนหรือหลัง mount */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (isHiddenByLayout(video)) return;

    const track = stream.getVideoTracks()[0];
    let attempts = 0;
    let lastTime = 0;
    let stillTicks = 0;
    let reported: PreviewStatus | null = null;

    // แจ้งเฉพาะตอนสถานะเปลี่ยนจริง ไม่งั้น watchdog จะ setState ทุก 700ms ทั้งที่ภาพปกติ
    const setStatus = (next: PreviewStatus) => {
      if (reported === next) return;
      reported = next;
      setMeasured({ of: stream, status: next });
    };

    const attach = () => {
      attempts += 1;
      if (video.srcObject !== stream) video.srcObject = stream;
      void video.play().catch(() => {
        // `autoPlay` ปกติจัดการให้อยู่แล้ว บางเบราว์เซอร์บนมือถือต้องสั่ง play เอง
        // ถ้าพลาดจริง watchdog ข้างล่างจะเรียกซ้ำให้ แล้วค่อยขึ้นปุ่มให้ผู้ใช้กด
      });
    };

    attach();

    /* ไม่เชื่อว่า play() ไม่ throw แล้วจะมีภาพ — เคสที่พังบ่อยสุดคือกล้องรอบก่อน
       ยังปล่อยอุปกรณ์ไม่เสร็จ แล้วได้ track ที่ muted กลับมาแบบไม่มี error เลย
       ต้องวัดจาก currentTime ว่าเฟรมเดินจริงไหม แล้วกู้เองเป็นขั้น ๆ */
    const watchdog = window.setInterval(() => {
      const dead = !track || track.readyState === "ended";
      const moving = video.videoWidth > 0 && video.currentTime !== lastTime;
      lastTime = video.currentTime;

      if (!dead && moving) {
        stillTicks = 0;
        setStatus("live");
        return;
      }

      stillTicks += 1;
      // ~2.8s แล้วยังไม่ขยับ = กู้เองไม่ได้ ให้ผู้ใช้กดขอกล้องใหม่
      if (dead || stillTicks > 4) {
        setStatus("stalled");
        return;
      }
      if (attempts < 3) attach();
    }, 700);

    // ปลดล็อกปุ่มชัตเตอร์ทันทีที่เฟรมเริ่มเดิน ไม่ต้องรอ watchdog ตื่นรอบถัดไป
    const onTimeUpdate = () => {
      if (video.videoWidth > 0) setStatus("live");
    };

    // track ที่เกิดมาแบบ muted จะยิง unmute ตอนเฟรมแรกมาถึง — ผูกใหม่ให้ทันที
    const onUnmute = () => {
      attempts = 0;
      stillTicks = 0;
      attach();
    };
    const onEnded = () => setStatus("stalled");

    /* iOS หยุดเล่นวิดีโอเองตอนสลับแอป/ล็อกจอ กลับมาแล้ว <video> ค้างเฟรมเดิม
       ต้องสั่ง play() ใหม่ ไม่มีใครทำให้ */
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      attempts = 0;
      stillTicks = 0;
      attach();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    track?.addEventListener("unmute", onUnmute);
    track?.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(watchdog);
      video.removeEventListener("timeupdate", onTimeUpdate);
      track?.removeEventListener("unmute", onUnmute);
      track?.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    // เฟรมแรกยังไม่มา = ยังไม่มีอะไรให้ถ่าย กันภาพ 0x0 หลุดไปเข้าโมเดล
    if (!video || !video.videoWidth || status !== "live") return;

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
    /* จอมือถือ: สูงเท่าที่พื้นที่มีให้ แล้วให้ช่องพรีวิวเป็นตัวยืด/ยุบเอง
       ปุ่มถ่ายจึงอยู่ในจอตลอด ไม่ต้องเลื่อนลงไปหา — md ขึ้นไปกลับไปวางตามความสูงเนื้อหาเหมือนเดิม */
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 slide-up md:flex-none md:gap-6 md:py-8">
      <div className="flex w-full max-w-[540px] shrink-0 items-center justify-between gap-3">
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

      {/* จอมือถือซ่อนไว้ — บรรทัดใต้หัวข้อบอกไปแล้ว และพื้นที่ทุก px เอาไปให้ช่องพรีวิวดีกว่า */}
      <p className="hidden md:block text-base text-[var(--color-muted)] text-center px-4">
        จัดวัตถุดิบให้อยู่ในกรอบ แล้วกดปุ่มถ่ายรูป
      </p>

      {/* จอมือถือ: กล่องนี้กินความสูงที่เหลือทั้งหมด (flex-1) — md ขึ้นไปกลับไปล็อกสัดส่วน 4:3
          <video> วางแบบ absolute ไม่ใช่ h-full เพราะ % ความสูงไม่ resolve เมื่อความสูงพ่อมาจาก flex */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[var(--radius-xl)] bg-black shadow-lg md:aspect-[4/3] md:w-[480px] md:flex-none md:shadow-xl lg:w-[540px]">
        <div className="absolute inset-0">
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

          {/* จอดำต้องบอกได้ว่ากำลังรออยู่หรือพังแล้ว ไม่ปล่อยให้เดาเอง */}
          {status !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
              {status === "waiting" ? (
                <>
                  <span
                    className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  <p className="text-sm text-white/80">กำลังเปิดกล้อง...</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">
                    ภาพจากกล้องไม่ขึ้น
                  </p>
                  <p className="text-xs text-white/70">
                    กล้องอาจยังถูกใช้ค้างจากการถ่ายรอบก่อน
                  </p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="btn-primary min-h-11 px-5 text-sm"
                  >
                    เปิดกล้องใหม่
                  </button>
                </>
              )}
            </div>
          )}

          <div className="absolute inset-0 rounded-[var(--radius-xl)] ring-1 ring-inset ring-white/10 pointer-events-none" />
        </div>

        {/* Fake scan bar */}
        <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-xl)] pointer-events-none md:inset-8">
          <div className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-white/10 to-transparent breathing" />
        </div>
      </div>

      <button
        onClick={handleCapture}
        disabled={status !== "live"}
        className="icon-btn relative shrink-0 w-[68px] h-[68px] md:w-[90px] md:h-[90px] bg-white border-[5px] md:border-[6px] border-[var(--color-brand)] rounded-full shadow-lg md:shadow-xl active:scale-90 transition-transform tap disabled:opacity-45"
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
        <div className="w-11 h-11 md:w-14 md:h-14 bg-[var(--color-brand)] rounded-full transition-transform" />
      </button>
      {/* จอมือถือซ่อนไว้ — ปุ่มกลมใหญ่กลางจอสื่อชัดพออยู่แล้ว */}
      <p className="hidden md:block -mt-3 text-xs font-medium text-[var(--color-muted)]">
        แตะปุ่มเพื่อถ่าย
      </p>
    </div>
  );
}
