"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "../utils/parseStepDuration";
import { IconClock } from "./Icons";

interface StepTimerProps {
  seconds: number;
}

/** เสียงเตือนสั้น ๆ สร้างสด ไม่ต้องแนบไฟล์เสียงมากับโปรเจกต */
function playAlarm() {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    // บี๊บ 3 ครั้ง — ครั้งเดียวกลืนไปกับเสียงในครัว
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.4;

      osc.frequency.value = 880;
      // ไล่ระดับลงแทนตัดห้วน ๆ ไม่งั้นได้ยินเสียง "ป๊อก" ตอนจบ
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    }

    setTimeout(() => ctx.close(), 1600);
  } catch {
    // เบราว์เซอร์บล็อกเสียง — ยังมีการสั่นกับ UI เป็นตัวเตือนอยู่
  }
}

export function StepTimer({ seconds }: StepTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  // เก็บเวลาสิ้นสุดจริง แทนการลบทีละวินาที — ย่อแอปแล้วเวลาจะได้ไม่เพี้ยน
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);

      if (left === 0) {
        setRunning(false);
        setFinished(true);
        deadlineRef.current = null;
        playAlarm();
        navigator.vibrate?.([200, 100, 200]);
      }
    };

    // เดินทุก 250ms ให้ตัวเลขเปลี่ยนตรงจังหวะกว่ารอครบวินาที
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    deadlineRef.current = Date.now() + remaining * 1000;
    setFinished(false);
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => {
    setRunning(false);
    deadlineRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    deadlineRef.current = null;
    setRemaining(seconds);
  }, [seconds]);

  if (finished) {
    return (
      <div className="mt-2 ml-10 md:ml-12 flex items-center gap-2">
        <span className="pill gap-1.5 bg-[var(--color-success-soft)] text-[var(--color-success)] font-semibold">
          ⏰ ครบเวลาแล้ว
        </span>
        <button
          onClick={reset}
          className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-brand)] transition-colors px-2 py-1 tap"
        >
          จับใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 ml-10 md:ml-12 flex items-center gap-2">
      <button
        onClick={running ? pause : start}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 tap ${
          running
            ? "bg-[var(--color-brand)] text-white shadow-sm"
            : "bg-[var(--color-brand-soft)] text-[var(--color-brand)] hover:bg-[var(--color-brand-pale)]"
        }`}
      >
        <IconClock size={13} />
        <span className="tabular-nums">{formatDuration(remaining)}</span>
        <span className="opacity-80">{running ? "หยุด" : "จับเวลา"}</span>
      </button>

      {remaining !== seconds && (
        <button
          onClick={reset}
          className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-brand)] transition-colors px-2 py-1 tap"
        >
          รีเซ็ต
        </button>
      )}
    </div>
  );
}
