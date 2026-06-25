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
    <div className="flex flex-col items-center fade-in">
      <p className="text-sm md:text-base text-[var(--color-muted)] mb-4 text-center px-4">
        วาดกรอบรอบวัตถุดิบแล้วเลือกชื่อจากรายการ
      </p>

      {/* Image + canvas: responsive height */}
      <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-md ring-2 ring-[var(--color-brand)]/40 w-full md:max-w-xl">
        <img
          src={editingImage.url}
          alt="แก้ไข"
          className="block w-full h-auto max-h-[50vh] md:max-h-[60vh] opacity-50"
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
          className="absolute inset-0 z-10 cursor-crosshair touch-none w-full h-full"
        />
      </div>

      {boxes.length > 0 && (
        <div className="w-full mt-4 space-y-2 md:max-w-xl">
          <div className="flex justify-between items-center">
            <p className="text-xs text-[var(--color-muted)]">
              กรอบที่ระบุ ({boxes.length})
            </p>
            {invalidCount > 0 && (
              <span className="pill bg-[var(--color-warn-soft)] text-[var(--color-warn)]">
                {invalidCount} รายการต้องแก้ไข
              </span>
            )}
          </div>
          <ul className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto no-scrollbar">
            {boxes.map((box, index) => {
              const valid = resolveClassId(box.label) !== null;
              return (
                <li
                  key={`${index}-${box.label}`}
                  className={`flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-3 md:px-4 md:py-3 text-sm ${
                    valid ? "bg-[var(--color-success-soft)]" : "bg-[var(--color-warn-soft)] ring-1 ring-[var(--color-warn)]/30"
                  }`}
                >
                  <span className={`font-medium ${valid ? "text-[var(--color-ink)]" : "text-[var(--color-warn)]"}`}>
                    {box.label || "(ยังไม่มีชื่อ)"}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditBox(index)}
                      className="px-3 py-2 text-xs rounded-lg bg-white/80 hover:bg-white text-[var(--color-ink)] transition-colors tap"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBox(index)}
                      className="px-3 py-2 text-xs rounded-lg bg-white/80 hover:bg-white text-red-500 transition-colors tap"
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
        className="btn-primary mt-6 w-full md:max-w-xl py-4 md:py-5 font-bold tap"
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
