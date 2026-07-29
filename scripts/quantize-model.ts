/**
 * แปลงน้ำหนัก tfjs graph model จาก float32 → float16 เพื่อลดขนาดดาวน์โหลดครึ่งหนึ่ง
 *
 *   bun run scripts/quantize-model.ts public/model/v1 public/model/v2
 *
 * ทำไมไม่ใช้ tensorflowjs_converter: ตัว converter ควอนไทซ์ได้ตอน "แปลงจากโมเดลต้นทาง"
 * (.pt / SavedModel) ซึ่งเครื่องนี้ไม่มีแล้ว แต่ฟอร์แมตปลายทางของ tfjs ออกแบบมาให้
 * ควอนไทซ์ทีหลังได้อยู่แล้ว — แค่เขียน quantization ลง weightsManifest แล้วเก็บ bit
 * ให้ถูกฟอร์แมต ตอนโหลด tf.io.decodeWeights จะคลายกลับเป็น float32 ให้เอง
 *
 * ไม่แตะ int32 (พวก shape constant) เพราะ tfjs รับ float16 เฉพาะกับ tensor float32
 */

const SHARD_BYTES = 4 * 1024 * 1024;
/** ค่าที่ใหญ่สุดที่ float16 เก็บได้ เกินนี้กลายเป็น Infinity ซึ่งพังทั้งโมเดล */
const FLOAT16_MAX = 65504;

interface WeightSpec {
  name: string;
  shape: number[];
  dtype: string;
  quantization?: { dtype: string; scale?: number; min?: number };
}

const BYTES_PER_ELEMENT: Record<string, number> = {
  float32: 4,
  int32: 4,
  bool: 1,
  uint8: 1,
};

function numel(shape: number[]): number {
  return shape.reduce((acc, dim) => acc * dim, 1);
}

