import { RefObject, useEffect, useRef } from "react";
import { LabelPickerModal } from "../LabelPickerModal";
import { resolveClassId } from "../../utils/resolveClassId";
import type { ClassEntry } from "../../utils/classRegistry";
import { ImageItem } from "../../utils/types";
import { imagePixelsToCanvas } from "../../utils/toYoloBBox";
interface EditImageViewProps {
  editingImage: ImageItem;
  currentRect: { x: number; y: number; w: number; h: number } | null;
  labelPickerOpen: boolean;
  editingBoxIndex: number | null;
  classOptions: ClassEntry[];
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
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
  currentRect,
  labelPickerOpen,
  editingBoxIndex,
  classOptions,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDone,
  onSelectLabel,
  onCancelLabel,
  onClassesChange,
  onEditBox,
  onRemoveBox,
  onImageMetrics,
}: EditImageViewProps) {
  const boxes = editingImage.boxes ?? [];
  const invalidCount = boxes.filter(
    (b) => resolveClassId(b.label) === null,
  ).length;
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = localCanvasRef.current;
    if (!canvas || !editingImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgW = editingImage.imageWidth;
    const imgH = editingImage.imageHeight;

    if (!imgW || !imgH) return;

    if (canvas.width !== imgW || canvas.height !== imgH) {
      canvas.width = imgW;
      canvas.height = imgH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดกรอบเดิมที่มีอยู่แล้ว (สีเขียว/ส้ม)
    editingImage.boxes?.forEach((box) => {
      const display = imagePixelsToCanvas(
        box,
        imgW,
        imgH,
        canvas.width,
        canvas.height,
      );
      const valid = resolveClassId(box.label) !== null;
      ctx.strokeStyle = valid ? "#10b981" : "#f59e0b";
      ctx.lineWidth = Math.max(2, Math.round(imgW / 200));
      ctx.strokeRect(display.x, display.y, display.w, display.h);
      ctx.fillStyle = valid ? "#10b981" : "#f59e0b";
      const fontSize = Math.max(12, Math.round(imgW / 40));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(box.label, display.x, display.y - 5);
    });

    // วาดเส้นประสีฟ้าตอนกำลังลาก
    if (currentRect) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = Math.max(2, Math.round(imgW / 200)); // ✅ กันเส้นบางเกินไปจนมองไม่เห็นบน PC
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.w,
        currentRect.h,
      );
      ctx.setLineDash([]);
    }
  }, [currentRect, editingImage]);

  return (
    <div className="flex flex-col items-center fade-in">
      <p className="text-sm md:text-base text-[var(--color-muted)] mb-4 text-center px-4">
        วาดกรอบรอบวัตถุดิบแล้วเลือกชื่อจากรายการ
      </p>

      {/* Image + canvas: responsive height */}
      <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-md ring-2 ring-[var(--color-brand)]/40 w-fit mx-auto max-w-full md:max-w-xl">
        <img
          src={editingImage.url}
          alt="แก้ไข"
          draggable={false}
          /* ปรับความกว้างให้ยืดหยุ่นตามสัดส่วนภาพจริง ไม่บังคับ w-full */
          className="block h-auto max-w-full max-h-[50vh] md:max-h-[60vh] opacity-50 select-none object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              onImageMetrics(img.naturalWidth, img.naturalHeight);
            }
          }}
        />
        <canvas
          ref={localCanvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 z-10 cursor-crosshair touch-none select-none w-full h-full"
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
                    valid
                      ? "bg-[var(--color-success-soft)]"
                      : "bg-[var(--color-warn-soft)] ring-1 ring-[var(--color-warn)]/30"
                  }`}
                >
                  <span
                    className={`font-medium ${valid ? "text-[var(--color-ink)]" : "text-[var(--color-warn)]"}`}
                  >
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
