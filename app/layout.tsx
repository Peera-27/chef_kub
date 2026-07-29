import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import Script from "next/script";
import { MotionProvider } from "./components/motion/MotionProvider";
import "./globals.css";
const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chef Kub — สแกนวัตถุดิบ คิดสูตรอาหารด้วย AI",
  description: "ถ่ายรูปวัตถุดิบ ให้ AI วิเคราะห์และแนะนำสูตรอาหารไทย",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#08783d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={kanit.className}>
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
