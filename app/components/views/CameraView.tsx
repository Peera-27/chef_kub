import { RefObject } from "react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
}

export function CameraView({ videoRef, onCapture }: CameraViewProps) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <button
        onClick={onCapture}
        className="w-16 h-16 bg-white border-4 border-orange-400 rounded-full cursor-pointer active:scale-90 transition-transform"
      />
    </div>
  );
}
