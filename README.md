# Chef Kub — สแกนวัตถุดิบ แนะนำสูตรอาหารไทย

โปรเจกตจบที่ใช้ **Computer Vision + Generative AI** ช่วยผู้ใช้สแกนวัตถุดิบจากรูปภาพ แนะนำสูตรอาหารไทย และจำ label ที่ผู้ใช้เคยแก้ไว้ใน Cloudflare D1 — เจอรูปเดิมหรือรูปที่**คล้ายกัน**ก็โหลด label เดิมได้ทันทีโดยไม่ต้องสแกนซ้ำ

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| ตรวจจับวัตถุดิบ (YOLO) | YOLO11n (~118 class) รันในเบราว์เซอร์ด้วย TensorFlow.js |
| แก้ไข / Label ด้วยมือ | วาดกรอบ เลือกชื่อจากรายการ หรือเพิ่ม class ใหม่ |
| จำ Label | บันทึก bounding box (YOLO format) ลง Cloudflare D1 — ไม่เก็บไฟล์รูป |
| จำรูปเดิม + รูปคล้าย | SHA-256 จับรูปเดิมเป๊ะ ๆ / dHash + Hamming distance จับรูปคล้ายกัน |
| จัดการ Class | ตาราง `classes` กลาง ป้องกันชื่อซ้ำ/คล้ายกัน |
| สร้างสูตรอาหาร | Gemini สร้าง 3 เมนูไทยจากวัตถุดิบที่มี |
| รูปประกอบเมนู | Cloudflare Workers AI (`flux-1-schnell`) สร้างรูปจากชื่อเมนู |
| โหมดทำอาหาร | แสดงขั้นตอนทีละ step + อ่านให้ฟัง (Web Speech API) |
| รายการโปรด / ประวัติ | localStorage |
| กรองเมนู | กรองสูตรตาม tag (เผ็ด, ทำง่าย ฯลฯ) |

## สถาปัตยกรรมระบบ

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│  ผู้ใช้      │────▶│  Frontend (Next.js + React)              │
│  ถ่ายรูป/    │     │  • กล้อง / อัปโหลด                       │
│  อัปโหลด     │     │  • Gallery + แก้ไข label                 │
└─────────────┘     └──────────────┬───────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   ┌─────────────┐         ┌─────────────┐          ┌──────────────┐
   │ YOLO11n     │         │ Cloudflare  │          │ Gemini           │
   │ (TF.js)     │         │ D1 (SQLite) │          │ สร้างสูตร +    │
   │ ในเบราว์เซอร์│         │ label memory│          │ รูปเมนู        │
   └─────────────┘         └─────────────┘          └──────────────┘
          user แก้ label → เก็บ hash + annotations ลง D1
          เจอรูปเดิม/คล้ายกัน → โหลด label เดิม (ข้าม YOLO)
```

## Flow สแกนรูป

```
อัปรูป
  → แคชใน memory? → แสดงทันที
  → hash รูป (SHA-256 + dHash)
      → เจอเป๊ะใน DB? → โหลด label (ข้าม YOLO)
      → เจอรูปคล้ายกัน (Hamming ≤ 8)? → โหลด label เดิม (ข้าม YOLO)
  → ไม่เจอ → YOLO ตรวจจับ → แสดงผล
  → user กด "แก้ไข" → วาดกรอบ / เลือกชื่อ → กด "เสร็จสิ้น"
  → บันทึก hash + annotations ลง Cloudflare D1 (ไม่เก็บไฟล์รูป)
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Object Detection:** YOLO11n → TensorFlow.js Graph Model (`public/model/`)
- **Database:** Cloudflare D1 (SQLite) — ไม่มี auto-pause เหมือน Supabase free tier
- **AI API:** Google Gemini — สร้างสูตร (`gemini-3.1-flash-lite`)
- **Image API:** Cloudflare Workers AI — รูปเมนู (`@cf/black-forest-labs/flux-1-schnell`)
- **SDK:** `@google/genai` (D1 เรียกผ่าน Cloudflare REST API ตรง ๆ)

## โครงสร้างโปรเจกต

