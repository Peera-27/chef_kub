import type { Recipe } from "../types/recipe";
import { MAX_STARS, type CookRating } from "./types";

export type CardFormat = "feed" | "story";

interface FormatConfig {
  width: number;
  height: number;
  imageHeight: number;
  /** columns = วัตถุดิบซ้าย/วิธีทำขวา (ทรง 4:5) · stacked = เรียงลงมา (ทรง 9:16 สูง) */
  layout: "columns" | "stacked";
  bodySize: number;
}

export const CARD_FORMATS: Record<CardFormat, FormatConfig> = {
  // 4:5 คือสัดส่วนสูงสุดที่ฟีด Instagram รองรับ — สูงกว่า 1:1 อยู่ 270px
  // ทำให้ได้ทั้งรูปใหญ่และเนื้อหาครบ ไม่ต้องตัดไปกอง "และอีก X" เหมือนตอนเป็นจัตุรัส
  feed: {
    width: 1080,
    height: 1350,
    imageHeight: 560,
    layout: "columns",
    bodySize: 27,
  },
  story: {
    width: 1080,
    height: 1920,
    imageHeight: 980,
    layout: "stacked",
    bodySize: 31,
  },
};

// ล็อกสีให้ตรงกับ @theme ใน globals.css — canvas อ่าน CSS variable ไม่ได้
const BRAND = "#1f5f3f";
const INK = "#1a1a1a";
const MUTED = "#767c74";
const PAGE = "#f9f9f5";
const STAR = "#f5b642";

const PAD = 64;
const FOOTER_HEIGHT = 92;

/**
 * ตัดจบการรอที่อาจไม่มีวันจบ แล้วคืน fallback แทน
 *
 * จำเป็นจริง ๆ เพราะ API ฝั่งเบราว์เซอร์หลายตัว (img.onload, fonts.ready, toBlob)
 * มีสิทธิ์ไม่ยิง callback เลยในบางสถานการณ์ — ถ้าไม่กันไว้ ปุ่มจะค้าง
 * "กำลังสร้าง…" ตลอดกาลโดยไม่มี error ให้เห็นด้วยซ้ำ
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    promise.then(finish, () => finish(fallback));
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return withTimeout(
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    }),
    8000,
    // โหลดรูปไม่ทัน — วาดพื้นหลังไล่สีแทน ดีกว่าไม่ได้การ์ดเลย
    null,
  );
}

/**
 * ดาวห้าแฉกหนึ่งดวง จุดกึ่งกลาง (cx, cy) รัศมี r
 * วาดเองเพราะ emoji ⭐ เรนเดอร์ไม่เหมือนกันข้ามเครื่อง — บางเครื่องได้กล่องเปล่า
 */
