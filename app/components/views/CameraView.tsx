import { RefObject } from "react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
}

export function CameraView({ videoRef, onCapture }: CameraViewProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <button
        onClick={onCapture}
        className="icon-btn w-[72px] h-[72px] bg-white border-[5px] border-orange-400 rounded-full shadow-md"
        aria-label="ถ่ายรูป"
      />
    </div>
  );
}
