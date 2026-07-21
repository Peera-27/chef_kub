import { isR2Configured, r2GetObject } from "../../../lib/cloudflare/r2";
import {
  isRecipeImagePath,
  recipeImageKey,
} from "../../../lib/recipeImageCache";

// key เป็น hash ของชื่อเมนู — ไฟล์เดิมไม่มีวันเปลี่ยนเนื้อหา แคชยาวได้เต็มที่
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const joined = path.join("/");

  if (!isRecipeImagePath(joined) || !isR2Configured()) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const object = await r2GetObject(recipeImageKey(joined));
    if (!object) return new Response("Not found", { status: 404 });

    return new Response(object.body, {
      headers: {
        "Content-Type": object.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("recipe-image route error:", error);
    return new Response("Upstream error", { status: 502 });
  }
}
