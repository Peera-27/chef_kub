import { RefObject } from "react";
import { LabelPickerModal } from "../LabelPickerModal";
import { resolveClassId } from "../../utils/resolveClassId";
import type { ClassEntry } from "../../utils/classRegistry";
import { ImageItem } from "../../utils/types";

interface EditImageViewProps {
  editingImage: ImageItem;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  labelPickerOpen: boolean;
  editingBoxIndex: number | null;
  classOptions: ClassEntry[];
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onDone: () => void;
  onSelectLabel: (label: string) => void;
  onCancelLabel: () => void;
  onClassesChange: (classes: ClassEntry[]) => void;
  onEditBox: (index: number) => void;
  onRemoveBox: (index: number) => void;
  onImageMetrics: (width: number, height: number) => void;
}

export function EditImageView({
  editingImage,
  canvasRef,
  labelPickerOpen,
  editingBoxIndex,
  classOptions,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onDone,
  onSelectLabel,
  onCancelLabel,
  onClassesChange,
  onEditBox,
  onRemoveBox,
  onImageMetrics,
}: EditImageViewProps) {
  const boxes = editingImage.boxes ?? [];
  const invalidCount = boxes.filter((b) => resolveClassId(b.label) === null).length;

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-gray-400 mb-4 text-center">
        วาดกรอบรอบวัตถุดิบแล้วเลือกชื่อจากรายการ
      </p>

      <div className="relative rounded-2xl overflow-hidden shadow-md ring-2 ring-orange-400/60">
        <img
          src={editingImage.url}
          alt="แก้ไข"
          className="block max-w-full h-auto max-h-[50vh] opacity-50"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (canvasRef.current) {
              canvasRef.current.width = img.clientWidth;
              canvasRef.current.height = img.clientHeight;
            }
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              onImageMetrics(img.naturalWidth, img.naturalHeight);
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

      {boxes.length > 0 && (
        <div className="w-full mt-4 space-y-2">
          <p className="text-xs text-gray-400">
            กรอบที่ระบุ ({boxes.length})
            {invalidCount > 0 && (
              <span className="text-amber-600 ml-1">
                · {invalidCount} รายการต้องแก้ไข
              </span>
            )}
          </p>
          <ul className="space-y-2 max-h-36 overflow-y-auto">
            {boxes.map((box, index) => {
              const valid = resolveClassId(box.label) !== null;
              return (
                <li
                  key={`${index}-${box.label}`}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${
                    valid ? "bg-emerald-50" : "bg-amber-50 ring-1 ring-amber-200"
                  }`}
                >
                  <span className={valid ? "text-gray-800" : "text-amber-800"}>
                    {box.label || "(ยังไม่มีชื่อ)"}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditBox(index)}
                      className="px-2 py-1 text-xs rounded-lg bg-white/80 hover:bg-white"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBox(index)}
                      className="px-2 py-1 text-xs rounded-lg bg-white/80 hover:bg-white text-red-500"
                    >
                      ลบ
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        onClick={onDone}
        disabled={invalidCount > 0}
        className="btn-primary mt-6 w-full py-3.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        เสร็จสิ้น
      </button>

      <LabelPickerModal
        open={labelPickerOpen}
        title={editingBoxIndex !== null ? "แก้ไขชื่อวัตถุดิบ" : "เลือกวัตถุดิบ"}
        classOptions={classOptions}
        onSelect={onSelectLabel}
        onCancel={onCancelLabel}
        onClassesChange={onClassesChange}
      />
    </div>
  );
}
