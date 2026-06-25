import { RefObject } from "react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
}

export function CameraView({ videoRef, onCapture }: CameraViewProps) {
  return (
    <div className="flex flex-col items-center gap-6 fade-in py-4 md:py-8">
      <p className="text-sm md:text-base text-[var(--color-muted)] text-center px-4">
        กล้องจัดให้เห็นวัตถุดิบชัดเจน แล้กดปุ่มถ่ายรูป
      </p>

      {/* Mobile: portrait 3/4, Tablet: wider, Desktop: max width */}
      <div className="w-full md:w-[480px] lg:w-[540px] aspect-[3/4] md:aspect-[4/3] bg-black rounded-[var(--radius-xl)] overflow-hidden shadow-lg md:shadow-xl relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Viewfinder corners */}
        <div className="absolute inset-6 md:inset-8 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 md:w-10 md:h-10 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 md:w-10 md:h-10 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 md:w-10 md:h-10 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
        </div>
        {/* Hint text */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-xs pointer-events-none">
          จัดวัตถุดิบให้อยู่ในกรอบ
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={onCapture}
          className="icon-btn w-[72px] h-[72px] md:w-[88px] md:h-[88px] lg:w-[96px] lg:h-[96px] bg-white border-[5px] md:border-[6px] border-[var(--color-brand)] rounded-full shadow-lg md:shadow-xl active:scale-90 transition-transform tap"
          aria-label="ถ่ายรูป"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-[var(--color-brand)] rounded-full" />
        </button>
      </div>
    </div>
  );
}
