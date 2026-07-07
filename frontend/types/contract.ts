/**
 * SmartBasket — SHARED API CONTRACT (single source of truth)
 * ==========================================================
 * Agreed across the whole team. The frontend renders exactly these shapes.
 * The LLM team owns POST /api/parse, the DB team owns POST /api/compare.
 *
 * Change this file only by team agreement. If you rename/reshape a field,
 * tell the frontend so the adapter (frontend/lib/adapters.ts) can keep up.
 *
 * A human-readable version with example JSON payloads lives at /CONTRACT.md.
 */

// ---- shared enums / filters ----
export type StoreId =
  | "tesco"
  | "sainsburys"
  | "asda"
  | "morrisons"
  | "aldi"
  | "lidl"
  | "waitrose";

export interface Filters {
  location?: string; // postcode or city (cosmetic today)
  maxBudget?: number; // £
  preferOwnBrand?: boolean; // drives substitution behaviour
  brands?: string[]; // e.g. ["Warburtons"]
  dietary?: string[]; // ["vegetarian","gluten-free"]
  stores?: StoreId[]; // which to compare; default = all
}

// =====================================================================
// LLM team owns: POST /api/parse
// =====================================================================
export interface ParseRequest {
  prompt: string;
  filters: Filters;
}

export interface ParsedItem {
  id: string;
  name: string; // canonical: "milk", "white bread", "beef mince"
  quantity: number;
  unit?: string; // "L","g","pack","each"
  category?: string; // "dairy","bakery"
  note?: string; // "for bolognese"
  confidence: number; // 0..1
}

export interface ParseResponse {
  items: ParsedItem[];
  assumptions: string[]; // ["assumed 500g mince for 4 people"]
  unresolved: string[]; // prompt fragments not turned into items
}

// =====================================================================
// DB team owns: POST /api/compare
// =====================================================================
export interface CompareRequest {
  items: ParsedItem[];
  filters: Filters;
}

export interface MatchedProduct {
  productId: string;
  title: string; // "Cowbelle Semi Skimmed Milk 2.27L"
  brand: string;
  price: number; // £ per unit
  size: string; // "2.27L"
  pricePerUnit?: string; // "64p/L"
  imageUrl?: string;
  isSubstitute: boolean; // own-brand swapped for a named brand
  matchConfidence: number; // 0..1
  availability: "in_stock" | "out_of_stock";
}

export interface StoreLineItem {
  requestedItemId: string; // -> ParsedItem.id
  requestedName: string;
  quantity: number;
  matched: MatchedProduct | null; // null = unavailable at this store
  lineTotal: number; // price * quantity
  alternatives?: MatchedProduct[];
}

export interface StoreBasket {
  storeId: StoreId;
  storeName: string;
  logoUrl?: string;
  lines: StoreLineItem[];
  total: number;
  unavailableCount: number;
  isCheapest: boolean;
}

export interface ComparisonResult {
  basketId: string;
  stores: StoreBasket[]; // sorted cheapest-first
  cheapestStoreId: StoreId;
  maxSaving: number; // mostExpensive.total - cheapest.total
  generatedAt: string; // ISO
}
