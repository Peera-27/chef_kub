import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /app เป็นแอปฝั่ง client ล้วน ไม่มีเนื้อหาให้ index
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
