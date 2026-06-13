# Chef Kub — ระบบสแกนวัตถุดิบและแนะนำสูตรอาหารด้วย AI

โปรเจกตจบที่ใช้ **Computer Vision + Generative AI** ช่วยผู้ใช้สแกนวัตถุดิบจากรูปภาพ แล้วแนะนำสูตรอาหารไทยพร้อมรูปประกอบ

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| ตรวจจับวัตถุดิบ (YOLO) | โมเดล YOLO11n ฝึกจาก FOOD-INGREDIENTS dataset (~118 class) รันในเบราว์เซอร์ด้วย TensorFlow.js |
| วิเคราะห์ภาพ (Gemini) | Google Gemini Vision ระบุชื่อวัตถุดิบภาษาไทย |
| Hybrid Detection | รวมผล YOLO + Gemini อัตโนมัติ |
| แปล Label | แปลชื่อวัตถุดิบ YOLO (อังกฤษ) เป็นภาษาไทยอัตโนมัติ |
| สร้างสูตรอาหาร | Gemini สร้าง 3 เมนูไทยจากวัตถุดิบที่มี |
| สร้างรูปอาหาร | Gemini Image Gen สร้างรูปตามชื่อเมนู |
| รายการโปรด | บันทึกสูตรที่ชอบด้วย localStorage |
| ประวัติการสแกน | เก็บประวัติวัตถุดิบที่เคยสแกน |
| กรองเมนู | กรองสูตรตาม tag (เผ็ด, ทำง่าย ฯลฯ) |

## สถาปัตยกรรมระบบ

```
┌─────────────┐     ┌──────────────────────────────────────────┐
│  ผู้ใช้      │────▶│  Frontend (Next.js + React)              │
│  ถ่ายรูป/    │     │  • กล้อง / อัปโหลดรูป                     │
│  อัปโหลด     │     │  • Gallery + แก้ไข label ด้วยมือ          │
└─────────────┘     └──────────────┬───────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌─────────────┐ ┌───────────┐ ┌──────────────┐
            │ YOLO11n     │ │ Gemini    │ │ Gemini       │
            │ (TF.js)     │ │ Vision    │ │ Text + Image │
            │ ในเบราว์เซอร์│ │ (Server)  │ │ (Server)     │
            └──────┬──────┘ └─────┬─────┘ └──────┬───────┘
                   │              │              │
                   └──────┬───────┘              │
                          ▼                      ▼
                   ┌─────────────┐        ┌─────────────┐
                   │ รวมวัตถุดิบ   │───────▶│ สร้างสูตร +  │
                   │ (Hybrid)    │        │ สร้างรูป    │
                   └─────────────┘        └─────────────┘
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Object Detection:** YOLO11n (Ultralytics) → TensorFlow.js Graph Model
- **AI API:** Google Gemini (`gemini-flash-latest`, `gemini-2.5-flash-image`)
- **SDK:** `@google/generative-ai`, `@google/genai`

## โครงสร้างโปรเจกต

```
app/
├── actions/
│   ├── analyzeImage.ts      # Gemini Vision — ระบุวัตถุดิบภาษาไทย
│   ├── generateRecipe.ts    # Gemini — สร้างสูตรอาหาร JSON
│   └── generateFoodImage.ts # Gemini — สร้างรูปอาหาร
├── components/
│   └── RecipeCard.tsx       # การ์ดสูตร + โปรด + คัดลอก
├── utils/
│   ├── labels.ts            # Label ภาษาอังกฤษของ YOLO (118 class)
│   ├── labelsTh.ts          # แปล label เป็นภาษาไทย
│   ├── storage.ts           # localStorage (โปรด + ประวัติ)
│   └── types.ts             # Type definitions
└── page.tsx                 # หน้าหลัก
public/model/                # โมเดล YOLO (model.json + weights)
```

## การติดตั้ง

```bash
# ติดตั้ง dependencies
bun install   # หรือ npm install

# ตั้งค่า API Key
cp .env.example .env
# ใส่ GEMINI_API_KEY=your_key_here

# รัน dev server
bun dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Environment Variables

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `GEMINI_API_KEY` | API Key จาก [Google AI Studio](https://aistudio.google.com/apikey) |

## การประเมินผล (แนะนำสำหรับรายงาน)

| การทดสอบ | วิธี |
|----------|------|
| YOLO accuracy | ทดสอบกับ test set → วัด Precision, Recall, mAP |
| Gemini accuracy | รูปทดสอบ 30–50 รูป → นับถูก/ผิด |
| Hybrid vs แยก | เปรียบเทียบ 3 โหมดบนรูปชุดเดียวกัน |
| Response time | แอปแสดงเวลา YOLO/Gemini อัตโนมัติหลังสแกน |
| User satisfaction | ให้ผู้ใช้ 10–20 คนทดสอบ → แบบสอบถาม 1–5 |

## Deploy

```bash
# Build
bun run build

# Deploy บน Vercel
vercel deploy
```

ตั้ง `GEMINI_API_KEY` ใน Environment Variables ของ Vercel

## ข้อจำกัด

- Label YOLO เป็นภาษาอังกฤษ/เนปาล — แปลเป็นภาษาไทยด้วย mapping (อาจไม่ครบ 100%)
- ต้องมี API Key สำหรับ Gemini (Vision, Recipe, Image Gen)
- โมเดล YOLO ฝึกจาก dataset ต่างประเทศ อาจไม่แม่นยำกับวัตถุดิบไทยบางชนิด
- รูปอาหารที่สร้างเป็น AI-generated อาจไม่ตรงกับของจริง 100%

## ผู้พัฒนา

โปรเจกจบ — Chef Kub
 ธนวัฒน์ น้อยหัวหาด (เอ็ม)
พีรภัทร์ ชมภูศรี (พี)
