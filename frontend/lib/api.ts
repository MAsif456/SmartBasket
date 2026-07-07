/**
 * The ONLY module that knows whether data is mock or real.
 * Everything downstream consumes CONTRACT types.
 *
 * Flip NEXT_PUBLIC_USE_MOCK=false (and set NEXT_PUBLIC_API_BASE) to hit the
 * real backend. If the real JSON drifts from the contract, absorb it in
 * adaptParse / adaptCompare below — components never change.
 */
import type {
  ComparisonResult,
  Filters,
  ParseResponse,
  ParsedItem,
} from "@/types/contract";
import { mockCompare, mockParse } from "@/lib/mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---- adapters: map real backend JSON -> contract (fill in at integration) ---- */
function adaptParse(raw: unknown): ParseResponse {
  return raw as ParseResponse;
}
function adaptCompare(raw: unknown): ComparisonResult {
  return raw as ComparisonResult;
}

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export async function parseBasket(
  prompt: string,
  filters: Filters
): Promise<ParseResponse> {
  if (USE_MOCK) {
    await delay(650);
    return mockParse(prompt, filters);
  }
  return adaptParse(await post("/api/parse", { prompt, filters }));
}

export async function compareBasket(
  items: ParsedItem[],
  filters: Filters
): Promise<ComparisonResult> {
  if (USE_MOCK) {
    await delay(750);
    return mockCompare(items, filters);
  }
  return adaptCompare(await post("/api/compare", { items, filters }));
}