function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  const inner = r * 0.44;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : inner;
    // เริ่มที่ -90° ให้แฉกบนชี้ตรงขึ้น
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** แถวดาว — ดวงที่ยังไม่ถึงคะแนนวาดเป็นเส้นขอบจาง ๆ ให้เห็นว่าเต็มสิบคือเท่าไร */
function drawStars(
  ctx: CanvasRenderingContext2D,
  rating: number,
  x: number,
  centerY: number,
  size: number,
) {
  const r = size / 2;
  const gap = size * 0.34;
  for (let i = 0; i < MAX_STARS; i++) {
    const cx = x + r + i * (size + gap);
    starPath(ctx, cx, centerY, r);
    if (i < rating) {
      ctx.fillStyle = STAR;
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

/** ครอบรูปให้เต็มกรอบแบบ object-fit: cover ไม่ให้ภาพยืด */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
  ctx.restore();
}

// ภาษาไทยไม่เว้นวรรคระหว่างคำ ถ้าตัดบรรทัดตามความกว้างดิบ ๆ จะได้ "กั" / "บ"
// Intl.Segmenter แบ่งขอบเขตคำไทยให้ถูกต้อง — สร้างครั้งเดียวแล้วใช้ซ้ำ เพราะสร้างใหม่ทุกครั้งช้า
let cachedSegmenter: Intl.Segmenter | null | undefined;

function getSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  try {
    cachedSegmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter("th", { granularity: "word" })
        : null;
  } catch {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

/** แตกข้อความเป็นหน่วยที่ตัดบรรทัดได้ (คำไทย/คำอังกฤษ/ช่องว่าง) */
function segmentWords(text: string): string[] {
  const segmenter = getSegmenter();
  // เบราว์เซอร์เก่าไม่มี Segmenter — ถอยไปตัดที่ช่องว่างแบบเดิม
  if (!segmenter) return text.split(/(\s+)/).filter(Boolean);
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

/** จัดบรรทัดทั้งหมดโดยไม่จำกัดจำนวน — ตัดกลางคำเฉพาะตอนคำเดียวยาวเกินบรรทัด */
function layoutLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of segmentWords(text.trim())) {
    let part = word;

    while (ctx.measureText(part).width > maxWidth) {
      let cut = part.length;
      while (cut > 1 && ctx.measureText(part.slice(0, cut)).width > maxWidth) {
        cut--;
      }
      if (line) {
        lines.push(line.trimEnd());
        line = "";
      }
      lines.push(part.slice(0, cut));
      part = part.slice(cut);
    }

    if (!part) continue;

    if (ctx.measureText(line + part).width <= maxWidth) {
      line += part;
    } else {
      if (line) lines.push(line.trimEnd());
      line = part.trimStart();
    }
  }

  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** ตัดบรรทัดตามความกว้างจริง เกิน maxLines แล้วต่อท้ายด้วย … */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const all = layoutLines(ctx, text, maxWidth);
  if (all.length <= maxLines) return all;

  const kept = all.slice(0, maxLines);
  let last = kept[kept.length - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[kept.length - 1] = `${last}…`;
  return kept;
}

interface SectionOptions {
  label: string;
  items: string[];
  x: number;
  y: number;
  width: number;
  /** ความสูงที่ใช้ได้ทั้งหมดรวมหัวข้อ */
  maxHeight: number;
  bodySize: number;
  numbered: boolean;
  fontFamily: string;
  /** ให้แต่ละรายการยาวได้กี่บรรทัด (ข้อความยาวอย่างวิธีทำควรได้ 2) */
  maxLinesPerItem: number;
  /** วัตถุดิบเป็นข้อความสั้น จัด 2 คอลัมน์ได้ ประหยัดแนวตั้งไปเยอะ */
  columns: 1 | 2;
}

const LABEL_HEIGHT = 46;
const ITEM_GAP = 8;
const COL_GAP = 36;

/**
 * วาดหัวข้อ + รายการ ตามพื้นที่ที่ให้มา ใส่ไม่หมดก็บอกว่าเหลืออีกเท่าไร
 * คืน "ความสูงที่ใช้จริง" (0 = ที่ไม่พอ ไม่ได้วาดอะไรเลย)
 * ผู้เรียกต้องใช้ค่านี้วางส่วนถัดไป ไม่งั้นจะเกิดช่องว่างโบ๋จากการจองที่ตายตัว
 */
function drawSection(
  ctx: CanvasRenderingContext2D,
  options: SectionOptions,
): number {
  const {
    label,
    items,
    x,
    y,
    width,
    maxHeight,
    bodySize,
    numbered,
    fontFamily,
    maxLinesPerItem,
    columns,
  } = options;

  if (items.length === 0) return 0;

  const lineHeight = bodySize + 13;
  const indent = numbered ? 52 : 30;
  const listTop = y + LABEL_HEIGHT;
  const restLineHeight = bodySize + 12;

  // วัดก่อนว่าถ้าใส่ทุกรายการต้องใช้ความสูงเท่าไร
  let neededHeight: number;
  if (columns === 2) {
    neededHeight = Math.ceil(items.length / 2) * lineHeight;
  } else {
    ctx.font = `400 ${bodySize}px ${fontFamily}`;
    neededHeight =
      items.reduce(
        (sum, item) =>
          sum +
          wrapText(ctx, item, width - indent, maxLinesPerItem).length *
            lineHeight +
          ITEM_GAP,
        0,
      ) - ITEM_GAP;
  }

  // กันที่ให้บรรทัด "อีก X" เฉพาะตอนที่จะใส่ไม่หมดจริง ๆ
  // ถ้ากันไว้ตลอดจะเสียไปหนึ่งบรรทัดฟรี ๆ ทั้งที่เนื้อหาพอดีอยู่แล้ว
  const fitsAll = neededHeight <= maxHeight - LABEL_HEIGHT;
  const available = maxHeight - LABEL_HEIGHT - (fitsAll ? 0 : restLineHeight);
  if (available < lineHeight) return 0;

  const drawLabel = () => {
    ctx.font = `700 28px ${fontFamily}`;
    ctx.fillStyle = BRAND;
    ctx.fillText(label, x, y);
  };

  const drawRest = (rest: number, atY: number) => {
    if (rest <= 0) return 0;
    ctx.font = `400 ${bodySize - 2}px ${fontFamily}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `และอีก ${rest} ${numbered ? "ขั้นตอน" : "อย่าง"}`,
      x + indent,
      atY,
    );
    return restLineHeight;
  };

  if (columns === 2) {
    const colWidth = (width - COL_GAP) / 2;
    const rows = Math.floor(available / lineHeight);
    if (rows < 1) return 0;

    const shown = items.slice(0, rows * 2);
    // ใส่ได้ครบโดยไม่ต้องตัด — เกลี่ยสองคอลัมน์ให้สูงใกล้กัน
    // ไม่งั้น 11 อย่างจะกองซ้าย 9 ขวา 2 ซึ่งดูเสียสมดุล
    const usedRows =
      shown.length < rows * 2 ? Math.ceil(shown.length / 2) : rows;

    drawLabel();
    ctx.font = `400 ${bodySize}px ${fontFamily}`;
    shown.forEach((item, index) => {
      const col = Math.floor(index / usedRows);
      const row = index % usedRows;
      const itemX = x + col * (colWidth + COL_GAP);
      const itemY = listTop + row * lineHeight;

      ctx.fillStyle = MUTED;
      ctx.fillText("•", itemX, itemY);
      ctx.fillStyle = INK;
      const lines = wrapText(ctx, item, colWidth - indent, 1);
      ctx.fillText(lines[0] ?? "", itemX + indent, itemY);
    });

    const listHeight = usedRows * lineHeight;
    const restHeight = drawRest(
      items.length - shown.length,
      listTop + listHeight + 4,
    );
    return LABEL_HEIGHT + listHeight + restHeight;
  }

  const listBottom = listTop + available;
  let cursor = listTop;
  let drawn = 0;

  ctx.font = `400 ${bodySize}px ${fontFamily}`;
  for (const item of items) {
    const lines = wrapText(ctx, item, width - indent, maxLinesPerItem);
    const blockHeight = lines.length * lineHeight;
    if (cursor + blockHeight > listBottom) break;

    ctx.fillStyle = numbered ? BRAND : MUTED;
    ctx.font = numbered
      ? `700 ${bodySize - 2}px ${fontFamily}`
      : `400 ${bodySize}px ${fontFamily}`;
    ctx.fillText(numbered ? `${drawn + 1}.` : "•", x, cursor);

    ctx.fillStyle = INK;
    ctx.font = `400 ${bodySize}px ${fontFamily}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, x + indent, cursor + i * lineHeight);
    });

    cursor += blockHeight + ITEM_GAP;
    drawn++;
  }

  if (drawn === 0) return 0;

  drawLabel();
  const restHeight = drawRest(items.length - drawn, cursor + 4);
  return cursor - ITEM_GAP - y + restHeight;
}

