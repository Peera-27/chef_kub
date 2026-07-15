import * as tf from "@tensorflow/tfjs";
import { labels } from "../../utils/labels";
import { toThaiLabel } from "../../utils/labelsTh";
import { BoundingBox, IngredientItem } from "../../utils/types";

const MODEL_SIZE = 640;
// ตั้งสูงเพื่อไม่ให้โมเดลเดามั่ว ๆ — โชว์เฉพาะที่มั่นใจจริง (>= 60%)
// recall ที่หายไปตรงนี้ Gemini fallback ใน useChefKub ช่วยอุดให้ (ยิงเมื่อ YOLO เจอน้อย)
const SCORE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.45;
const MAX_BOXES = 50;
/** Gray value Ultralytics letterboxes with; the model was trained on this padding. */
const PAD_VALUE = 114;
/** Shifts each class into its own coordinate space so NMS never merges boxes across classes. */
const CLASS_STRIDE = 8192;

interface Candidate {
  classIndex: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Row in the raw model output, so diagnostics can re-read its full class vector. */
  boxIndex: number;
}

export interface YoloDetectionResult {
  items: IngredientItem[];
  boxes: BoundingBox[];
  ms: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("ไม่สามารถโหลดรูปได้"));
    img.src = src;
  });
}

function topClasses(
  scores: ArrayLike<number>,
  offset: number,
  count: number,
  n: number,
) {
  return Array.from({ length: count }, (_, c) => ({
    label: labels[c] || `#${c}`,
    score: scores[offset + c],
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ label, score }) => ({ label, score: +score.toFixed(3) }));
}

/**
 * Answers "did the model consider the right class at all?" — if the runner-up on
 * a box is the ingredient we expected, this is a threshold/logic problem; if the
 * right class never scores anywhere in the image, the weights simply don't know it.
 */
function logDiagnostics(
  data: ArrayLike<number>,
  numCols: number,
  candidates: Candidate[],
  kept: number[],
  classCeiling: Float32Array,
) {
  const numClasses = numCols - 4;

  console.groupCollapsed(
    `[YOLO] kept ${kept.length} box(es) จาก ${candidates.length} candidate`,
  );

  console.log("อันดับคลาสของแต่ละกล่องที่ได้:");
  console.table(
    kept.map((index) => {
      const { boxIndex } = candidates[index];
      const top = topClasses(data, boxIndex * numCols + 4, numClasses, 3);
      return {
        "#1": top[0] && `${top[0].label} (${top[0].score})`,
        "#2": top[1] && `${top[1].label} (${top[1].score})`,
        "#3": top[2] && `${top[2].label} (${top[2].score})`,
      };
    }),
  );

  console.log(`คะแนนสูงสุดของแต่ละคลาสทั้งรูป (threshold = ${SCORE_THRESHOLD}):`);
  console.table(topClasses(classCeiling, 0, numClasses, 10));

  console.groupEnd();
}

export async function runYoloDetection(
  model: tf.GraphModel,
  base64Url: string,
): Promise<YoloDetectionResult> {
  const start = performance.now();
  try {
    const img = await loadImage(base64Url);

    // Letterbox: scale to fit inside 640x640 keeping aspect ratio, then pad the
    // short side. Squashing to a square instead distorts objects away from the
    // shapes the model was trained on and drops confidence.
    const ratio = Math.min(MODEL_SIZE / img.width, MODEL_SIZE / img.height);
    const scaledW = Math.round(img.width * ratio);
    const scaledH = Math.round(img.height * ratio);
    const padX = Math.floor((MODEL_SIZE - scaledW) / 2);
    const padY = Math.floor((MODEL_SIZE - scaledH) / 2);

    const input = tf.tidy(() => {
      const pixels = tf.browser.fromPixels(img);
      const resized = tf.image.resizeBilinear(pixels, [scaledH, scaledW]);
      const padded = tf.pad(
        resized,
        [
          [padY, MODEL_SIZE - scaledH - padY],
          [padX, MODEL_SIZE - scaledW - padX],
          [0, 0],
        ],
        PAD_VALUE,
      );
      return padded.div(255.0).expandDims(0);
    });

    const res = (await model.executeAsync(input)) as tf.Tensor;
    const transRes = res.transpose([0, 2, 1]);
    const [, numBoxes, numCols] = transRes.shape;
    const data = await transRes.data();
    tf.dispose([input, res, transRes]);

    const candidates: Candidate[] = [];
    const nmsBoxes: number[][] = [];
    const nmsScores: number[] = [];
    /** Best score each class reached anywhere in the image, threshold or not. */
    const classCeiling = new Float32Array(numCols - 4);

    for (let i = 0; i < numBoxes; i++) {
      const offset = i * numCols;

      let maxScore = 0;
      let classIndex = -1;
      for (let c = 4; c < numCols; c++) {
        const score = data[offset + c];
        if (score > classCeiling[c - 4]) classCeiling[c - 4] = score;
        if (score > maxScore) {
          maxScore = score;
          classIndex = c - 4;
        }
      }
      if (classIndex < 0 || maxScore < SCORE_THRESHOLD) continue;

      const cx = data[offset];
      const cy = data[offset + 1];
      const w = data[offset + 2];
      const h = data[offset + 3];
      const shift = classIndex * CLASS_STRIDE;

      nmsBoxes.push([
        cy - h / 2 + shift,
        cx - w / 2 + shift,
        cy + h / 2 + shift,
        cx + w / 2 + shift,
      ]);
      nmsScores.push(maxScore);
      candidates.push({ classIndex, cx, cy, w, h, boxIndex: i });
    }

    // The model predicts the same object many times over; without NMS every one
    // of those duplicates becomes a box.
    let kept: number[] = [];
    if (candidates.length > 0) {
      const boxTensor = tf.tensor2d(nmsBoxes, [nmsBoxes.length, 4]);
      const scoreTensor = tf.tensor1d(nmsScores);
      const keepTensor = await tf.image.nonMaxSuppressionAsync(
        boxTensor,
        scoreTensor,
        MAX_BOXES,
        IOU_THRESHOLD,
        SCORE_THRESHOLD,
      );
      kept = Array.from(await keepTensor.data());
      tf.dispose([boxTensor, scoreTensor, keepTensor]);
    }

    const detectedBoxes: BoundingBox[] = [];
    const foundItems = new Map<string, IngredientItem>();

    for (const index of kept) {
      const { classIndex, cx, cy, w, h } = candidates[index];
      const thaiName = toThaiLabel(labels[classIndex] || "Unknown");
      foundItems.set(thaiName, { name: thaiName, source: "yolo" });

      // Undo the letterbox: strip the padding, then scale back to image pixels.
      const x1 = Math.max(0, (cx - w / 2 - padX) / ratio);
      const y1 = Math.max(0, (cy - h / 2 - padY) / ratio);
      const x2 = Math.min(img.width, (cx + w / 2 - padX) / ratio);
      const y2 = Math.min(img.height, (cy + h / 2 - padY) / ratio);

      detectedBoxes.push({
        x: x1,
        y: y1,
        w: x2 - x1,
        h: y2 - y1,
        label: thaiName,
      });
    }

    if (process.env.NODE_ENV !== "production") {
      logDiagnostics(data, numCols, candidates, kept, classCeiling);
    }

    return {
      items: Array.from(foundItems.values()),
      boxes: detectedBoxes,
      ms: Math.round(performance.now() - start),
    };
  } catch (error) {
    console.error("YOLO Error:", error);
    return { items: [], boxes: [], ms: 0 };
  }
}
