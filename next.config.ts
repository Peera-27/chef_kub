import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenNext sets this through an environment variable, but Bun on Windows
  // does not reliably forward it to the nested Next.js build.
  output: "standalone",
  experimental: {
    serverActions: {
      // รูปถูกย่อเหลือด้านยาว 1024px ฝั่ง client แล้ว (utils/downscaleImage.ts)
      // เหลือ ~200KB ต่อใบ — เผื่อไว้ 10mb กันเคสหลุด เช่นเบราว์เซอร์ที่ย่อไม่สำเร็จ
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
