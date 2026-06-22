import { RefObject } from "react";
import { ImageItem } from "../../utils/types";

interface EditImageViewProps {
  editingImage: ImageItem;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onDone: () => void;
}

export function EditImageView({
  editingImage,
  canvasRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onDone,
}: EditImageViewProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-gray-400 mb-4 text-center">
        วาดกรอบรอบวัตถุดิบแล้วใส่ชื่อ
      </p>
      <div className="relative rounded-2xl overflow-hidden shadow-md ring-2 ring-orange-400/60">
        <img
          src={editingImage.url}
          alt="แก้ไข"
          className="block max-w-full h-auto max-h-[60vh] opacity-50"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (canvasRef.current) {
              canvasRef.current.width = img.clientWidth;
              canvasRef.current.height = img.clientHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
          className="absolute inset-0 z-10 cursor-crosshair touch-none"
        />
      </div>
      <button onClick={onDone} className="btn-primary mt-8 w-full py-3.5 font-bold">
        เสร็จสิ้น
      </button>
    </div>
  );
}