async function main() {
  const [srcDir, outDir] = process.argv.slice(2);
  if (!srcDir || !outDir) {
    console.error(
      "ใช้: bun run scripts/quantize-model.ts <โฟลเดอร์ต้นทาง> <โฟลเดอร์ปลายทาง>",
    );
    process.exit(1);
  }

  const model = JSON.parse(await Bun.file(`${srcDir}/model.json`).text());
  const manifest = model.weightsManifest;
  if (manifest.length !== 1) {
    // โค้ดข้างล่างรวมทุก shard เป็นก้อนเดียวแล้วตัดใหม่ ซึ่งใช้ได้กับ group เดียวเท่านั้น
    throw new Error(`รองรับ weight group เดียว แต่ไฟล์นี้มี ${manifest.length}`);
  }

  const specs: WeightSpec[] = manifest[0].weights;
  const paths: string[] = manifest[0].paths;

  /* shard คือไฟล์เดียวถูกหั่นเป็นท่อน ๆ ไม่ใช่ไฟล์ที่จบในตัว — tensor หนึ่งตัวคร่อม
     รอยต่อ shard ได้ ต้องต่อกลับเป็นก้อนเดียวก่อนถึงจะอ่านทีละ tensor ได้ถูก */
  const shards = await Promise.all(
    paths.map((path) => Bun.file(`${srcDir}/${path}`).arrayBuffer()),
  );
  const totalBytes = shards.reduce((acc, buf) => acc + buf.byteLength, 0);
  const source = new Uint8Array(totalBytes);
  let cursor = 0;
  for (const shard of shards) {
    source.set(new Uint8Array(shard), cursor);
    cursor += shard.byteLength;
  }

  const chunks: Uint8Array[] = [];
  const newSpecs: WeightSpec[] = [];
  let read = 0;
  let converted = 0;
  let skipped = 0;
  let maxAbsError = 0;
  let maxRelError = 0;
  let worstTensor = "";
  const overflowed: string[] = [];
  const flushedToZero: string[] = [];

  for (const spec of specs) {
    const count = numel(spec.shape);
    const width = BYTES_PER_ELEMENT[spec.dtype];
    if (width === undefined) {
      throw new Error(`ไม่รู้จัก dtype "${spec.dtype}" ของ ${spec.name}`);
    }
    const byteLength = count * width;
    const raw = source.subarray(read, read + byteLength);
    read += byteLength;

    if (spec.dtype !== "float32" || spec.quantization) {
      chunks.push(raw);
      newSpecs.push(spec);
      skipped++;
      continue;
    }

    /* subarray ให้ view ที่ offset ไม่ตรง 4 ไบต์ได้ ซึ่ง Float32Array รับไม่ได้ —
       slice() คัดลอกออกมาเป็น buffer ใหม่ที่ offset 0 เสมอ */
    const values = new Float32Array(raw.slice().buffer);
    const half = new Float16Array(values);

    let tensorOverflow = 0;
    let tensorFlush = 0;
    for (let i = 0; i < values.length; i++) {
      const before = values[i];
      const after = half[i];
      if (Number.isFinite(before) && !Number.isFinite(after)) tensorOverflow++;
      if (before !== 0 && after === 0) tensorFlush++;

      const absError = Math.abs(before - after);
      if (Number.isFinite(absError) && absError > maxAbsError) {
        maxAbsError = absError;
        worstTensor = spec.name;
      }
      if (before !== 0 && Number.isFinite(absError)) {
        const relError = absError / Math.abs(before);
        if (relError > maxRelError) maxRelError = relError;
      }
    }
    if (tensorOverflow > 0) {
      overflowed.push(`${spec.name} (${tensorOverflow} ค่า)`);
    }
    if (tensorFlush > 0) {
      flushedToZero.push(`${spec.name} (${tensorFlush} ค่า)`);
    }

    chunks.push(new Uint8Array(half.buffer, half.byteOffset, half.byteLength));
    // dtype ยังเป็น float32 เพราะนั่นคือชนิดที่กราฟใช้ — quantization บอกวิธี "เก็บ" เท่านั้น
    newSpecs.push({ ...spec, quantization: { dtype: "float16" } });
    converted++;
  }

  if (read !== totalBytes) {
    throw new Error(
      `manifest กินไป ${read} ไบต์ แต่ไฟล์จริงมี ${totalBytes} — โครงสร้างไม่ตรงกัน หยุดก่อน`,
    );
  }

  const outBytes = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const packed = new Uint8Array(outBytes);
  let write = 0;
  for (const chunk of chunks) {
    packed.set(chunk, write);
    write += chunk.byteLength;
  }

  const shardCount = Math.max(1, Math.ceil(outBytes / SHARD_BYTES));
  const newPaths: string[] = [];
  await Bun.$`mkdir -p ${outDir}`.quiet();
  for (let i = 0; i < shardCount; i++) {
    const name = `group1-shard${i + 1}of${shardCount}.bin`;
    newPaths.push(name);
    await Bun.write(
      `${outDir}/${name}`,
      packed.subarray(i * SHARD_BYTES, Math.min((i + 1) * SHARD_BYTES, outBytes)),
    );
  }

  model.weightsManifest = [{ paths: newPaths, weights: newSpecs }];
  await Bun.write(`${outDir}/model.json`, JSON.stringify(model));

  const metadata = Bun.file(`${srcDir}/metadata.yaml`);
  if (await metadata.exists()) {
    await Bun.write(`${outDir}/metadata.yaml`, metadata);
  }

  const mb = (bytes: number) => `${(bytes / 1e6).toFixed(2)} MB`;
  console.log(`แปลง ${converted} tensor · ข้าม ${skipped} tensor (ไม่ใช่ float32)`);
  console.log(`น้ำหนัก: ${mb(totalBytes)} → ${mb(outBytes)} (${shardCount} shard)`);
  console.log(`error สูงสุด: abs ${maxAbsError.toExponential(3)} ที่ ${worstTensor}`);
  console.log(`             rel ${(maxRelError * 100).toFixed(4)}%`);
  console.log(
    `ค่าที่ล้นเกิน float16 (>${FLOAT16_MAX}): ${overflowed.length === 0 ? "ไม่มี" : overflowed.join(", ")}`,
  );
  console.log(
    `ค่าที่เล็กจนกลายเป็น 0: ${flushedToZero.length === 0 ? "ไม่มี" : flushedToZero.join(", ")}`,
  );
  if (overflowed.length > 0) {
    console.error("\nมีค่าล้นเป็น Infinity — ห้ามใช้ไฟล์ชุดนี้ ต้องกลับไปใช้ uint8 ต่อ tensor แทน");
    process.exit(1);
  }
}

// ไฟล์นี้ไม่มี import — ต้องมี export เปล่าเพื่อให้ TS ถือเป็น module ไม่งั้น top-level await ไม่ผ่าน
export {};

await main();