/**
 * วาดการ์ดสูตรลง canvas แล้วคืนเป็นไฟล์รูป
 * รูปอาหารเป็น data URL อยู่แล้ว canvas จึงไม่ถูก taint และ toBlob() ใช้ได้
 */
export async function renderRecipeCard(
  recipe: Recipe,
  format: CardFormat,
  rating?: CookRating | null,
): Promise<Blob> {
  const { width, height, imageHeight, layout, bodySize } = CARD_FORMATS[format];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  // ใช้ฟอนต์ตัวเดียวกับที่หน้าเว็บโหลดอยู่ (next/font ตั้งชื่อ family เป็น hash
  // เลยอ่านจาก computed style แทนการ hardcode "Kanit")
  const fontFamily =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  // รอฟอนต์พร้อมก่อนวาด ไม่งั้นข้อความไทยจะ fallback เป็นฟอนต์ระบบ
  // แต่ห้ามรอไม่มีกำหนด — ตอน dev ที่ HMR ยิงสไตล์ใหม่รัว ๆ fonts.ready ค้างได้
  await withTimeout(
    document.fonts.ready.then(() => true),
    3000,
    false,
  );

  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";

  // ---- รูปอาหาร ----
  const image = recipe.imageUrl ? await loadImage(recipe.imageUrl) : null;
  if (image) {
    drawCover(ctx, image, width, imageHeight);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, imageHeight);
    gradient.addColorStop(0, BRAND);
    gradient.addColorStop(1, "#17472f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, imageHeight);
  }

  // ---- ไล่เงาดำท้ายรูป ให้ตัวหนังสือขาวอ่านออกไม่ว่ารูปจะสว่างแค่ไหน ----
  const scrimTop = imageHeight * 0.42;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, imageHeight);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(0.55, "rgba(0,0,0,0.45)");
  scrim.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, width, imageHeight - scrimTop);

  // ---- ชื่อเมนูทับบนรูป (วางจากล่างขึ้นบน) ----
  const nameSize = layout === "stacked" ? 66 : 58;
  const metaSize = 29;
  let cursor = imageHeight - 52;

  const meta = [
    recipe.readyInMinutes != null ? `${recipe.readyInMinutes} นาที` : null,
    recipe.servings ? `${recipe.servings} ที่` : null,
    recipe.calories || null,
  ].filter(Boolean);

  // ---- ดาวที่ผู้ใช้ให้ไว้ตอนทำเสร็จ — วางล่างสุดให้เห็นชัดตอนคนเลื่อนผ่านฟีด ----
  if (rating) {
    const starSize = layout === "stacked" ? 40 : 36;
    drawStars(ctx, rating, PAD, cursor - starSize / 2 + 4, starSize);
    cursor -= starSize + 24;
  }

  if (meta.length > 0) {
    ctx.font = `400 ${metaSize}px ${fontFamily}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(meta.join("   ·   "), PAD, cursor);
    cursor -= metaSize + 22;
  }

  ctx.font = `700 ${nameSize}px ${fontFamily}`;
  const nameLines = wrapText(ctx, recipe.name, width - PAD * 2, 2);
  ctx.fillStyle = "#ffffff";
  for (let i = nameLines.length - 1; i >= 0; i--) {
    ctx.fillText(nameLines[i], PAD, cursor);
    cursor -= nameSize + 14;
  }

  if (recipe.inspiration) {
    ctx.font = `500 30px ${fontFamily}`;
    ctx.fillStyle = "#ffd9b8";
    const lines = wrapText(ctx, recipe.inspiration, width - PAD * 2, 1);
    ctx.fillText(lines[0] ?? "", PAD, cursor - 4);
  }

  // ---- เนื้อหา: วัตถุดิบ + วิธีทำ ----
  const contentTop = imageHeight + 62;
  const contentBottom = height - FOOTER_HEIGHT - 34;
  const contentHeight = contentBottom - contentTop;
  const contentWidth = width - PAD * 2;

  if (layout === "columns") {
    // 1:1 เตี้ย — วางคู่กันซ้ายขวา ใช้ความกว้างให้คุ้ม
    const gap = 44;
    // แบ่งคอลัมน์ไม่เท่ากัน — วัตถุดิบเป็นข้อความสั้น ("หมูสับ 300 กรัม") ใช้ที่น้อย
    // ส่วนวิธีทำเป็นประโยคยาว ยิ่งกว้างยิ่งจบในบรรทัดเดียว ทำให้ใส่ได้หลายขั้นกว่า
    const usable = contentWidth - gap;
    const ingredientsWidth = usable * 0.4;
    const stepsWidth = usable * 0.6;

    drawSection(ctx, {
      label: "วัตถุดิบ",
      items: recipe.ingredients,
      x: PAD,
      y: contentTop,
      width: ingredientsWidth,
      maxHeight: contentHeight,
      bodySize,
      numbered: false,
      fontFamily,
      maxLinesPerItem: 1,
      columns: 1,
    });
    drawSection(ctx, {
      label: "วิธีทำ",
      items: recipe.instructions,
      x: PAD + ingredientsWidth + gap,
      y: contentTop,
      width: stepsWidth,
      maxHeight: contentHeight,
      bodySize,
      numbered: true,
      fontFamily,
      // ขั้นตอนเป็นประโยคยาว บีบเหลือบรรทัดเดียวแล้วโดนตัด … ทุกข้อจนอ่านไม่รู้เรื่อง
      // ยอมโชว์น้อยข้อกว่าแต่อ่านจบดีกว่า
      maxLinesPerItem: 2,
      columns: 1,
    });
  } else {
    // 9:16 สูง — วัตถุดิบจัด 2 คอลัมน์ให้กระชับ แล้วยกที่เหลือให้วิธีทำ
    const ingredientsHeight = drawSection(ctx, {
      label: "วัตถุดิบ",
      items: recipe.ingredients,
      x: PAD,
      y: contentTop,
      width: contentWidth,
      maxHeight: contentHeight * 0.45,
      bodySize,
      numbered: false,
      fontFamily,
      maxLinesPerItem: 1,
      columns: 2,
    });

    // วางต่อจากความสูงที่ใช้จริง ไม่ใช่จากโควตาที่จองไว้ — กันช่องว่างโบ๋
    const stepsTop =
      ingredientsHeight > 0 ? contentTop + ingredientsHeight + 44 : contentTop;
    drawSection(ctx, {
      label: "วิธีทำ",
      items: recipe.instructions,
      x: PAD,
      y: stepsTop,
      width: contentWidth,
      maxHeight: contentBottom - stepsTop,
      bodySize,
      numbered: true,
      fontFamily,
      maxLinesPerItem: 2,
      columns: 1,
    });
  }

  // ---- แถบท้ายการ์ด ----
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, height - FOOTER_HEIGHT, width, FOOTER_HEIGHT);
  ctx.font = `700 36px ${fontFamily}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Chef Kub", PAD, height - 32);

  ctx.font = `400 28px ${fontFamily}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const tagline = "สแกนวัตถุดิบ · คิดสูตรด้วย AI";
  ctx.fillText(
    tagline,
    width - PAD - ctx.measureText(tagline).width,
    height - 32,
  );

  const blob = await withTimeout(
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    }),
    10_000,
    null,
  );

  if (!blob) throw new Error("card_render_failed");
  return blob;
}
