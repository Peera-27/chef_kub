<div align="center">

# 🍳 Chef Kub — สแกนวัตถุดิบ แนะนำสูตรอาหาร 🥘

*📸 ถ่ายรูปวัตถุดิบ → 🤖 AI แนะนำเมนู → 👨‍🍳 ลงมือทำ*

🥕 🍅 🧄 🧅 🥚 🌶️ 🥬 🍆 🐟 🍗

</div>

---

โปรเจกต์จบที่ใช้ **🧠 Computer Vision + ✨ Generative AI** ช่วยผู้ใช้สแกนวัตถุดิบจากรูปภาพ แนะนำสูตรอาหาร แล้วพาทำทีละขั้นตอน — พร้อมจำ label ที่ผู้ใช้เคยแก้ไว้ เจอรูปเดิมหรือรูปที่**คล้ายกัน**ก็โหลด label เดิมได้ทันทีโดยไม่ต้องสแกนซ้ำ

## 🧩 แนวคิดหลัก: YOLO เดา Gemini ตัดสิน

| | YOLO11n (ในเบราว์เซอร์) | Gemini (บนเซิร์ฟเวอร์) |
|---|---|---|
| ข้อดี | เร็ว ฟรี ได้ **กรอบพิกัด** | เข้าใจภาพจริง รู้จักของนอก class |
| ข้อเสีย | รู้จักแค่ ~122 class "มั่นใจแต่มั่ว" ได้ | ช้ากว่า มีโควตา ไม่คืนพิกัด |

เอาสองอย่างมาต่อกัน: **YOLO เดาก่อนเพื่อให้ได้กรอบ → Gemini ดูรูปจริงแล้วตัดสิน** ว่ากรอบไหนถูก
กรอบที่ Gemini ไม่ยืนยัน = ของมั่ว ตัดทิ้ง / ของที่ YOLO พลาด Gemini เติมให้ / รูปที่ไม่ใช่วัตถุดิบถูกปัดตั้งแต่ต้นทาง

ผลลัพธ์ที่ผู้ใช้แก้ไว้ถูกเก็บเป็น dataset ใน D1 + R2 เพื่อเอาไป train YOLO รอบต่อไป — ยิ่งใช้ YOLO ยิ่งแม่น เรียก Gemini น้อยลง

## 📸 หน้าตาแอป

<div align="center">
<table>
<tr>
<td width="50%" align="center">
<img src="public/shots/menu.png" alt="หน้าเมนูที่ทำได้" width="100%" />
<br /><b>🍲 เมนูที่ทำได้</b><br />
<sub>สูตรที่ AI จัดให้จากวัตถุดิบที่สแกนเจอ<br />พร้อมแคลอรี่ เวลา และแท็กประจำเมนู</sub>
</td>
<td width="50%" align="center">
<img src="public/shots/cook.png" alt="หน้าโหมดทำครัว" width="100%" />
<br /><b>👨‍🍳 โหมดทำครัว</b><br />
<sub>ปรับจำนวนที่แล้วปริมาณสเกลตาม<br />ติ๊กวัตถุดิบที่เตรียมแล้ว ทำตามขั้นตอนทีละสเต็ป</sub>
</td>
</tr>
</table>
</div>

## ✨ ฟีเจอร์

### 🔍 สแกน & ตรวจจับ

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 📷 ตรวจจับวัตถุดิบ (YOLO) | YOLO11n (~122 class) รันในเบราว์เซอร์ด้วย TensorFlow.js — น้ำหนัก float16 5.4MB โหลดแบบ lazy |
| ⚡ Prefetch โมเดล | เริ่มดึงน้ำหนักตั้งแต่ผู้ใช้ "ส่อแวว" ว่าจะสแกน (กดเปิดกล้อง / กดเลือกไฟล์) ไม่ใช่ตอนกดชัตเตอร์ |
| 🔮 ตัดสินด้วย Gemini | Gemini ดูรูปจริง ยืนยันของที่ YOLO เดาถูก + เติมของที่ YOLO พลาด (source: `yolo` / `gemini` / `manual`) |
| 🚧 ด่านกันรูปที่ใช้ไม่ได้ | Gemini ตอบ `foodImage` / `preparedDish` มาด้วย — รูปที่ไม่มีของกิน (`not_food`) หรือเป็นจานที่ทำเสร็จแล้ว (`prepared_dish`) จะถูกปฏิเสธพร้อมบอกเหตุผลใน `NoticeModal` |
| 🗜️ ย่อรูปก่อนส่ง | รูปจากกล้องมือถือย่อเหลือด้านยาว 1024px / JPEG 0.85 ก่อนเข้า server action (`downscaleImage`) |
| 🔎 จำรูปเดิม + รูปคล้าย | SHA-256 จับรูปเดิมเป๊ะ ๆ / dHash + Hamming distance จับรูปคล้ายกัน |
| ✏️ แก้ไข / Label ด้วยมือ | วาดกรอบ เลือกชื่อจากรายการ หรือเพิ่ม class ใหม่ |
| 💾 จำ Label | บันทึก bounding box (YOLO format) ลง Cloudflare D1 |
| 🗂️ เก็บรูปเป็น training data | อัพรูปขึ้น Cloudflare R2 ตอน label เพื่อใช้ train โมเดลรอบต่อไป (ถ้าไม่ตั้งค่า R2 ก็ยังเซฟ label ได้) |
| 🏷️ จัดการ Class | ตาราง `classes` กลาง เตือนเมื่อชื่อคล้ายของเดิม และให้ผู้ใช้ยืนยันเพิ่มได้ถ้ามั่นใจ (`force`) |

