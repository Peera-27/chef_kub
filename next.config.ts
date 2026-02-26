import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // ปรับเพิ่มเป็น 5MB หรือตามที่ต้องการ
    },
  },
};

export default nextConfig;