import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "AI Chef - หาวัตถุดิบทำอาหาร",
  description: "สแกนวัตถุดิบแล้วคิดสูตรอาหารด้วย AI",
};

// เพิ่ม Type ตรงนี้ครับ
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={kanit.className}>{children}</body>
    </html>
  );
}