### 🍲 สูตรอาหาร

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 🍜 สร้างสูตรอาหาร | Gemini สร้าง 3 เมนู (สำหรับ 1 ที่) จากวัตถุดิบที่มี เรียงจากเมนูที่เสร็จเร็วที่สุด |
| 🔧 คิดตามอุปกรณ์ที่มีจริง | ส่งรายการอุปกรณ์ครัวที่ผู้ใช้ตั้งไว้เข้า prompt — ไม่สั่งให้อบถ้าไม่มีเตาอบ |
| 🎭 โหมดทำอาหาร | ปกติ / ฟิวชั่น / จากอนิเมะ — แต่ละโหมดปรับสไตล์เมนู + สไตล์รูป |
| 🖼️ รูปประกอบเมนู | Cloudflare Workers AI (`flux-1-schnell`) สร้างรูปเมนู แล้วแคชไว้ใน R2 ใช้ซ้ำได้ตลอด |
| ⭐ รายการโปรด / ประวัติ | เก็บใน localStorage |

### 👨‍🍳 โหมดทำครัว

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 🔊 อ่านขั้นตอนให้ฟัง | แสดงทีละ step + อ่านออกเสียง (Web Speech API) |
| 🍽️ ปรับจำนวนที่ | เพิ่ม/ลดจำนวนที่ แล้วปริมาณวัตถุดิบสเกลตามอัตโนมัติ |
| ✅ Checklist วัตถุดิบ | ติ๊กของที่เตรียมแล้ว เห็นความคืบหน้า (เตรียมแล้ว 3/5) |
| ⏱️ จับเวลาขั้นตอน | อ่านเวลาจากข้อความขั้นตอนเอง (เช่น "ผัดไฟกลาง 3 นาที") แล้วตั้งเวลาให้ |
| 📱 กันจอดับ | Wake Lock API — จอไม่ดับระหว่างทำอาหาร |
| 📤 แชร์สูตร | แชร์เป็นข้อความ หรือการ์ดรูป (feed 1:1 / story 9:16) |
| 🌟 ให้ดาวเมนูที่ทำแล้ว | บันทึกคะแนน 1–5 ดาวลง localStorage (`cookLog`) + คอนเฟตตีตอนทำเสร็จ |

### ⚙️ ตั้งค่า

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 🔧 อุปกรณ์ครัวของฉัน | เลือกอุปกรณ์ที่มีจริงจาก 6 หมวด (ให้ความร้อน / ปรุงอาหาร / เตรียมวัตถุดิบ / ผสม-ตวง ฯลฯ) เก็บใน localStorage แล้วส่งเข้า prompt ตอนสร้างสูตร |
| 💾 Sticky save bar | แถบบันทึกลอยขึ้นเมื่อมีของค้างยังไม่ได้เซฟ เทียบกับค่าที่บันทึกไว้จริง |

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│  ผู้ใช้      │────▶│  Frontend (Next.js + React)              │
│  ถ่ายรูป/    │     │  • กล้อง / อัปโหลด → ย่อรูป              │
│  อัปโหลด     │     │  • Gallery + แก้ไข label                 │
└─────────────┘     └──────────────┬───────────────────────────┘
                                   │
     ┌──────────────┬──────────────┼──────────────┬──────────────┐
     ▼              ▼              ▼              ▼              ▼
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ YOLO11n │──▶│ Gemini   │   │ D1       │   │ R2       │   │ Workers  │
│ (TF.js) │   │ ตัดสิน   │   │ (SQLite) │   │ เก็บรูป  │   │ AI (รูป) │
│ เดาในเบรา│   │ ภาพจริง  │   │ label +  │   │ training │   │ flux     │
│          │   │          │   │ rate lim │   │ + เมนู   │   │          │
└─────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
        user แก้ label → เก็บ hash + annotations ลง D1, รูปขึ้น R2
        เจอรูปเดิม/คล้ายกัน → โหลด label เดิม (ข้าม YOLO + Gemini)
```

## 🔄 Flow สแกนรูป

```
กดเปิดกล้อง / กดเลือกไฟล์ → เริ่มโหลดโมเดลคู่ขนาน (prefetch, ไม่มีใครรอ)
อัปรูป → ย่อเหลือด้านยาว 1024px
  → แคชใน memory? → แสดงทันที
  → hash รูป (SHA-256 + dHash)
      → เจอเป๊ะใน DB? → โหลด label (ข้ามการตรวจจับ)
      → เจอรูปคล้ายกัน (Hamming ≤ 8)? → โหลด label เดิม (ข้ามการตรวจจับ)
  → ไม่เจอ → ใช้โมเดลที่ prefetch ไว้ (หรือรอโหลดถ้ายังไม่เสร็จ) → เดาในเบราว์เซอร์
      → ส่ง label ที่เดา + รูป ให้ Gemini ตัดสิน
      → ไม่ใช่รูปของกิน / เป็นจานที่ทำเสร็จแล้ว → ปฏิเสธรูป บอกเหตุผลผู้ใช้
      → Gemini คืน confirmed (ของที่ YOLO เดาถูก) + added (ของที่ YOLO พลาด)
      → กรอบที่ Gemini ไม่ยืนยัน = ของมั่ว ตัดทิ้ง
  → user กด "แก้ไข" → วาดกรอบ / เลือกชื่อ → กด "เสร็จสิ้น"
  → บันทึก hash + annotations ลง D1 และอัพรูปขึ้น R2
