const globalForCache = global as unknown as { visionCache: Map<string, string[]> };
const visionCache = globalForCache.visionCache || new Map<string, string[]>();
if (process.env.NODE_ENV !== "production") globalForCache.visionCache = visionCache;

export function getVisionCache(hash: string): string[] | undefined {
  return visionCache.get(hash);
}

export function setVisionCache(hash: string, items: string[]): void {
  visionCache.set(hash, items);
}
