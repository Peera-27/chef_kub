import { GoogleGenAI, Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { buildCookSystemPrompt } from "../../lib/live/cookPrompt";
import type { Recipe } from "../../types/recipe";

const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ไม่พบ GEMINI_API_KEY" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { recipe } = body as { recipe: Recipe };

    if (!recipe?.name || !recipe?.instructions?.length) {
      return NextResponse.json({ error: "ข้อมูลสูตรไม่ครบ" }, { status: 400 });
    }

    const client = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
            systemInstruction: {
              parts: [{ text: buildCookSystemPrompt(recipe) }],
            },
          },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return NextResponse.json({
      token: token.name,
      model: LIVE_MODEL,
    });
  } catch (error) {
    console.error("Live token error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง Live token ได้" },
      { status: 500 },
    );
  }
}
