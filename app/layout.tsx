import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
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
  themeColor: "#1f5f3f",
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
      </body>
    </html>
  );
}
