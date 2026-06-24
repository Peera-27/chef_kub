# Chef Kub — สแกนวัตถุดิบ แนะนำสูตร และเก็บ Dataset สำหรับ Train YOLO

โปรเจกตจบที่ใช้ **Computer Vision + Generative AI** ช่วยผู้ใช้สแกนวัตถุดิบจากรูปภาพ แนะนำสูตรอาหารไทย และเก็บ label จากผู้ใช้ลง Supabase เพื่อนำไป train โมเดล YOLO ใหม่

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| ตรวจจับวัตถุดิบ (YOLO) | YOLO11n (~118 class) รันในเบราว์เซอร์ด้วย TensorFlow.js |
| แก้ไข / Label ด้วยมือ | วาดกรอบ เลือกชื่อจากรายการ หรือเพิ่ม class ใหม่ |
| เก็บ Dataset | บันทึกรูป + bounding box (YOLO format) ลง Supabase |
| จำ Label รูปเดิม | ใช้ `image_hash` โหลด label จาก DB หลัง refresh |
| จัดการ Class | ตาราง `classes` กลาง ป้องกันชื่อซ้ำ/คล้ายกัน |
| สร้างสูตรอาหาร | Gemini สร้าง 3 เมนูไทยจากวัตถุดิบที่มี |
| รูปประกอบเมนู | Unsplash API ค้นหารูปอาหารตามชื่อเมนู |
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
   │ YOLO11n     │         │ Supabase    │          │ Gemini       │
   │ (TF.js)     │         │ Postgres +  │          │ สร้างสูตร    │
   │ ในเบราว์เซอร์│         │ Storage     │          │ Unsplash รูป │
   └──────┬──────┘         └──────┬──────┘          └──────┬───────┘
          │                         │                        │
          │    user แก้ label       │ เก็บ training data     │
          └────────────┬────────────┘                        │
                       ▼                                     ▼
                ┌─────────────┐                       ┌─────────────┐
                │ Export →    │                       │ สร้างสูตร +  │
                │ Train YOLO  │                       │ รูป Unsplash │
                │ ใหม่        │                       └─────────────┘
                └─────────────┘