```

> 💡 หน้าแกลเลอรีแสดงแค่ **รายการวัตถุดิบ** ไม่โชว์กรอบทับรูป เพื่อไม่ให้ผู้ใช้ทั่วไปสับสน — กรอบจะเห็นเฉพาะในหน้า **แก้ไข** ที่ตั้งใจเข้าไปช่วย label

## 🧰 Tech Stack

- ⚛️ **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Motion (`motion/react`)
- 🎯 **Object Detection:** YOLO11n → TensorFlow.js Graph Model (`public/model/v2/`, float16) โหลดแบบ dynamic import
- 🔮 **AI ตัดสินภาพ + สร้างสูตร:** Google Gemini (`gemini-3.1-flash-lite`)
- 🗄️ **Database:** Cloudflare D1 (SQLite) — label memory + แคชรูปเมนู + ตัวนับ rate limit
- 🪣 **Object Storage:** Cloudflare R2 — รูป training + รูปเมนูที่ gen แล้ว
- 🎨 **Image API:** Cloudflare Workers AI — รูปเมนู (`@cf/black-forest-labs/flux-1-schnell`)
- 🔌 **SDK:** `@google/genai` (D1 / R2 / Workers AI เรียกผ่าน Cloudflare REST API ตรง ๆ)
- 🚀 **Runtime/Deploy:** Bun + `@opennextjs/cloudflare` → Cloudflare Workers (`wrangler.jsonc`)
- 🧪 **Test:** `bun test` (`tests/utils.test.ts`)

## 🚀 เริ่มใช้งาน

### 1️⃣ Dependencies

```bash
bun install   # หรือ npm install
```

### 2️⃣ Environment Variables 🔐

สร้างไฟล์ `.env` ที่ root โปรเจกต์:

```env
GEMINI_API_KEY=your_gemini_key
GEMINI_DETECT_API_KEY=your_second_gemini_key

CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_d1_database_id
CLOUDFLARE_R2_BUCKET=your_r2_bucket_name
```

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — สร้างสูตร |
| `GEMINI_DETECT_API_KEY` | key ตัวที่ 2 สำหรับตัดสินภาพ (แยกโควตา free tier จากการสร้างสูตร) — ไม่ตั้งก็ได้ จะ fallback ไปใช้ `GEMINI_API_KEY` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → Account ID |
| `CLOUDFLARE_API_TOKEN` | API token สิทธิ์ **Workers AI: Read + D1: Edit + R2 Storage: Edit** |
| `CLOUDFLARE_D1_DATABASE_ID` | ได้จากตอนสร้าง DB (`wrangler d1 create`) หรือ Dashboard → D1 |
| `CLOUDFLARE_R2_BUCKET` | ชื่อ bucket R2 สำหรับเก็บรูป training — ถ้าไม่ตั้งจะข้ามการอัพรูป แต่ยังเซฟ label ได้ |

> 💡 **ทำไมต้องมี Gemini 2 key?** free tier จำกัดจำนวน request ต่อวัน**ต่อ project** การแยก key ให้งาน "ตัดสินภาพ" กับ "สร้างสูตร" ทำให้แต่ละงานมีโควตาของตัวเอง ไม่แย่งกัน (ต้องสร้างคนละ Google Cloud project ถึงจะแยกโควตาได้จริง)

> 🧪 ตอนรัน `bun run cf:preview` ในเครื่อง wrangler จะอ่านค่าลับจาก `.dev.vars` ไม่ใช่ `.env` — copy ค่าชุดเดียวกันไปไว้ที่นั่นด้วย (ทั้งสองไฟล์อยู่ใน `.gitignore` แล้ว)

### 3️⃣ ตั้งค่า Cloudflare D1 + R2 ☁️

```bash
# สร้าง D1 database — จด database_id ที่ได้ใส่ .env
npx wrangler d1 create chef-kub

# สร้าง R2 bucket สำหรับเก็บรูป training
npx wrangler r2 bucket create chefkub
```

สร้างตารางใน D1 (รันครั้งเดียว):

```sql
CREATE TABLE classes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name_th         TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  source          TEXT NOT NULL DEFAULT 'seed'   -- 'seed' | 'user'
);

