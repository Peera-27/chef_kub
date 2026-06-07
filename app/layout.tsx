import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "Chef Kub — สแกนวัตถุดิบ คิดสูตรอาหารด้วย AI",
  description: "ถ่ายรูปวัตถุดิบ ให้ AI วิเคราะห์และแนะนำสูตรอาหารไทย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${kanit.className} antialiased`}>{children}</body>
    </html>
  );
}
