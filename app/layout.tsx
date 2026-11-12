import type { Metadata, Viewport } from "next";
import { Anuphan } from "next/font/google";
import Script from "next/script";
import { MotionProvider } from "./components/motion/MotionProvider";
import "./globals.css";

// Anuphan ตัวเดียวทั้งหัวข้อและเนื้อความ — เส้นโค้งนุ่ม อบอุ่นกว่า Plex เข้ากับงานอาหาร
// เป็น variable font ไฟล์เดียวครอบทุกน้ำหนัก ไม่ต้องโหลดสองครอบครัวเหมือนเดิม
const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  variable: "--font-anuphan",
  display: "swap",
});

import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Chef Kub — สแกนวัตถุดิบ คิดสูตรอาหารด้วย AI",
  description: "ถ่ายรูปวัตถุดิบ ให้ AI วิเคราะห์และแนะนำสูตรอาหารไทย",
  openGraph: {
    type: "website",
    siteName: "Chef Kub",
    locale: "th_TH",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "ไข่เจียวฟูกรอบบนจาน" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef3ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: หน้าแนะนำเติมคลาส "js" ให้ <html> ก่อน React hydrate (ใช้ซ่อนสถานะก่อนเล่นอนิเมชัน)
    <html
      lang="th"
      className={anuphan.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* ซ่อนสถานะก่อนเล่นอนิเมชันเฉพาะเมื่อ JS ทำงาน — อยู่ใน layout เพราะ layout เรนเดอร์บนเซิร์ฟเวอร์ครั้งเดียว
          ถ้าวางในหน้า แล้วเข้าหน้านั้นด้วยการกดลิงก์ฝั่ง client React จะไม่รันสคริปต์ คลาสก็ไม่ถูกเติม
          CSS ที่ใช้คลาสนี้อยู่ใต้ .lp ทั้งหมด หน้าแอปจึงไม่โดนผลกระทบ */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
        {/* โหลดเฉพาะ production — endpoint ของ Cloudflare ตอบ CORS ให้ origin "http://localhost"
            แบบไม่มีพอร์ต ซึ่งไม่มีทางตรงกับ dev server ตัวไหน ยิงไปก็โดนบล็อกทิ้งอย่างเดียว
            และไม่ต้องเอา pageview จากเครื่องตัวเองไปปนสถิติจริงด้วย

            ไม่ใส่ type="module" ทั้งที่ snippet ก็รันได้ เพราะ next/script แปะ <link rel=preload>
            ให้อัตโนมัติโดยไม่มี crossorigin — คนละ credentials mode กับ module script ที่โหลด
            แบบ CORS เสมอ เบราว์เซอร์เลยใช้ของที่ preload ไว้ไม่ได้ ต้องดาวน์โหลดซ้ำรอบสอง
            อีกอย่าง document.currentScript เป็น null ในโหมด module ซึ่งเป็นวิธีมาตรฐาน
            ที่สคริปต์แบบนี้ใช้อ่าน data-cf-beacon ของตัวเอง — วันที่ Cloudflare push
            ไฟล์เวอร์ชันใหม่ทับ สถิติจะเงียบหายไปเฉย ๆ โดยไม่มี error ให้เห็น */}
        {process.env.NODE_ENV === "production" && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token":"bbaaec2572894e98afd0260f2bc1da0a"}'
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
