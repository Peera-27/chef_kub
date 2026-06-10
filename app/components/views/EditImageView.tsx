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
      <p className="text-xs text-gray-500 mb-2">วาดกรอบรอบวัตถุดิบแล้วใส่ชื่อ</p>
      <div className="relative rounded-lg overflow-hidden border-2 border-orange-400">
        <img
          src={editingImage.url}
          alt="แก้ไข"
          className="block max-w-full h-auto max-h-[60vh] opacity-60"
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
      <button
        onClick={onDone}
        className="cursor-pointer mt-6 w-full py-3 bg-orange-500 text-white rounded-xl font-bold"
      >
        เสร็จสิ้น
      </button>
    </div>
  );
}
