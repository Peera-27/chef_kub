export interface PixelBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface YoloBBox {
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

export function normalizePixelRect(box: PixelBBox): PixelBBox {
  let { x, y, w, h } = box;
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  return { x, y, w, h };
}

export function toYoloBBoxFromImagePixels(
  box: PixelBBox,
  imageWidth: number,
  imageHeight: number,
): YoloBBox {
  const rect = normalizePixelRect(box);

  /* ตัดส่วนที่ล้นออกนอกภาพทิ้งก่อน normalize
     ผู้ใช้ลากกรอบเลยขอบรูปได้ (ไม่มีอะไรกั้นใน EditImageView) ถ้าปล่อยผ่าน
     จะได้พิกัดติดลบหรือเกิน 1 ซึ่งผิดสเปก YOLO — เครื่องมือเทรนบางตัว error
     ทิ้งทั้งไฟล์ บางตัวรับไว้เงียบ ๆ แล้วโมเดลเรียนจากกรอบเพี้ยน
     ต้อง clip เป็นสี่เหลี่ยมจริง ไม่ใช่ clamp แค่จุดกึ่งกลาง ไม่งั้นกรอบจะบิด */
  const left = Math.max(0, rect.x);
  const top = Math.max(0, rect.y);
  const right = Math.min(imageWidth, rect.x + rect.w);
  const bottom = Math.min(imageHeight, rect.y + rect.h);

  const w = Math.max(0, right - left);
  const h = Math.max(0, bottom - top);

  return {
    x_center: (left + w / 2) / imageWidth,
    y_center: (top + h / 2) / imageHeight,
    width: w / imageWidth,
    height: h / imageHeight,
  };
}

export function yoloToImagePixels(
  yolo: YoloBBox,
  imageWidth: number,
  imageHeight: number,
): PixelBBox {
  const w = yolo.width * imageWidth;
  const h = yolo.height * imageHeight;
  return {
    x: yolo.x_center * imageWidth - w / 2,
    y: yolo.y_center * imageHeight - h / 2,
    w,
    h,
  };
}

export function imagePixelsToCanvas(
  box: PixelBBox,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): PixelBBox {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  return {
    x: box.x * scaleX,
    y: box.y * scaleY,
    w: box.w * scaleX,
    h: box.h * scaleY,
  };
}
