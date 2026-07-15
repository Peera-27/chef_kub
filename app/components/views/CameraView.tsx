import { RefObject } from "react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
}

export function CameraView({ videoRef, onCapture }: CameraViewProps) {
  return (
    <div className="flex flex-col items-center gap-6 slide-up py-5 md:py-8">
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
          <div className="absolute inset-0 rounded-[var(--radius-xl)] ring-1 ring-inset ring-white/10 pointer-events-none" />
        </div>

        {/* Fake scan bar */}
        <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-xl)] pointer-events-none md:inset-8">
          <div className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-white/10 to-transparent breathing" />
        </div>
      </div>

      <button
        onClick={onCapture}
        className="icon-btn relative w-[76px] h-[76px] md:w-[90px] md:h-[90px] bg-white border-[5px] md:border-[6px] border-[var(--color-brand)] rounded-full shadow-lg md:shadow-xl active:scale-90 active:ripple transition-transform tap"
        aria-label="ถ่ายรูป"
      >
        <span
          className="absolute inset-0 -z-10 rounded-full bg-[var(--color-brand-glow)] blur-md float-y"
          aria-hidden
        />
        <div className="w-12 h-12 md:w-14 md:h-14 bg-[var(--color-brand)] rounded-full transition-transform" />
      </button>
    </div>
  );
}
