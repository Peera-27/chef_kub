export type DetectionSource = "yolo" | "gemini" | "manual";

export interface IngredientItem {
  name: string;
  source: DetectionSource;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface ImageItem {
  id: string;
  url: string;
  items: IngredientItem[];
  boxes?: BoundingBox[];
  imageWidth?: number;
  imageHeight?: number;
}

export interface ScanHistoryEntry {
  id: string;
  date: string;
  items: string[];
  imageCount: number;
}

/** 1–5 ดาว — ไม่มีศูนย์ดาว ยังไม่ให้คะแนน = null */
export type CookRating = 1 | 2 | 3 | 4 | 5;

export const MAX_STARS = 5;

export interface CookLogEntry {
  recipeName: string;
  rating: CookRating;
  cookedAt: number;
}
