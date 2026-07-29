/**
 * รันโมเดลสองชุดด้วย input เดียวกันแล้วเทียบ output ดิบ — ใช้ตรวจว่าการควอนไทซ์
 * ทำให้ผลตรวจจับเพี้ยนไปจริงหรือเปล่า ไม่ใช่เดาจากค่า error ของน้ำหนักอย่างเดียว
 *
 *   bun run scripts/compare-models.ts public/model/v1 public/model/v2
 *
 * รันบน CPU backend ช้ากว่าเบราว์เซอร์มาก (นาทีระดับหนึ่งต่อโมเดล) แต่เลขที่ออกมา
 * เป็นเลขเดียวกับที่ webgl จะได้ เพราะน้ำหนักถูกคลายเป็น float32 ชุดเดียวกันทั้งคู่
 */

import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-cpu";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { inflateSync } from "node:zlib";

const MODEL_SIZE = 640;
/** เทียบเฉพาะกล่องที่คะแนนถึงระดับที่แอปจริงจะเอาไปใช้ ต่ำกว่านี้เพี้ยนไปก็ไม่มีผล */
const SCORE_FLOOR = 0.25;
/** ค่าเดียวกับ PAD_VALUE ใน lib/yolo/runYoloDetection.ts */
const PAD_VALUE = 114;
/** กล่องที่โมเดลมั่นใจสุด N อันแรก — ใช้ดูพฤติกรรมได้แม้ไม่มีกล่องไหนถึง SCORE_FLOOR */
const TOP_K = 50;

/** โหลดโมเดลจากดิสก์ — tfjs ไม่มี handler สำหรับ filesystem นอก tfjs-node */
function fileHandler(dir: string): tf.io.IOHandler {
  return {
    load: async () => {
      const modelJSON = JSON.parse(await Bun.file(`${dir}/model.json`).text());
      const groups = modelJSON.weightsManifest;
      const specs = groups.flatMap(
        (group: { weights: tf.io.WeightsManifestEntry[] }) => group.weights,
      );
      const paths = groups.flatMap((group: { paths: string[] }) => group.paths);
      const buffers = await Promise.all(
        paths.map((path: string) => Bun.file(`${dir}/${path}`).arrayBuffer()),
      );

      const total = buffers.reduce(
        (acc: number, buf: ArrayBuffer) => acc + buf.byteLength,
        0,
      );
      const weightData = new Uint8Array(total);
      let offset = 0;
      for (const buf of buffers) {
        weightData.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      /* ส่ง byte ดิบกับ spec ไปตรง ๆ เหมือนที่ browser handler ทำ — ตัว decodeWeights
         ข้างใน GraphModel เป็นคนอ่าน field quantization เอง เส้นทางจึงตรงกับของจริง */
      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs: specs,
        weightData: weightData.buffer,
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
        signature: modelJSON.signature,
        userDefinedMetadata: modelJSON.userDefinedMetadata,
      } as tf.io.ModelArtifacts;
    },
  };
}

/**
 * รูปสังเคราะห์ที่มีโครงสร้าง (ไล่เฉด + ก้อนสี + ขอบคม) ไม่ใช่ noise ล้วน —
 * noise ล้วนทำให้ทุก activation ตายเรียบ เทียบแล้วไม่เห็นอะไร ต้องมี edge ให้ conv จับ
 */
