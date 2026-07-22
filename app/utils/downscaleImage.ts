/**
 * ย่อรูปก่อนส่งเข้า server action
 *
 * รูปจากกล้องมือถือทุกวันนี้ 12MP ขึ้นไป กลายเป็น data URL ~4-6MB ต่อใบ ซึ่ง:
 *   - ชนเพดาน request body ของโฮสต์ฟรีหลายเจ้า (บางเจ้าจำกัดแถว 4.5MB)
 *   - Gemini vision คิดค่าใช้จ่ายตามขนาดรูป จ่ายแพงโดยไม่ได้ความแม่นเพิ่ม
 *   - อัปโหลดบนเน็ตมือถือช้าจนผู้ใช้คิดว่าแอปค้าง
 *
 * ย่อแล้วไม่เสียความแม่น เพราะ YOLO letterbox ลงเหลือ 640×640 อยู่แล้ว
 * (ดู MODEL_SIZE ใน lib/yolo/runYoloDetection.ts) พิกเซลส่วนเกินถูกโยนทิ้ง
 * ตั้งแต่ต้นทางไม่ว่าจะย่อหรือไม่ — 1024 จึงเหลือเฟือทั้งกับ YOLO และ Gemini
 * และยังใหญ่พอใช้เป็น training data ต่อได้
 */

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.85;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
    img.src = src;
  });
}

/**
 * คืน data URL ที่ย่อแล้ว — ถ้าย่อไม่สำเร็จคืนของเดิมไป ผู้ใช้จะได้ไม่ติดอยู่กับที่
 * (แค่ไฟล์ใหญ่ ไม่ใช่ใช้งานไม่ได้)
 */
export async function downscaleImage(base64Url: string): Promise<string> {
  try {
    const img = await loadImage(base64Url);
    const { naturalWidth: srcW, naturalHeight: srcH } = img;

    if (srcW === 0 || srcH === 0) return base64Url;

    // ไม่ขยายรูปที่เล็กอยู่แล้ว — scale เกิน 1 มีแต่ทำให้ไฟล์บวมโดยไม่ได้อะไร
    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));

    // เล็กพออยู่แล้วและเป็น JPEG อยู่แล้ว — encode ซ้ำมีแต่เสียคุณภาพฟรี ๆ
    if (scale === 1 && base64Url.startsWith("data:image/jpeg")) {
      return base64Url;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return base64Url;

    // JPEG ไม่มี alpha — PNG โปร่งใสที่ไม่ได้ถมพื้นก่อนจะกลายเป็นพื้นดำ
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch (error) {
    console.error("downscale error:", error);
    return base64Url;
  }
}