```
app/
├── actions/
│   ├── saveLabeledImage.ts   # บันทึก hash + annotations ลง D1
│   ├── getLabeledImage.ts    # หา label จากรูปเดิม (SHA-256) หรือรูปคล้าย (dHash)
│   ├── classes.ts            # รายการ class + เพิ่มชื่อใหม่
│   ├── generateRecipe.ts     # Gemini สร้างสูตร
│   └── generateRecipeImage.ts # Workers AI สร้างรูปเมนู
├── hooks/
│   ├── useChefKub.ts         # state หลักของแอป
│   └── useYoloModel.ts       # โหลดโมเดล YOLO
├── components/
│   ├── LabelPickerModal.tsx  # เลือก/เพิ่มชื่อวัตถุดิบ
│   └── views/                # Home, Camera, Edit, Recipes, Cook, Favorites
├── lib/
│   ├── yolo/runYoloDetection.ts
│   └── cloudflare/d1.ts          # query D1 ผ่าน REST API
└── utils/
    ├── labels.ts / labelsTh.ts   # class เดิมของ YOLO (~118)
    ├── classRegistry.ts          # class list ฝั่ง client
    ├── imageHash.ts              # SHA-256 (รูปเดิมเป๊ะ ๆ)
    ├── perceptualHash.ts         # dHash 64 bit (รูปคล้ายกัน)
    ├── toYoloBBox.ts             # แปลงพิกัดกรอบ
    └── storage/                  # localStorage (โปรด + ประวัติ)

cloudflare/
└── schema.sql                  # สร้างตารางทั้งหมด (SQLite สำหรับ D1)

public/model/                   # โมเดล YOLO (model.json + weights)
```

## การติดตั้ง

### 1. Dependencies

```bash
bun install   # หรือ npm install
```

### 2. Environment Variables

สร้างไฟล์ `.env` ที่ root โปรเจกต:

```env
GEMINI_API_KEY=your_gemini_key
GEMINI_DETECT_API_KEY=your_second_gemini_key

CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_d1_database_id
```

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — สร้างสูตร |
| `GEMINI_DETECT_API_KEY` | key ตัวที่ 2 สำหรับ detect วัตถุดิบ (แยกโควตา free tier จาก gen สูตร) — ไม่ตั้งก็ได้ จะ fallback ไปใช้ `GEMINI_API_KEY` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → Account ID |
| `CLOUDFLARE_API_TOKEN` | API token สิทธิ์ **Workers AI: Read + D1: Edit** |
| `CLOUDFLARE_D1_DATABASE_ID` | ได้จากตอนสร้าง DB (`wrangler d1 create`) หรือ Dashboard → D1 |

### 3. ตั้งค่า Cloudflare D1

```bash
npx wrangler d1 create chef-kub                                    # จด database_id ใส่ .env
npx wrangler d1 execute chef-kub --remote --file=cloudflare/schema.sql
```

เปิดแอปครั้งแรก → ระบบ seed class จาก `labelsTh.ts` เข้าตาราง `classes` อัตโนมัติ

### 4. รัน Dev Server

```bash
bun dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## ฐานข้อมูล (Cloudflare D1)

| ตาราง | หน้าที่ |
|-------|--------|
| `images` | รูปที่ label แล้ว — เก็บแค่ `image_hash` (SHA-256), `phash` (dHash) และขนาดรูป **ไม่เก็บไฟล์รูป** |
| `annotations` | กรอบ + ชื่อ class (YOLO normalized format) |
| `classes` | รายการชื่อวัตถุดิบ (`seed` จาก dataset เดิม / `user` เพิ่มใหม่) |

### การจับรูปคล้ายกัน

- Client คำนวณ **dHash 64 bit**: ย่อรูปเหลือ 9×8 grayscale แล้วเทียบความสว่างพิกเซลข้างเคียง
- Server เทียบกับ hash ในตาราง `images` ด้วย **Hamming distance** — ต่างกัน ≤ 8 bit ถือว่าเป็นรูปเดียวกัน
- ทนต่อการ resize / บีบอัด / ปรับแสงเล็กน้อย แต่ถ้าครอปหรือหมุนรูปจะถือเป็นรูปใหม่

## Deploy

```bash
bun run build
vercel deploy
```

ตั้ง Environment Variables ทั้ง 4 ตัวใน Vercel

## ข้อจำกัด

- YOLO รู้จักแค่ class ในโมเดลปัจจุบัน (~118) — class ใหม่ (เช่น ใบโหระพา) ต้อง train โมเดลใหม่
- Label YOLO เดิมเป็นภาษาอังกฤษ — แปลเป็นไทยด้วย mapping ใน `labelsTh.ts`
- การจับรูปคล้ายใช้ dHash — รูปที่ครอป/หมุน/องค์ประกอบเปลี่ยนมากจะถือเป็นรูปใหม่ (ตั้งใจ เพื่อไม่ให้ label ผิดรูป)
- โมเดลสร้างรูปอ่านภาษาไทยไม่ออก — Gemini จึงคืน `imagePrompt` ภาษาอังกฤษมาให้ใช้แทนชื่อเมนู
- Workers AI free tier ให้ 10,000 neurons/วัน ≈ 170 รูป/วัน
- โหมดทำอาหารใช้ Web Speech API — เสียงขึ้นกับ browser/OS

## ผู้พัฒนา

โปรเจกจบ — Chef Kub

- ธนวัฒน์ น้อยหัวหาด (เอ็ม)
- พีรภัทร์ ชมภูศรี (พี)
