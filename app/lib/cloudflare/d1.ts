const API_BASE = "https://api.cloudflare.com/client/v4";

interface D1ApiResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: { results: T[]; success: boolean }[] | null;
}

export function isD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_API_TOKEN &&
      process.env.CLOUDFLARE_D1_DATABASE_ID,
  );
}

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (!accountId || !token || !databaseId) {
    throw new Error("missing_d1_config");
  }

  const res = await fetch(
    `${API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    },
  );

  const json = (await res.json()) as D1ApiResponse<T>;

  if (!res.ok || !json.success) {
    const message =
      json.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`D1 query failed: ${message}`);
  }

  return json.result?.[0]?.results ?? [];
}

// D1 HTTP API จำกัด bound parameters ที่ 100 ต่อ query — insert หลายแถวต้องแบ่ง chunk
export function chunkRows<T>(rows: T[], rowsPerChunk: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += rowsPerChunk) {
    chunks.push(rows.slice(i, i + rowsPerChunk));
  }
  return chunks;
}
