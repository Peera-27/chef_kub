import { ScanHistoryEntry } from "../types";

const HISTORY_KEY = "chefkub_history";

export function loadHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ScanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(items: string[], imageCount: number) {
  const history = loadHistory();
  const entry: ScanHistoryEntry = {
    id: `${Date.now()}`,
    date: new Date().toLocaleString("th-TH"),
    items,
    imageCount,
  };
  const updated = [entry, ...history].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}
