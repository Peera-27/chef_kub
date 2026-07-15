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