function syntheticInput(): tf.Tensor4D {
  const data = new Float32Array(MODEL_SIZE * MODEL_SIZE * 3);
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let y = 0; y < MODEL_SIZE; y++) {
    for (let x = 0; x < MODEL_SIZE; x++) {
      const i = (y * MODEL_SIZE + x) * 3;
      const gradient = (x + y) / (2 * MODEL_SIZE);
      // ก้อนกลมสามก้อนขนาดต่างกัน เลียนแบบวัตถุดิบวางบนพื้น
      const blob1 = Math.hypot(x - 200, y - 220) < 90 ? 0.55 : 0;
      const blob2 = Math.hypot(x - 430, y - 300) < 60 ? 0.35 : 0;
      const blob3 = Math.hypot(x - 300, y - 480) < 120 ? 0.25 : 0;
      const noise = (rand() - 0.5) * 0.06;
      data[i] = Math.min(1, Math.max(0, gradient + blob1 + noise));
      data[i + 1] = Math.min(1, Math.max(0, 0.4 + blob2 - gradient * 0.3 + noise));
      data[i + 2] = Math.min(1, Math.max(0, 0.3 + blob3 + gradient * 0.2 + noise));
    }
  }
  return tf.tensor4d(data, [1, MODEL_SIZE, MODEL_SIZE, 3]);
}

/**
 * อ่าน PNG แบบ 8-bit RGB/RGBA ที่ไม่ interlace — พอสำหรับภาพเทสในโปรเจกต์นี้
 * (Bun ไม่มีตัวถอดรูปในตัว และ tf.browser.fromPixels ต้องมี DOM ซึ่งที่นี่ไม่มี)
 */
function decodePng(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((byte, i) => bytes[i] !== byte)) {
    throw new Error("ไม่ใช่ไฟล์ PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Uint8Array[] = [];

  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const body = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const bitDepth = bytes[offset + 16];
      colorType = bytes[offset + 17];
      const interlace = bytes[offset + 20];
      if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(
          `รองรับเฉพาะ PNG 8-bit RGB/RGBA ที่ไม่ interlace (ได้ depth=${bitDepth} color=${colorType} interlace=${interlace})`,
        );
      }
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length; // length(4) + type(4) + data + crc(4)
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = new Uint8Array(inflateSync(Buffer.concat(idat)));
  const stride = width * channels;
  const pixels = new Uint8Array(width * height * 3);

  /* PNG เก็บแต่ละแถวเป็น "ส่วนต่างจากเพื่อนบ้าน" ไม่ใช่ค่าสีตรง ๆ ต้องคลาย filter
     ทีละแถว โดยแถวก่อนหน้าต้องคลายเสร็จแล้ว (spec: PNG Filtering) */
  const line = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));

    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? line[i - channels] : 0;
      const up = prev[i];
      const upLeft = i >= channels ? prev[i - channels] : 0;
      let value = row[i];
      switch (filter) {
        case 0:
          break;
        case 1:
          value += left;
          break;
        case 2:
          value += up;
          break;
        case 3:
          value += (left + up) >> 1;
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          break;
        }
        default:
          throw new Error(`filter ที่ไม่รู้จัก: ${filter}`);
      }
      line[i] = value & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const to = (y * width + x) * 3;
      const from = x * channels;
      pixels[to] = line[from];
      pixels[to + 1] = line[from + 1];
      pixels[to + 2] = line[from + 2];
    }
    prev.set(line);
  }

  return { width, height, pixels };
}

/** letterbox ให้ตรงกับที่ runYoloDetection ทำกับรูปจริง ไม่งั้นเทสคนละเงื่อนไขกับของจริง */
function imageInput(width: number, height: number, pixels: Uint8Array): tf.Tensor4D {
  return tf.tidy(() => {
    const source = tf.tensor3d(pixels, [height, width, 3], "float32");
    const ratio = Math.min(MODEL_SIZE / width, MODEL_SIZE / height);
    const scaledW = Math.round(width * ratio);
    const scaledH = Math.round(height * ratio);
    const padX = Math.floor((MODEL_SIZE - scaledW) / 2);
    const padY = Math.floor((MODEL_SIZE - scaledH) / 2);
    const resized = tf.image.resizeBilinear(source, [scaledH, scaledW]);
    const padded = tf.pad(
      resized,
      [
        [padY, MODEL_SIZE - scaledH - padY],
        [padX, MODEL_SIZE - scaledW - padX],
        [0, 0],
      ],
      PAD_VALUE,
    );
    return tf.expandDims(tf.div(padded, 255), 0) as tf.Tensor4D;
  });
}

