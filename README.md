<div align="center">

# 🍳 Chef Kub — สแกนวัตถุดิบ แนะนำสูตรอาหาร 🥘

*📸 ถ่ายรูปวัตถุดิบ → 🤖 AI แนะนำเมนู → 👨‍🍳 ลงมือทำ*

🥕 🍅 🧄 🧅 🥚 🌶️ 🥬 🍆 🐟 🍗

</div>

---

โปรเจกต์จบที่ใช้ **🧠 Computer Vision + ✨ Generative AI** ช่วยผู้ใช้สแกนวัตถุดิบจากรูปภาพ แนะนำสูตรอาหาร และจำ label ที่ผู้ใช้เคยแก้ไว้ใน Cloudflare D1 — เจอรูปเดิมหรือรูปที่**คล้ายกัน**ก็โหลด label เดิมได้ทันทีโดยไม่ต้องสแกนซ้ำ

การตรวจจับใช้ **⚡ YOLO เดาในเบราว์เซอร์ แล้วให้ 🔮 Gemini เป็นคนตัดสินสุดท้าย** — YOLO เร็วแต่ "มั่นใจแต่มั่ว" ได้ Gemini จึงยืนยันของที่เดาถูก เติมของที่ YOLO พลาด และปัดรูปที่ไม่ใช่วัตถุดิบทิ้งตั้งแต่ต้นทาง

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

## ✨ ฟีเจอร์หลัก

### 🔍 สแกน & ตรวจจับ

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 📷 ตรวจจับวัตถุดิบ (YOLO) | YOLO11n (~122 class) รันในเบราว์เซอร์ด้วย TensorFlow.js — โหลดโมเดลแบบ lazy ตอนกดสแกนจริงเท่านั้น |
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
| 🖼️ รูปประกอบเมนู | Cloudflare Workers AI (`flux-1-schnell`) สร้างรูปเมนูใบเด่นกับตอนลงมือทำ แล้วแคชไว้ใน R2 ใช้ซ้ำได้ตลอด |
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
อัปรูป → ย่อเหลือด้านยาว 1024px
  → แคชใน memory? → แสดงทันที
  → hash รูป (SHA-256 + dHash)
      → เจอเป๊ะใน DB? → โหลด label (ข้ามการตรวจจับ)
      → เจอรูปคล้ายกัน (Hamming ≤ 8)? → โหลด label เดิม (ข้ามการตรวจจับ)
  → ไม่เจอ → โหลดโมเดล YOLO (ครั้งแรกเท่านั้น) → เดาในเบราว์เซอร์
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
- 🎯 **Object Detection:** YOLO11n → TensorFlow.js Graph Model (`public/model/`) โหลดแบบ dynamic import
- 🔮 **AI ตัดสินภาพ + สร้างสูตร:** Google Gemini (`gemini-3.1-flash-lite`)
- 🗄️ **Database:** Cloudflare D1 (SQLite) — label memory + แคชรูปเมนู + ตัวนับ rate limit
- 🪣 **Object Storage:** Cloudflare R2 — รูป training + รูปเมนูที่ gen แล้ว
- 🎨 **Image API:** Cloudflare Workers AI — รูปเมนู (`@cf/black-forest-labs/flux-1-schnell`)
- 🔌 **SDK:** `@google/genai` (D1 / R2 / Workers AI เรียกผ่าน Cloudflare REST API ตรง ๆ)
- 🚀 **Runtime/Deploy:** Bun + `@opennextjs/cloudflare` → Cloudflare Workers (`wrangler.jsonc`)
- 🧪 **Test:** `bun test` (`tests/utils.test.ts`)

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
│   ├── useYoloModel.ts         # โหลดโมเดล YOLO แบบ lazy (เก็บ promise กันโหลดซ้ำ)
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

tests/utils.test.ts             # unit test ของ utils ที่พังแล้วเจ็บ (bun test)
public/model/                   # โมเดล YOLO (model.json + weights + metadata.yaml)
public/shots/                   # ภาพหน้าจอที่ใช้ใน README
wrangler.jsonc                  # ตั้งค่า Cloudflare Worker (OpenNext)
open-next.config.ts             # adapter Next → Workers
```

## 🚀 การติดตั้ง

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

### 4️⃣ รัน Dev Server ▶️

```bash
bun dev        # http://localhost:3000
bun test       # unit test ของ utils
bun run lint
```

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

### 🖼️ แคชรูปเมนู

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

### 🧬 การจับรูปคล้ายกัน

- Client คำนวณ **dHash 64 bit**: ย่อรูปเหลือ 9×8 grayscale แล้วเทียบความสว่างพิกเซลข้างเคียง
- Server เทียบกับ hash ในตาราง `images` ด้วย **Hamming distance** — ต่างกัน ≤ 8 bit ถือว่าเป็นรูปเดียวกัน (สแกนรูปล่าสุดสูงสุด 1000 รูป)
- ทนต่อการ resize / บีบอัด / ปรับแสงเล็กน้อย แต่ถ้าครอปหรือหมุนรูปจะถือเป็นรูปใหม่

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

```bash
bun run export-dataset   # ดึง annotations จาก D1 ออกมาเป็น YOLO dataset
```

> ⚠️ สคริปต์นี้ชี้ไปที่ `training/export-dataset.ts` ซึ่ง**ยังไม่ได้ commit เข้า repo** — ต้องเพิ่มไฟล์ก่อนถึงจะรันได้

## 🚢 Deploy

Deploy ขึ้น **Cloudflare Workers** ผ่าน OpenNext:

```bash
bun run cf:build     # opennextjs-cloudflare build
bun run cf:preview   # รัน worker ในเครื่อง (อ่าน secret จาก .dev.vars)
bun run cf:deploy    # opennextjs-cloudflare deploy
```

ตั้งค่าลับทั้งหมดเป็น secret ของ worker:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GEMINI_DETECT_API_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_D1_DATABASE_ID
npx wrangler secret put CLOUDFLARE_R2_BUCKET
```

- ไฟล์ใน `public/` (รวมน้ำหนักโมเดล YOLO ~11MB) เสิร์ฟผ่าน **Workers Static Assets** ซึ่งแยกจากขนาด worker script จึงไม่กินโควตา bundle
- ยังไม่เปิด incremental cache / tag cache ใน `open-next.config.ts` เพราะแอปนี้ไม่ได้ใช้ ISR หรือ `revalidateTag` — หน้าเป็น static ล้วนกับ server action ที่คิดสดทุกครั้ง

> 🔀 deploy ขึ้น Vercel ก็ยังได้ (`bun run build` + `vercel deploy`) แค่ตั้ง Environment Variables ชุดเดียวกันใน dashboard — ตัวอ่าน IP ของ rate limit รองรับทั้ง `cf-connecting-ip` และ `x-forwarded-for`

## ⚠️ ข้อจำกัด

- YOLO รู้จักแค่ class ในโมเดลปัจจุบัน (~122) — class ใหม่ (เช่น ใบโหระพา) ต้อง train โมเดลใหม่ (รูปที่ label แล้วถูกเก็บใน R2 ไว้เพื่อการนี้)
- Label YOLO เดิมเป็นภาษาอังกฤษ — แปลเป็นไทยด้วย mapping ใน `labelsTh.ts`
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
