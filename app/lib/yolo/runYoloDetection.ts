import * as tf from "@tensorflow/tfjs";
import { labels } from "../../utils/labels";
import { toThaiLabel } from "../../utils/labelsTh";
import { BoundingBox, IngredientItem } from "../../utils/types";

export interface YoloDetectionResult {
  items: IngredientItem[];
  boxes: BoundingBox[];
  ms: number;
}

export async function runYoloDetection(
  model: tf.GraphModel,
  base64Url: string,
): Promise<YoloDetectionResult> {
  const start = performance.now();
  try {
    const img = new Image();
    img.src = base64Url;
    await new Promise((resolve) => (img.onload = resolve));

    const tfImg = tf.browser.fromPixels(img);
    const input = tf.image
      .resizeBilinear(tfImg, [640, 640])
      .div(255.0)
      .expandDims(0);

    const res = (await model.executeAsync(input)) as tf.Tensor;
    const transRes = res.transpose([0, 2, 1]) as tf.Tensor3D;
    const data = transRes.dataSync();
    const [_, numBoxes, numClassPlus4] = transRes.shape;

    const detectedBoxes: BoundingBox[] = [];
    const foundItems = new Map<string, IngredientItem>();

    for (let i = 0; i < numBoxes; i++) {
      const row = data.subarray(i * numClassPlus4, (i + 1) * numClassPlus4);
      const [x, y, w, h, ...classProbs] = Array.from(row);
      const maxScore = Math.max(...classProbs);
      const classIndex = classProbs.indexOf(maxScore);

      if (maxScore > 0.4) {
        const englishLabel = labels[classIndex] || "Unknown";
        const thaiName = toThaiLabel(englishLabel);
        foundItems.set(thaiName, { name: thaiName, source: "yolo" });

        const scaleX = img.width / 640;
        const scaleY = img.height / 640;
        detectedBoxes.push({
          x: (x - w / 2) * scaleX,
          y: (y - h / 2) * scaleY,
          w: w * scaleX,
          h: h * scaleY,
          label: thaiName,
        });
      }
    }

    tf.dispose([tfImg, input, res, transRes]);
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