```

## Flow สแกนรูป

```
อัปรูป
  → แคชใน memory? → แสดงทันที
  → hash รูป → เจอใน DB? → โหลด label (ข้าม YOLO)
  → ไม่เจอ → YOLO ตรวจจับ → แสดงผล
  → user กด "แก้ไข" → วาดกรอบ / เลือกชื่อ → กด "เสร็จสิ้น"
  → บันทึก Supabase (รูป + annotations)
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Object Detection:** YOLO11n → TensorFlow.js Graph Model (`public/model/`)
- **Database:** Supabase (PostgreSQL + Storage)
- **AI API:** Google Gemini (`gemini-flash-latest`) — สร้างสูตรเท่านั้น
- **รูปเมนู:** [Unsplash API](https://unsplash.com/developers) (free tier)
- **SDK:** `@supabase/supabase-js`, `@google/generative-ai`

## โครงสร้างโปรเจกต

```
app/
├── actions/
│   ├── saveLabeledImage.ts   # บันทึกรูป + annotations ลง Supabase
│   ├── getLabeledImage.ts    # โหลด label จาก image_hash
│   ├── classes.ts            # รายการ class + เพิ่มชื่อใหม่
│   ├── generateRecipe.ts     # Gemini สร้างสูตร
│   └── fetchRecipeImage.ts   # Unsplash ค้นหารูปเมนู
├── hooks/
│   ├── useChefKub.ts         # state หลักของแอป
│   └── useYoloModel.ts       # โหลดโมเดล YOLO
├── components/
│   ├── LabelPickerModal.tsx  # เลือก/เพิ่มชื่อวัตถุดิบ
│   └── views/                # Home, Camera, Edit, Recipes, Cook, Favorites
├── lib/
│   ├── yolo/runYoloDetection.ts
│   ├── supabase/server.ts
│   └── foodImageCache.ts     # cache URL รูปเมนู
└── utils/
    ├── labels.ts / labelsTh.ts   # class เดิมของ YOLO (~118)
    ├── classRegistry.ts          # class list ฝั่ง client
    ├── toYoloBBox.ts             # แปลงพิกัดกรอบ
    └── storage/                  # localStorage (โปรด + ประวัติ)

supabase/
├── schema.sql                  # สร้างตารางทั้งหมด
├── migration-classes.sql       # เพิ่มตาราง classes (ถ้ารัน schema เก่าแล้ว)
└── migration-image-hash.sql    # เพิ่มคอลัมน์ image_hash

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

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — สร้างสูตร |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (ใช้ฝั่ง server เท่านั้น) |
| `UNSPLASH_ACCESS_KEY` | [Unsplash Developers](https://unsplash.com/developers) — รูปเมนู |

### 3. ตั้งค่า Supabase

1. สร้าง Storage bucket ชื่อ `training-images` (public: **ปิด**)
2. รัน SQL ใน `supabase/schema.sql` (หรือ migration แยกถ้ามีตารางเก่าอยู่แล้ว)
3. เปิดแอปครั้งแรก → ระบบ seed class จาก `labelsTh.ts` เข้าตาราง `classes` อัตโนมัติ

### 4. รัน Dev Server

```bash
bun dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## ฐานข้อมูล Supabase

| ตาราง | หน้าที่ |
|-------|--------|
| `images` | รูปที่ label แล้ว (`storage_path`, `image_hash`, ขนาดรูป) |
| `annotations` | กรอบ + ชื่อ class (YOLO normalized format) |
| `classes` | รายการชื่อวัตถุดิบ (`seed` จาก dataset เดิม / `user` เพิ่มใหม่) |

Storage: `training-images/{session_id}/{uuid}.jpg`

## นำข้อมูลไป Train YOLO ใหม่

ข้อมูลใน `annotations` เป็น YOLO format อยู่แล้ว — export แล้ว train ได้เลย

```
1. Export จาก Supabase
   ├── ดาวน์โหลดรูปจาก Storage → dataset/images/
   ├── สร้างไฟล์ .txt จาก annotations → dataset/labels/
   └── สร้าง data.yaml จากตาราง classes

2. Train (Python / Colab)
   pip install ultralytics
   yolo train model=yolo11n.pt data=data.yaml epochs=100 imgsz=640

3. แปลงเป็น TensorFlow.js
   yolo export model=best.pt format=tfjs

4. แทนที่ public/model/ และ sync labels.ts ให้ตรง class ใหม่
```

> บันทึกลง DB **ไม่ได้** ทำให้ YOLO ในแอปฉลาดขึ้นทันที — ต้อง train + deploy โมเดลใหม่

## Deploy

```bash
bun run build
vercel deploy
```

ตั้ง Environment Variables ทั้ง 4 ตัวใน Vercel

## ข้อจำกัด

- YOLO รู้จักแค่ class ในโมเดลปัจจุบัน (~118) — class ใหม่ (เช่น ใบโหระพา) ต้อง train โมเดลใหม่
- Label YOLO เดิมเป็นภาษาอังกฤษ — แปลเป็นไทยด้วย mapping ใน `labelsTh.ts`
- รูปที่ label ก่อนมี `image_hash` ต้องกด "เสร็จสิ้น" อีกครั้ง 1 รอบเพื่อให้จำรูปซ้ำได้
- รูปเมนูจาก Unsplash อาจไม่ตรงเมนูไทย 100% (ค้นด้วยชื่อเมนู + "thai food")
- โหมดทำอาหารใช้ Web Speech API — เสียงขึ้นกับ browser/OS

## ผู้พัฒนา

โปรเจกจบ — Chef Kub

- ธนวัฒน์ น้อยหัวหาด (เอ็ม)
- พีรภัทร์ ชมภูศรี (พี)
