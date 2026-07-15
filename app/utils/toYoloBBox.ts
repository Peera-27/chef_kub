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
  return {
    x_center: (rect.x + rect.w / 2) / imageWidth,
    y_center: (rect.y + rect.h / 2) / imageHeight,
    width: rect.w / imageWidth,
    height: rect.h / imageHeight,
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
