import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP — เขียนแบบ "แคบที่สุดเท่าที่แอปนี้ยังทำงานได้" ไม่ใช่แคบที่สุดตามตำรา
 * แต่ละบรรทัดที่หย่อนกว่าค่ามาตรฐานมีเหตุผลกำกับไว้ ถ้าจะรัดเพิ่มต้องแก้โค้ดตามที่ระบุ
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    /*
     * 'unsafe-inline' ยังตัดไม่ได้ — App Router ฝัง RSC payload มากับหน้าเป็น
     * <script>self.__next_f.push(...)</script> ถ้าจะตัดต้องทำ nonce ผ่าน middleware
     * แล้วส่งต่อให้ Next (ตอนนั้นห้ามใส่ 'unsafe-inline' คู่กัน เพราะ nonce จะถูกเมิน)
     *
     * static.cloudflareinsights.com = beacon ใน app/layout.tsx
     * 'unsafe-eval' เปิดเฉพาะ dev เพราะ HMR ของ Next ใช้ eval — prod ไม่ต้องใช้
     * (tfjs ใช้ backend webgl ซึ่งคอมไพล์ GLSL ผ่าน WebGL API ไม่ได้ eval จาวาสคริปต์)
     */
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "https://static.cloudflareinsights.com",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],

    // Tailwind กับ motion ยัด style ลง element ตรง ๆ — ตัด 'unsafe-inline' ไม่ได้
    "style-src": ["'self'", "'unsafe-inline'"],

    /*
     * data: = รูปจากกล้องหลัง downscaleImage() และรูปเมนูที่ Workers AI ส่งกลับมา
     * blob: = การ์ดสูตรที่ renderRecipeCard() วาดใส่ canvas แล้ว toBlob()
     */
    "img-src": ["'self'", "data:", "blob:"],

    // next/font/google โหลด Kanit มาโฮสต์เองตอน build จึงไม่ต้องเปิดโดเมนของ Google
    "font-src": ["'self'"],

    // <video> ของหน้ากล้องผูกด้วย srcObject (MediaStream) ซึ่ง CSP ไม่คุม — blob: เผื่อ fallback
    "media-src": ["'self'", "blob:"],

    // 'self' ครอบ server action ทั้งหมด (Gemini/Workers AI ถูกเรียกจากฝั่ง server เท่านั้น)
    // cloudflareinsights.com = ปลายทางที่ beacon ยิง RUM ไป
    "connect-src": ["'self'", "https://cloudflareinsights.com"],

    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],

    // กันฝังในหน้าอื่น (clickjacking) — คู่กับ X-Frame-Options ให้เบราว์เซอร์เก่าด้วย
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  const rendered = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // dev รันบน http://localhost — บังคับ https จะทำให้เปิดไม่ได้
  return isDev ? rendered : `${rendered}; upgrade-insecure-requests`;
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    /*
     * แอปต้องใช้กล้อง จึงเปิด camera=(self) ไว้ ที่เหลือปิดหมด —
     * ปิดแล้วต่อให้มีสคริปต์แปลกปลอมหลุดเข้ามาก็ขอสิทธิ์พวกนี้ไม่ได้
     */
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
    ].join(", "),
  },
  {
    // 2 ปีตามที่ hstspreload.org กำหนด แต่ยังไม่ใส่ preload —
    // preload ถอนยากมาก ควรใส่ตอนย้ายไป custom domain ที่แน่ใจว่าทุก subdomain เป็น https แล้ว
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

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

  /*
   * ครอบเฉพาะ response ที่ออกจาก worker (หน้าเว็บ + /api/*) — ไฟล์ใน public/
   * เสิร์ฟโดย Workers Static Assets ซึ่งไม่ผ่านตรงนี้ ต้องตั้งใน public/_headers แทน
   */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
