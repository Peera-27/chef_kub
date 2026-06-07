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
}

export interface ScanHistoryEntry {
  id: string;
  date: string;
  items: string[];
  imageCount: number;
}

export interface TimingStats {
  yoloMs?: number;
  geminiMs?: number;
  totalMs: number;
}