CREATE TABLE images (
  id           TEXT PRIMARY KEY,                  -- uuid
  width        INTEGER NOT NULL,
  height       INTEGER NOT NULL,
  session_id   TEXT,
  image_hash   TEXT NOT NULL UNIQUE,              -- SHA-256 ของไฟล์
  phash        TEXT,                              -- dHash 64 bit (hex)
  storage_path TEXT,                              -- key ของรูปใน R2
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE annotations (
  id         TEXT PRIMARY KEY,                    -- uuid
  image_id   TEXT NOT NULL REFERENCES images(id),
  class_name TEXT NOT NULL,
  class_id   INTEGER REFERENCES classes(id),
  x_center   REAL NOT NULL,                       -- YOLO normalized
  y_center   REAL NOT NULL,
  width      REAL NOT NULL,
  height     REAL NOT NULL,
  source     TEXT NOT NULL                        -- 'yolo' | 'gemini' | 'manual'
);

CREATE TABLE recipe_images (
  storage_path TEXT PRIMARY KEY,                  -- key ของรูปเมนูใน R2
  dish_name    TEXT NOT NULL,                     -- ชื่อเมนู (normalize แล้ว)
  style        TEXT NOT NULL,                     -- 'photo' | 'anime'
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rate_limits (
  bucket       TEXT PRIMARY KEY,                  -- '<action>:<ip>'
  window_start INTEGER NOT NULL,                  -- เลข window (floor(epoch_ms / 1 ชม.))
  hits         INTEGER NOT NULL                   -- จำนวนครั้งใน window ปัจจุบัน
);
```

> ⚠️ ตาราง `rate_limits` **ต้องมีก่อน deploy สาธารณะ** — ถ้าไม่มี ตัวจำกัดจะปล่อยผ่านทุกคำขอ
> (fail-open โดยตั้งใจ เพื่อไม่ให้ D1 สะดุดแล้วแอปล่มทั้งระบบ) แปลว่าโควตา AI ไม่มีอะไรคุ้มกัน

> เปิดแอปครั้งแรก → ระบบ seed class จาก `labelsTh.ts` เข้าตาราง `classes` อัตโนมัติ และจะเติม label ใหม่ที่เพิ่มใน `labelsTh.ts` ให้ทุกครั้งที่โหลดรายการ class

### 4️⃣ คำสั่งที่ใช้บ่อย ▶️

```bash
bun dev                  # http://localhost:3000
bun test                 # unit test ของ utils
bun run lint

bun run cf:build         # build เป็น worker (OpenNext)
bun run cf:preview       # รัน worker ในเครื่อง (อ่าน secret จาก .dev.vars)
bun run cf:deploy        # deploy ขึ้น Cloudflare Workers

bun run quantize-model public/model/v1 public/model/v2   # float32 → float16
bun run compare-models  public/model/v1 public/model/v2  # เทียบ output ดิบสองโมเดล
bun run export-dataset   # ดึง annotations จาก D1 ออกมาเป็น YOLO dataset
```

> ⚠️ `export-dataset` ชี้ไปที่ `training/export-dataset.ts` ซึ่ง**ยังไม่ได้ commit เข้า repo** — ต้องเพิ่มไฟล์ก่อนถึงจะรันได้

## 📁 โครงสร้างโปรเจกต์

```
app/
├── actions/                    # Server Actions (ทุกตัวผ่าน rate limit ก่อนแตะโมเดล)
│   ├── detectIngredients.ts    # Gemini ตัดสินภาพ + ด่านกันรูปที่ไม่ใช่วัตถุดิบ
│   ├── generateRecipe.ts       # Gemini สร้างสูตร (ตามโหมด + อุปกรณ์ครัวที่มี)
│   ├── generateRecipeImage.ts  # Workers AI สร้างรูปเมนู — เอาจากแคชก่อนเสมอ
│   ├── getCachedRecipeImages.ts # ถามทีเดียวว่าเมนูไหนมีรูปในแคชแล้วบ้าง
│   ├── saveLabeledImage.ts     # บันทึก hash + annotations ลง D1, อัพรูปขึ้น R2
│   ├── getLabeledImage.ts      # หา label จากรูปเดิม (SHA-256) หรือรูปคล้าย (dHash)
│   └── classes.ts              # รายการ class + เพิ่มชื่อใหม่ (seed จาก labelsTh.ts)
├── hooks/
│   ├── useChefKub.ts           # state หลักของแอป
│   ├── useYoloModel.ts         # โหลด/prefetch โมเดล + เลือกเวอร์ชันน้ำหนัก
│   ├── useWakeLock.ts          # กันจอดับระหว่างทำอาหาร
│   └── useHeartPop.ts          # animation ตอนกดหัวใจ
├── components/
│   ├── LabelPickerModal.tsx    # เลือก/เพิ่มชื่อวัตถุดิบ (+ ยืนยันเมื่อชื่อคล้ายของเดิม)
│   ├── NoticeModal.tsx         # แจ้งเตือนในแอปแทน alert()
│   ├── StepTimer.tsx           # จับเวลาขั้นตอนทำอาหาร
│   ├── RatingStars.tsx         # ให้ดาวเมนูที่ทำเสร็จ
│   ├── ShareSheet.tsx          # แชร์สูตร (ข้อความ / การ์ดรูป)
│   ├── Portal.tsx              # render modal นอก DOM tree หลัก
│   ├── EmptyState.tsx / Icons.tsx / LoadingOverlay.tsx
│   ├── motion/                 # Confetti, Reveal, ScrollProgress, SheetShell,
│   │                           # ViewTransition, MotionProvider
│   ├── RecipeCard / RecipeHeroCard / RecipeCompactCard
│   └── views/                  # Home, Camera, Edit, Recipes, Cook, Favorites, Setting
├── api/recipe-image/[...path]/ # เสิร์ฟรูปเมนูจาก R2 (แคช 1 ปี)
├── lib/
│   ├── rateLimit.ts            # fixed window ต่อ IP ต่อชั่วโมง เก็บตัวนับใน D1
│   ├── recipeImageCache.ts     # key ของรูปเมนู + index ใน D1
│   ├── yolo/runYoloDetection.ts
│   └── cloudflare/
│       ├── d1.ts               # query D1 ผ่าน REST API
│       └── r2.ts               # อัพ/ดึงรูปจาก R2 ผ่าน REST API
├── types/                      # recipe.ts, imageResult.ts, kitchen.ts
└── utils/
    ├── labels.ts / labelsTh.ts   # class ของ YOLO + คำแปลไทย (~122)
    ├── thaiLabelOptions.ts       # รายชื่อไทยที่ใช้ seed ตาราง classes
    ├── classRegistry.ts          # class list ฝั่ง client
    ├── cookingModes.ts           # โหมดทำอาหาร + tag เมนู + สไตล์รูป
    ├── downscaleImage.ts         # ย่อรูปก่อนส่งเข้า server action
    ├── imageHash.ts              # SHA-256 (รูปเดิมเป๊ะ ๆ)
    ├── perceptualHash.ts         # dHash 64 bit (รูปคล้ายกัน)
    ├── normalizeLabel.ts         # normalize ชื่อ + หาชื่อที่คล้ายกัน
    ├── mergeIngredients.ts       # รวมวัตถุดิบชื่อซ้ำจากหลายรูป
    ├── toYoloBBox.ts             # แปลงพิกัดกรอบ (pixel ↔ YOLO normalized)
    ├── scaleIngredient.ts        # สเกลปริมาณวัตถุดิบตามจำนวนที่
    ├── parseStepDuration.ts      # อ่านเวลาจากข้อความขั้นตอน → ตั้ง timer
    ├── shareRecipe.ts            # แชร์สูตรผ่าน Web Share API
    ├── recipeCard.ts             # วาดการ์ดสูตรเป็นรูป (feed 1:1 / story 9:16)
    ├── sessionId.ts              # id ของ session ใช้เป็น prefix key ใน R2
    └── storage/                  # localStorage (โปรด + ประวัติ + cookLog + อุปกรณ์ครัว)

scripts/
├── quantize-model.ts           # แปลงน้ำหนัก tfjs float32 → float16
└── compare-models.ts           # รันสองโมเดลด้วย input เดียวกันแล้วเทียบ output ดิบ

tests/utils.test.ts             # unit test ของ utils ที่พังแล้วเจ็บ (bun test)
public/model/v1/                # โมเดล YOLO float32 (10.8MB) — ตัวสำรอง
public/model/v2/                # โมเดล YOLO float16 (5.4MB) — ตัวที่ใช้อยู่
public/speedtest.html           # หน้าวัดเวลาโหลด v1 vs v2 บนเน็ตจริง (noindex)
public/_headers                 # Cache-Control ของไฟล์ที่ Workers Static Assets เสิร์ฟเอง
public/shots/                   # ภาพหน้าจอที่ใช้ใน README
wrangler.jsonc                  # ตั้งค่า Cloudflare Worker (OpenNext)
open-next.config.ts             # adapter Next → Workers
```

---

# 🔧 เบื้องหลังการตัดสินใจ

ส่วนนี้คือ "ทำไมถึงทำแบบนี้" ของจุดที่ตัดสินใจยาก — ไม่ใช่แค่มีอะไรบ้าง

## 🏋️ น้ำหนักโมเดล: ทำให้ครั้งแรกไม่ทรมาน

โมเดลรันในเบราว์เซอร์ แปลว่าผู้ใช้ต้องดาวน์โหลดน้ำหนักเองครั้งแรก — ต้นทุนก้อนนี้ตกอยู่กับ
คนที่เน็ตช้าที่สุดเสมอ จึงบีบจากสองทางพร้อมกัน: **ทำให้ไฟล์เล็กลง** และ **ย้ายเวลาโหลดไปอยู่ในช่วงที่ผู้ใช้ไม่ได้รอ**

### 1. ควอนไทซ์ float32 → float16 (10.8MB → 5.4MB)

`scripts/quantize-model.ts` แปลงน้ำหนักของโมเดลเดิมเป็น float16 — **น้ำหนักชุดเดียวกันเป๊ะ ๆ
แค่เก็บด้วย bit น้อยลง** ไม่ได้เทรนใหม่ ตอนโหลด `tf.io.decodeWeights` คลายกลับเป็น float32 ให้เอง
กราฟจึงไม่รู้ตัวด้วยซ้ำว่าไฟล์ที่โหลดมาถูกบีบไว้

- ไม่ใช้ `tensorflowjs_converter` เพราะมันควอนไทซ์ได้ตอน "แปลงจากโมเดลต้นทาง" (.pt / SavedModel) ซึ่งเครื่องนี้ไม่มีแล้ว — แต่ฟอร์แมตปลายทางของ tfjs ออกแบบมาให้เขียน `quantization` ลง `weightsManifest` ทีหลังได้อยู่แล้ว
- ข้าม tensor ที่ไม่ใช่ float32 (พวก shape constant ที่เป็น int32) เพราะ tfjs รับ float16 เฉพาะกับ float32
- สคริปต์เช็คให้ทุกครั้งว่ามีค่าไหน**ล้นเกิน 65504 จนกลายเป็น Infinity** ไหม — ถ้ามีคือพังทั้งโมเดล จะ exit 1 ไม่ยอมเขียนไฟล์ให้ใช้
- `scripts/compare-models.ts` รันทั้งสองโมเดลด้วย input เดียวกันบน CPU backend แล้วเทียบ output ดิบ เพื่อยืนยันว่าผลตรวจจับไม่เพี้ยน ไม่ใช่ดูแค่ค่า error ของน้ำหนัก
- `public/speedtest.html` วัดเวลาโหลดจริงของ v1 vs v2 บนเน็ตเครื่องนั้น (ยิง shard พร้อมกันแบบเดียวกับที่ tfjs ทำ) — สลับลำดับทุกรอบเพื่อไม่ให้ตัวที่โหลดก่อนได้เปรียบ

### 2. Prefetch ตั้งแต่ผู้ใช้ "ส่อแวว"

เดิมโมเดลเริ่มโหลดตอนกดชัตเตอร์เสร็จ — ผู้ใช้ยืนรอเปล่า ๆ ทั้งก้อน
ตอนนี้ `prefetchModel()` ถูกยิงตอน **กดเปิดกล้อง** และ **กดปุ่มเลือกไฟล์** ซึ่งเป็นจังหวะที่
ผู้ใช้ยังต้องกด permission / เล็งภาพ / ไล่หารูปอีกหลายวินาที — เวลาว่างตรงนั้นเอามาโหลดฟรี ๆ

- ไม่มีใครรอผลของ prefetch — โหลดไม่ทันก็แค่ไปรอต่อที่ `ensureModel()` เหมือนเดิม
- ใช้ `onClick` ไม่ใช่ `onPointerDown` บนปุ่มอัปโหลด เพราะแค่เอานิ้วแตะเพื่อเลื่อนหน้าจอไม่ควรดึงไฟล์หลายเมกฯ
- เก็บเป็น **promise** ไม่ใช่ผลลัพธ์ — กดสแกนรูปที่สองระหว่างรูปแรกยังโหลดไม่เสร็จต้องเกาะ promise เดิม ไม่ใช่สั่งโหลดซ้ำ
- แยก `settled` ออกจาก `pending` เพราะพอมี prefetch แล้ว "สั่งโหลดไปแล้ว" ไม่ได้แปลว่า "โหลดเสร็จแล้ว" อีกต่อไป — ข้อความ "ครั้งแรกโหลดนานหน่อย" ต้องดูตัวที่เสร็จจริง

### 3. Path มีเลขเวอร์ชัน + สลับได้จาก URL

ไฟล์โมเดลถูกแคชแบบ `immutable` หนึ่งปี (`public/_headers`) ซึ่งปลอดภัยได้เพราะ path มีเลขเวอร์ชันคั่น

> ⚠️ เปลี่ยนน้ำหนักเมื่อไหร่ **ต้องขึ้นเลขใหม่** แล้วเพิ่มใน `MODEL_VERSIONS` — ถ้าทับไฟล์เดิม
> เครื่องที่เคยเข้าเว็บแล้วจะใช้ของเก่าต่อไปเงียบ ๆ โดยไม่มี error ให้เห็น รู้ตัวอีกทีคือผลตรวจจับแย่ลงเฉพาะกับคนกลุ่มนั้น

- `?model=v1` บังคับใช้เวอร์ชันเก่าได้โดยไม่ต้อง deploy ใหม่ — จำเป็นเพราะบน iPhone เปิด devtools ไม่ได้ถ้าไม่มี Mac ต้องเทียบด้วยการถ่ายรูปเดิมสองรอบเอา (ตอนถูกบังคับ ข้อความรอจะต่อท้าย `[v1]` ให้เห็นบนจอว่าสลับติดจริง)
- ค่าจาก URL ถูกเช็คกับรายชื่อที่อนุญาตก่อนเสมอ ไม่เอาไปต่อ path ตรง ๆ — ไม่งั้นใครก็ส่ง `?model=../..` มาชี้ให้โหลดไฟล์อะไรก็ได้เข้ามารันเป็นโมเดล
- ถ้าพบว่า v2 แย่ลง เปลี่ยน `DEFAULT_MODEL_VERSION` กลับเป็น `"v1"` ได้ทันที ไฟล์ยังอยู่ครบ — **ห้ามลบ v1** จนกว่าจะแน่ใจ (และเผื่อเครื่องที่ยังแคช bundle เก่าซึ่งขอ v1 อยู่)
- โหลดโมเดลไม่ได้ / เครื่องแรงไม่พอ (ไม่มี webgl หรือ webgpu) → คืน `null` แล้วปล่อยให้ Gemini ตัดสินคนเดียว ซึ่งยังใช้งานได้ครบ

## 🛡️ ตัวจำกัดการใช้งาน (Rate limit)

Server action ของ Next เป็น endpoint ที่ยิงจากข้างนอกได้ตรง ๆ ไม่ต่างจาก REST — เปิดสาธารณะโดยไม่คุมอะไรเลยแปลว่าใครก็เขียน loop เผาโควตา Gemini / Workers AI ได้ จึงคุมด้วย **fixed window ต่อ IP ต่อชั่วโมง** เก็บตัวนับไว้ใน D1 (serverless หลาย instance แชร์ตัวนับใน memory กันไม่ได้)

| action | เพดาน/ชม./IP | ทำไมเท่านี้ |
|--------|--------------|-------------|
| `detect` | 30 | Gemini vision — แพงสุดฝั่ง Gemini เพราะส่งรูปเข้าไปด้วย |
| `recipes` | 30 | Gemini text |
| `image` | 20 | Workers AI กินโควตา neurons ที่ฟื้นวันละครั้ง |
| `label` | 60 | เขียน R2 + D1 ไม่เรียกโมเดล ต้นทุนต่อครั้งต่ำกว่ามาก |

- นับแบบ **atomic ใน statement เดียว** (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`) ไม่งั้นคำขอที่มาพร้อมกันจะอ่านค่าเก่าตัวเดียวกันแล้วทะลุเพดานไปทั้งคู่
- แถวของ window เก่าถูกกวาดทิ้งแบบสุ่ม (2% ของคำขอ) ไม่ต้องตั้ง cron
- อ่าน IP จาก `cf-connecting-ip` ก่อน แล้วค่อย `x-forwarded-for` — **ถ้า self-host ต้องมี reverse proxy คั่นเสมอ** ไม่งั้นผู้ใช้ปลอมเฮดเดอร์เองได้
- ไม่ตั้งเพดานรวมทั้งระบบต่อวัน เพราะนั่นแปลว่าคนเดียวยิงจนเต็มแล้วทุกคนใช้ไม่ได้ — กลายเป็นช่อง DoS เสียเอง

## 🗃️ ฐานข้อมูล (Cloudflare D1 + R2)

| ที่เก็บ | หน้าที่ |
|---------|--------|
| `images` (D1) | รูปที่ label แล้ว — เก็บ `image_hash` (SHA-256), `phash` (dHash), ขนาดรูป และ `storage_path` ที่ชี้ไปยังไฟล์ใน R2 |
| `annotations` (D1) | กรอบ + ชื่อ class (YOLO normalized format) + แหล่งที่มาของ label |
| `classes` (D1) | รายการชื่อวัตถุดิบ (`seed` จาก dataset เดิม / `user` เพิ่มใหม่) |
| `recipe_images` (D1) | index ของรูปเมนูที่ gen แล้ว — บอกว่าเมนูไหนมีรูปอยู่ใน R2 แล้ว |
| `rate_limits` (D1) | ตัวนับคำขอต่อ IP ต่อ window |
| R2 bucket | ไฟล์รูปจริง — รูป training (key = `<sessionId>/<imageId>.<ext>`) และรูปเมนู (key = `recipes/<style>/<sha256>.jpg`) |

### 🧬 การจับรูปคล้ายกัน

- Client คำนวณ **dHash 64 bit**: ย่อรูปเหลือ 9×8 grayscale แล้วเทียบความสว่างพิกเซลข้างเคียง
- Server เทียบกับ hash ในตาราง `images` ด้วย **Hamming distance** — ต่างกัน ≤ 8 bit ถือว่าเป็นรูปเดียวกัน (สแกนรูปล่าสุดสูงสุด 1000 รูป)
- ทนต่อการ resize / บีบอัด / ปรับแสงเล็กน้อย แต่ถ้าครอปหรือหมุนรูปจะถือเป็นรูปใหม่

## 🖼️ แคชรูปเมนู

รูปเมนูจาก Workers AI กิน neurons ซึ่ง free tier มีโควตารายวัน จึง gen ซ้ำไม่ได้:

1. `generateRecipeImage` hash `<style>:<ชื่อเมนู>` เป็น key แล้วถาม `recipe_images` ใน D1 ว่าเคย gen แล้วหรือยัง
2. เคยแล้ว → คืน URL `/api/recipe-image/<style>/<hash>.jpg` ทันที ไม่แตะ Workers AI เลย
3. ยังไม่เคย → gen ใหม่ → อัพขึ้น R2 → บันทึกลง `recipe_images`

เมนูชื่อเดิมสไตล์เดิมจึงจ่าย neurons แค่ครั้งเดียวตลอดกาล และรูปที่ส่งกลับเป็น URL สั้น ๆ
ไม่ใช่ base64 ทั้งก้อน — เมนูที่กดหัวใจไว้ใน localStorage เลยไม่บวมจนชนโควตาเบราว์เซอร์

**และ gen เท่าที่ผู้ใช้ดูจริง** — หน้าเมนูไม่ gen รูปให้ทุกใบอีกแล้ว:

| จังหวะ | ทำอะไร | จ่าย neurons |
|--------|--------|--------------|
| เปิดหน้าเมนู | `getCachedRecipeImages` ถาม `recipe_images` ทีเดียวทุกเมนู เติมรูปที่เคย gen ไว้เข้า state | 0 |
| เปิดหน้าเมนู | gen สดเฉพาะการ์ดใบแรก (ถ้ายังไม่มีในแคช) | ≤ 1 รูป |
| กด "เริ่มทำอาหาร" | `ensureRecipeImage` gen รูปของเมนูนั้นถ้ายังไม่มี แล้วเติมกลับเข้าการ์ด + รายการโปรด | ≤ 1 รูป |

ผู้ใช้เปิดทำจริงแค่เมนูเดียวจาก 3 เมนู รอบหนึ่งจึงเสีย 1-2 รูปแทนที่จะเป็น 3
และยิ่งใช้ไปแคชยิ่งเต็ม เมนูยอดฮิตก็ไม่ต้อง gen อีกเลย

**และรูปหนึ่งใบก็ถูกลงด้วย** — Workers AI คิดเงิน flux เป็น tile ขนาด 512×512 (ปัดขึ้น)
คูณจำนวน steps ขนาดรูปจึงกระโดดเป็นขั้น ไม่ใช่ค่อย ๆ ไล่ตามพิกเซล:

| ขนาด | tile ที่จ่าย |
|------|-------------|
| 1024×576 (16:9 เป๊ะ) | 2 × 2 = 4 |
| **1024×512 (ที่ใช้จริง)** | 2 × 1 = **2** |

576 ล้นเส้น 512 ไปแค่ 64px แต่โดนคิดเต็มแถวที่สอง ทั้งที่การ์ดครอปด้วย `object-cover`
อยู่แล้วจนตาแทบไม่เห็นความต่าง คู่กับ `steps: 2` (schnell ถูก distill มาให้ทำงานที่ 1-4
steps) รูปหนึ่งใบจึงเหลือ ~1/4 ของราคาเดิม

นอกจากนี้คำขอที่โดนตัวกรอง NSFW ก็รัน inference ไปแล้วและจ่ายเท่ากับที่สำเร็จ —
retry เคสนี้จึงหยุดที่ 2 ครั้ง (ครอบคลุม ~97% อยู่ดี) และเมนูเดียวกันที่ gen ค้างอยู่
จะถูก dedupe ด้วย promise ร่วมกัน ไม่ให้สองคำขอพร้อมกันจ่ายสองรอบให้รูปใบเดียว

**รูปโผล่ที่ไหนบ้าง** — `RecipeHeroCard` (การ์ดใบแรกของหน้าเมนู) กับ `CookView` เท่านั้น
การ์ดเมนูรองใน grid (`RecipeCard`) เป็นการ์ดข้อความล้วนโดยตั้งใจ ไม่โชว์รูปแม้จะมีในแคช —
กรอบรูปเปล่าเต็มหน้าจอดูเหมือนแอปพัง และการ์ดข้อความล้วนก็สแกนหาเมนูได้ไวกว่า
ที่ยังถามแคชตอนเปิดหน้าเมนูเพราะเมนูที่มีรูปอยู่แล้วจะเด้งรูปทันทีตอนกดเข้าไปทำ ไม่ต้องรอ gen

> ⚠️ เช็คว่ามีไฟล์แล้วหรือยังต้องถาม D1 เท่านั้น ถาม R2 ตรง ๆ ไม่ได้ — REST API ของ R2
> เสิร์ฟผ่าน edge cache ที่แคช 404 ไว้หลายนาที รูปที่เพิ่งอัพจะกลายเป็น "ไม่มี" แล้ว gen ซ้ำ

## 📹 กล้อง: ทำไม stream ถึงต่อในคอมโพเนนต์ ไม่ใช่ใน hook

`CameraView` รับ `MediaStream` เป็น prop แล้วต่อเข้า `<video>` ด้วย effect ของตัวเอง

- **ViewTransition ใช้ `mode="wait"`** — หน้ากล้อง mount ช้ากว่าที่กด "สแกน" ราว 150ms ถ้ารอบสองที่ permission ผ่านแล้ว `getUserMedia` resolve เร็วกว่านั้น effect ที่อยู่ใน hook จะวิ่งตอน `<video>` ยังไม่เกิด แล้วไม่มีใครวิ่งซ้ำ = **จอดำ** ส่วน effect ในคอมโพเนนต์การันตีว่าได้ element แน่นอน ไม่ว่า stream จะมาก่อนหรือหลัง mount
- `capturePhoto(video)` รับ element มาจากตัวที่ถูกกดจริง ๆ ไม่ใช้ ref ก้อนกลาง เพราะ layout จอเล็ก/จอใหญ่ mount `CameraView` ไว้พร้อมกันทั้งคู่ ref เดียวจะโดนทับกัน
- กันถ่ายตอนเฟรมแรกยังไม่มา (`!video.videoWidth`) ไม่ให้ภาพ 0×0 หลุดเข้าโมเดล

## 🎭 โหมดทำอาหาร

| โหมด | สไตล์เมนู | สไตล์รูป |
|------|----------|----------|
| 🍳 ปกติ | อาหารบ้าน ๆ ที่คุ้นเคย ทำได้ชัวร์ | โฟโต้ |
| 🌏 ฟิวชั่น | จับอาหารสองชาติมาชนกัน | โฟโต้ |
| 🍜 จากอนิเมะ | เมนูที่ปรากฏในอนิเมะ/ภาพยนตร์/ซีรีส์ | ภาพวาด (cel shading) |

## 🔁 วงจรพัฒนาโมเดล

```
Gemini ยืนยันกรอบ → user แก้/เพิ่มใน หน้าแก้ไข → เก็บลง D1 + R2
        → export dataset → train YOLO ใหม่ → YOLO แม่นขึ้น
        → เรียก Gemini น้อยลง → ประหยัดโควตา
```

---

## 🚢 Deploy

Deploy ขึ้น **Cloudflare Workers** ผ่าน OpenNext (`bun run cf:deploy`) แล้วตั้งค่าลับทั้งหมดเป็น secret ของ worker:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GEMINI_DETECT_API_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_D1_DATABASE_ID
npx wrangler secret put CLOUDFLARE_R2_BUCKET
```

- ไฟล์ใน `public/` (รวมน้ำหนักโมเดล YOLO) เสิร์ฟผ่าน **Workers Static Assets** ซึ่งแยกจากขนาด worker script จึงไม่กินโควตา bundle
- ยังไม่เปิด incremental cache / tag cache ใน `open-next.config.ts` เพราะแอปนี้ไม่ได้ใช้ ISR หรือ `revalidateTag` — หน้าเป็น static ล้วนกับ server action ที่คิดสดทุกครั้ง

> 🔀 deploy ขึ้น Vercel ก็ยังได้ (`bun run build` + `vercel deploy`) แค่ตั้ง Environment Variables ชุดเดียวกันใน dashboard — ตัวอ่าน IP ของ rate limit รองรับทั้ง `cf-connecting-ip` และ `x-forwarded-for`

## ⚠️ ข้อจำกัด

- YOLO รู้จักแค่ class ในโมเดลปัจจุบัน (~122) — class ใหม่ (เช่น ใบโหระพา) ต้อง train โมเดลใหม่ (รูปที่ label แล้วถูกเก็บใน R2 ไว้เพื่อการนี้)
- Label YOLO เดิมเป็นภาษาอังกฤษ — แปลเป็นไทยด้วย mapping ใน `labelsTh.ts`
- ครั้งแรกยังต้องดาวน์โหลดน้ำหนัก 5.4MB — prefetch แค่ย้ายเวลาไปอยู่ในช่วงที่ผู้ใช้ไม่ได้รอ ไม่ได้ทำให้ฟรี
- ต้องมี WebGL/WebGPU ถึงจะรัน YOLO ได้ — เครื่องที่ไม่มีจะข้ามไปให้ Gemini ตัดสินคนเดียว (ยังใช้ได้ครบ แค่ไม่มีกรอบจาก YOLO)
- การจับรูปคล้ายใช้ dHash — รูปที่ครอป/หมุน/องค์ประกอบเปลี่ยนมากจะถือเป็นรูปใหม่ (ตั้งใจ เพื่อไม่ให้ label ผิดรูป)
- รับเฉพาะรูป **วัตถุดิบ** — รูปอาหารที่ทำเสร็จแล้วหรือรูปที่ไม่มีของกินจะถูกปฏิเสธ (Gemini เป็นคนตัดสิน จึงพลาดได้บ้างกับรูปก้ำกึ่ง)
- โมเดลสร้างรูปอ่านภาษาไทยไม่ออก — Gemini จึงคืน `imagePrompt` ภาษาอังกฤษมาบรรยายหน้าตาจานแทนชื่อเมนู
- Gemini free tier มีโควตารายวัน — โดน 429 จะขึ้นสถานะ "quota" แล้ว fallback ไปแสดงผล YOLO ดิบ ๆ แทน (แยก key detect/gen ช่วยยืดโควตาได้)
- Workers AI free tier ให้ 10,000 neurons/วัน ≈ 170 รูป/วัน
- Rate limit จะ **fail-open** เมื่อ D1 ล่มหรือยังไม่ได้ตั้งค่า — ตอน dev จึงยิงได้ไม่จำกัด
- อุปกรณ์ครัว / รายการโปรด / ประวัติ / คะแนนดาว เก็บใน localStorage ของเครื่องนั้น ๆ ล้าง browser data แล้วหาย และไม่ sync ข้ามอุปกรณ์
- โหมดทำครัวใช้ Web Speech API — เสียงขึ้นกับ browser/OS
- Wake Lock API รองรับเฉพาะบางเบราว์เซอร์ (Chrome/Edge/Safari รุ่นใหม่) — ถ้าไม่รองรับจอจะดับตามปกติ

## 👨‍🍳 ผู้พัฒนา

โปรเจกต์จบ — Chef Kub 🧑‍🍳✨

- 👨‍💻 ธนวัฒน์ น้อยหัวหาด (เอ็ม)
- 👨‍💻 พีรภัทร์ ชมภูศรี (พี)

<div align="center">

🍳 *Made with love & a lot of 🍚* 🥢

</div>
