// dHash (difference hash) 64 bit — รูปที่คล้ายกัน (โดน resize/บีบอัด/แสงต่างเล็กน้อย)
// จะได้ hash ที่ต่างกันแค่ไม่กี่บิต ใช้เทียบความคล้ายด้วย Hamming distance ฝั่ง server

const GRID_W = 9;
const GRID_H = 8;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
    img.src = src;
  });
}

export async function perceptualHashBase64(base64Url: string): Promise<string> {
  const img = await loadImage(base64Url);

  const canvas = document.createElement("canvas");
  canvas.width = GRID_W;
  canvas.height = GRID_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("สร้าง canvas ไม่สำเร็จ");

  ctx.drawImage(img, 0, 0, GRID_W, GRID_H);
  const { data } = ctx.getImageData(0, 0, GRID_W, GRID_H);

  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  let hex = "";
  for (let row = 0; row < GRID_H; row++) {
    let byte = 0;
    for (let col = 0; col < GRID_W - 1; col++) {
      const left = gray[row * GRID_W + col];
      const right = gray[row * GRID_W + col + 1];
      byte = (byte << 1) | (left > right ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex; // 16 ตัวอักษร hex = 64 bit
}