async function run(dir: string, input: tf.Tensor4D) {
  const model = await loadGraphModel(fileHandler(dir));
  const started = performance.now();
  const raw = await model.executeAsync(input);
  // executeAsync คืน array เมื่อกราฟมีหลาย output — โมเดลนี้มีตัวเดียวแต่กันไว้
  const output = (Array.isArray(raw) ? raw[0] : raw) as tf.Tensor;
  /* ใช้ tf.transpose ไม่ใช่ output.transpose() เพราะ chained op ถูกลงทะเบียนโดย
     แพ็กเกจ @tensorflow/tfjs ตัวเต็ม ซึ่งสคริปต์นี้ไม่ได้โหลด (โหลดแค่ core + cpu) */
  const transposed = tf.transpose(output, [0, 2, 1]);
  const data = (await transposed.data()) as Float32Array;
  const shape = transposed.shape;
  tf.dispose([output, transposed]);
  model.dispose();
  return { data, shape, ms: Math.round(performance.now() - started) };
}

async function main() {
  const [dirA, dirB, imagePath] = process.argv.slice(2);
  if (!dirA || !dirB) {
    console.error(
      "ใช้: bun run scripts/compare-models.ts <โมเดล A> <โมเดล B> [รูป.png]",
    );
    process.exit(1);
  }

  await tf.setBackend("cpu");
  await tf.ready();
  console.log(`backend: ${tf.getBackend()}\n`);

  let input: tf.Tensor4D;
  if (imagePath) {
    const bytes = new Uint8Array(await Bun.file(imagePath).arrayBuffer());
    const { width, height, pixels } = decodePng(bytes);
    console.log(`input: ${imagePath} (${width}×${height})`);
    input = imageInput(width, height, pixels);
  } else {
    console.log("input: รูปสังเคราะห์ (ไม่ได้ระบุไฟล์)");
    input = syntheticInput();
  }
  console.log(`รัน ${dirA} ...`);
  const a = await run(dirA, input);
  console.log(`  เสร็จใน ${a.ms}ms · shape ${JSON.stringify(a.shape)}`);
  console.log(`รัน ${dirB} ...`);
  const b = await run(dirB, input);
  console.log(`  เสร็จใน ${b.ms}ms · shape ${JSON.stringify(b.shape)}\n`);
  input.dispose();

  if (JSON.stringify(a.shape) !== JSON.stringify(b.shape)) {
    console.error("shape ของ output ไม่ตรงกัน — โมเดลคนละโครงสร้าง");
    process.exit(1);
  }

  const [, numBoxes, numCols] = a.shape as [number, number, number];
  const numClasses = numCols - 4;

  let maxBoxDiff = 0; // พิกัดกล่อง หน่วยพิกเซลบนภาพ 640
  let maxScoreDiff = 0; // คะแนนคลาส 0..1
  let classMismatch = 0; // กล่องที่ "คลาสที่ชนะ" เปลี่ยนไป
  let comparedBoxes = 0;
  let maxWinnerScoreDiff = 0;
  /** เก็บไว้จัดอันดับทีหลัง เผื่อไม่มีกล่องไหนถึง SCORE_FLOOR เลย */
  const winners: { index: number; scoreA: number; classA: number; classB: number; scoreB: number }[] =
    [];

  for (let i = 0; i < numBoxes; i++) {
    const offset = i * numCols;

    for (let c = 0; c < 4; c++) {
      maxBoxDiff = Math.max(maxBoxDiff, Math.abs(a.data[offset + c] - b.data[offset + c]));
    }

    let bestA = 0;
    let bestB = 0;
    let classA = -1;
    let classB = -1;
    for (let c = 4; c < numCols; c++) {
      const scoreA = a.data[offset + c];
      const scoreB = b.data[offset + c];
      maxScoreDiff = Math.max(maxScoreDiff, Math.abs(scoreA - scoreB));
      if (scoreA > bestA) {
        bestA = scoreA;
        classA = c - 4;
      }
      if (scoreB > bestB) {
        bestB = scoreB;
        classB = c - 4;
      }
    }

    winners.push({ index: i, scoreA: bestA, classA, scoreB: bestB, classB });

    // สนใจเฉพาะกล่องที่แรงพอจะโผล่ในแอปจริง — กล่องคะแนน 0.01 สลับคลาสก็ไม่มีใครเห็น
    if (bestA >= SCORE_FLOOR || bestB >= SCORE_FLOOR) {
      comparedBoxes++;
      if (classA !== classB) classMismatch++;
      maxWinnerScoreDiff = Math.max(maxWinnerScoreDiff, Math.abs(bestA - bestB));
    }
  }

  console.log(`เทียบ ${numBoxes} กล่อง × ${numClasses} คลาส`);
  console.log(`  พิกัดกล่อง ต่างสูงสุด ${maxBoxDiff.toExponential(3)} px (จากภาพ ${MODEL_SIZE}px)`);
  console.log(`  คะแนนคลาส ต่างสูงสุด ${maxScoreDiff.toExponential(3)} (สเกล 0-1)`);
  console.log(`\nเฉพาะกล่องที่คะแนน >= ${SCORE_FLOOR} (${comparedBoxes} กล่อง):`);
  console.log(`  คลาสที่ชนะเปลี่ยนไป: ${classMismatch} กล่อง`);
  console.log(`  คะแนนของคลาสที่ชนะ ต่างสูงสุด ${maxWinnerScoreDiff.toExponential(3)}`);

  /* ถ้า input ไม่มีของที่โมเดลรู้จักเลย บล็อกข้างบนจะว่าง — ส่วนนี้ยังให้สัญญาณได้
     เพราะดู "กล่องที่โมเดลมั่นใจที่สุด" ตามอันดับ ไม่ใช่ตามเกณฑ์คะแนนสัมบูรณ์ */
  winners.sort((a, b) => b.scoreA - a.scoreA);
  const top = winners.slice(0, TOP_K);
  const topMismatch = top.filter((w) => w.classA !== w.classB).length;
  const topScoreDiff = Math.max(...top.map((w) => Math.abs(w.scoreA - w.scoreB)));
  /* พิกัดของกล่องที่คะแนนต่ำเตี้ยไม่มีความหมาย (โมเดลไม่ได้ตั้งใจทายอะไรตรงนั้น)
     ตัวเลขที่ใช้ตัดสินจริงคือพิกัดของกล่องที่โมเดลมั่นใจ ซึ่งคือกลุ่มนี้ */
  let topBoxDiff = 0;
  for (const w of top) {
    for (let c = 0; c < 4; c++) {
      const offset = w.index * numCols + c;
      topBoxDiff = Math.max(topBoxDiff, Math.abs(a.data[offset] - b.data[offset]));
    }
  }
  console.log(`\nกล่องที่มั่นใจสุด ${TOP_K} อันแรก (คะแนน ${top[0].scoreA.toFixed(3)} → ${top[top.length - 1].scoreA.toFixed(3)}):`);
  console.log(`  คลาสที่ชนะเปลี่ยนไป: ${topMismatch} กล่อง`);
  console.log(`  คะแนนต่างสูงสุด ${topScoreDiff.toExponential(3)}`);
  console.log(`  พิกัดต่างสูงสุด ${topBoxDiff.toExponential(3)} px`);
  console.log(`  อันดับ 1: คลาส ${top[0].classA} @ ${top[0].scoreA.toFixed(4)} → คลาส ${top[0].classB} @ ${top[0].scoreB.toFixed(4)}`);
}

await main();
