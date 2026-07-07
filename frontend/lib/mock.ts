/**
 * Mock parse + compare engine.
 * Returns the exact CONTRACT shapes so the whole UI works with no backend.
 * Swap for real endpoints via lib/api.ts (NEXT_PUBLIC_USE_MOCK).
 */
import type {
  ComparisonResult,
  Filters,
  MatchedProduct,
  ParseResponse,
  ParsedItem,
  StoreBasket,
  StoreId,
  StoreLineItem,
} from "@/types/contract";
import { ALL_STORE_IDS, storeName } from "@/lib/stores";

/* ---------------- seed catalog ---------------- */
interface Seed {
  name: string; // canonical
  category: string;
  unit: string;
  defaultQty: number;
  base: number; // £ baseline (mid-market)
  brand?: string; // named brand, if any
  size: string;
  keywords: string[];
  unavailableAt?: StoreId[];
}

const CATALOG: Seed[] = [
  { name: "milk", category: "dairy", unit: "L", defaultQty: 1, base: 1.3, size: "2.27L (4pt)", keywords: ["milk"] },
  { name: "white bread", category: "bakery", unit: "loaf", defaultQty: 1, base: 1.15, brand: "Warburtons", size: "800g", keywords: ["bread", "loaf", "white bread"] },
  { name: "eggs", category: "dairy", unit: "pack", defaultQty: 1, base: 1.95, size: "6 medium", keywords: ["egg", "eggs"] },
  { name: "butter", category: "dairy", unit: "pack", defaultQty: 1, base: 2.1, brand: "Lurpak", size: "250g", keywords: ["butter"] },
  { name: "cheddar cheese", category: "dairy", unit: "pack", defaultQty: 1, base: 3.2, brand: "Cathedral City", size: "350g", keywords: ["cheddar", "cheese"] },
  { name: "cream cheese", category: "dairy", unit: "tub", defaultQty: 1, base: 2.0, brand: "Philadelphia", size: "180g", keywords: ["cream cheese", "philadelphia", "soft cheese"] },
  { name: "greek yogurt", category: "dairy", unit: "tub", defaultQty: 1, base: 1.6, size: "500g", keywords: ["yogurt", "yoghurt", "greek yogurt"] },
  { name: "chicken breast", category: "meat", unit: "pack", defaultQty: 1, base: 4.5, size: "650g", keywords: ["chicken breast", "chicken breasts", "chicken fillet", "chicken fillets", "chicken"] },
  { name: "beef mince", category: "meat", unit: "g", defaultQty: 500, base: 3.5, size: "500g 5% fat", keywords: ["beef mince", "mince", "minced beef"] },
  { name: "bacon", category: "meat", unit: "pack", defaultQty: 1, base: 2.6, size: "300g", keywords: ["bacon"] },
  { name: "spaghetti", category: "pasta", unit: "g", defaultQty: 500, base: 0.85, size: "500g", keywords: ["spaghetti", "pasta"] },
  { name: "rice", category: "grains", unit: "g", defaultQty: 1000, base: 1.9, size: "1kg", keywords: ["rice", "basmati"] },
  { name: "chopped tomatoes", category: "tinned", unit: "can", defaultQty: 1, base: 0.5, size: "400g tin", keywords: ["chopped tomatoes", "tinned tomatoes", "tomatoes"] },
  { name: "onion", category: "veg", unit: "each", defaultQty: 3, base: 0.13, size: "loose", keywords: ["onion", "onions"] },
  { name: "garlic", category: "veg", unit: "each", defaultQty: 1, base: 0.3, size: "single bulb", keywords: ["garlic"] },
  { name: "carrots", category: "veg", unit: "pack", defaultQty: 1, base: 0.55, size: "1kg", keywords: ["carrot", "carrots"] },
  { name: "potatoes", category: "veg", unit: "bag", defaultQty: 1, base: 1.4, size: "2.5kg", keywords: ["potato", "potatoes", "spuds"] },
  { name: "fresh basil", category: "veg", unit: "pack", defaultQty: 1, base: 0.7, size: "30g", keywords: ["basil"], unavailableAt: ["aldi", "lidl"] },
  { name: "bananas", category: "fruit", unit: "pack", defaultQty: 1, base: 0.85, size: "5 pack", keywords: ["banana", "bananas"] },
  { name: "apples", category: "fruit", unit: "pack", defaultQty: 1, base: 1.4, size: "6 pack", keywords: ["apple", "apples"] },
  { name: "orange juice", category: "drinks", unit: "carton", defaultQty: 1, base: 1.8, size: "1L", keywords: ["orange juice", "oj"] },
  { name: "coffee", category: "drinks", unit: "jar", defaultQty: 1, base: 4.2, brand: "Nescafe", size: "200g", keywords: ["coffee"] },
  { name: "tea bags", category: "drinks", unit: "box", defaultQty: 1, base: 2.5, brand: "PG Tips", size: "80 bags", keywords: ["tea", "tea bags", "teabags"] },
  { name: "cereal", category: "breakfast", unit: "box", defaultQty: 1, base: 2.8, brand: "Kellogg's", size: "500g", keywords: ["cereal", "cornflakes", "corn flakes"] },
  { name: "olive oil", category: "cupboard", unit: "bottle", defaultQty: 1, base: 3.9, size: "500ml", keywords: ["olive oil", "oil"] },
  { name: "chocolate", category: "snacks", unit: "bar", defaultQty: 1, base: 1.25, brand: "Cadbury", size: "110g", keywords: ["chocolate", "dairy milk"] },
];

/* ---------------- recipes (meal planner) ---------------- */
interface RecipeItem {
  name: string;
  perPerson: number;
  unit: string;
}
interface Recipe {
  name: string;
  keywords: string[];
  items: RecipeItem[];
}

const RECIPES: Recipe[] = [
  {
    name: "spaghetti bolognese",
    keywords: ["spaghetti bolognese", "spag bol", "bolognese", "bolognaise"],
    items: [
      { name: "spaghetti", perPerson: 100, unit: "g" },
      { name: "beef mince", perPerson: 125, unit: "g" },
      { name: "chopped tomatoes", perPerson: 0.5, unit: "can" },
      { name: "onion", perPerson: 0.5, unit: "each" },
      { name: "garlic", perPerson: 0.25, unit: "each" },
      { name: "cheddar cheese", perPerson: 0.25, unit: "pack" },
    ],
  },
  {
    name: "chicken curry",
    keywords: ["chicken curry", "curry"],
    items: [
      { name: "chicken breast", perPerson: 0.4, unit: "pack" },
      { name: "rice", perPerson: 75, unit: "g" },
      { name: "onion", perPerson: 0.5, unit: "each" },
      { name: "chopped tomatoes", perPerson: 0.5, unit: "can" },
      { name: "garlic", perPerson: 0.25, unit: "each" },
    ],
  },
  {
    name: "full english breakfast",
    keywords: ["full english", "fry up", "breakfast"],
    items: [
      { name: "eggs", perPerson: 0.4, unit: "pack" },
      { name: "bacon", perPerson: 0.5, unit: "pack" },
      { name: "white bread", perPerson: 0.3, unit: "loaf" },
    ],
  },
];

/* ---------------- helpers ---------------- */
const round2 = (n: number) => Math.round(n * 100) / 100;

// discount-store positioning; higher = pricier
const MULT: Record<StoreId, number> = {
  aldi: 0.82,
  lidl: 0.84,
  asda: 0.92,
  morrisons: 0.95,
  tesco: 0.99,
  sainsburys: 1.03,
  waitrose: 1.2,
};

const DISCOUNTERS: StoreId[] = ["aldi", "lidl"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}
// deterministic ±3% jitter so totals differ but demos stay stable
function jitter(key: string): number {
  return 0.97 + (hash(key) % 61) / 1000;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function findSeed(name: string): Seed | null {
  const n = name.toLowerCase().trim();
  const exact = CATALOG.find((s) => s.name === n);
  if (exact) return exact;
  return (
    CATALOG.find((s) => s.keywords.some((k) => n.includes(k) || k.includes(n))) ??
    null
  );
}

/* ---------------- PARSE (LLM stand-in) ---------------- */
function detectServings(text: string): number {
  const m =
    text.match(/for\s+(\d+)\s*(?:people|persons|ppl)?/) ||
    text.match(/serves?\s+(\d+)/) ||
    text.match(/(\d+)\s+people/);
  const n = m ? parseInt(m[1], 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

function qtyBefore(text: string, keyword: string): number | null {
  const re = new RegExp(`(\\d+)\\s*(?:x\\s*)?${keyword}\\b`);
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function scaleQty(perPerson: number, servings: number, unit: string): number {
  const raw = perPerson * servings;
  if (unit === "g") return Math.max(50, Math.round(raw / 50) * 50);
  return Math.max(1, Math.round(raw));
}

export function mockParse(prompt: string, filters: Filters): ParseResponse {
  const text = prompt.toLowerCase();
  const servings = detectServings(text);
  const items: ParsedItem[] = [];
  const assumptions: string[] = [];
  let idc = 0;
  const nid = () => `i${++idc}`;
  const have = (name: string) => items.some((i) => i.name === name);

  // 1) recipe expansion
  let matchedRecipe = false;
  for (const r of RECIPES) {
    if (r.keywords.some((k) => text.includes(k))) {
      matchedRecipe = true;
      assumptions.push(
        `Built a ${r.name} basket for ${servings} ${servings === 1 ? "person" : "people"}.`
      );
      for (const ri of r.items) {
        if (have(ri.name)) continue;
        const seed = findSeed(ri.name);
        items.push({
          id: nid(),
          name: ri.name,
          quantity: scaleQty(ri.perPerson, servings, ri.unit),
          unit: ri.unit,
          category: seed?.category,
          note: `for ${r.name}`,
          confidence: 0.9,
        });
      }
    }
  }

  // 2) explicit catalog items mentioned
  for (const seed of CATALOG) {
    if (have(seed.name)) continue;
    const kw = seed.keywords.find((k) =>
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text)
    );
    if (kw) {
      items.push({
        id: nid(),
        name: seed.name,
        quantity: qtyBefore(text, kw) ?? seed.defaultQty,
        unit: seed.unit,
        category: seed.category,
        confidence: 0.84,
      });
    }
  }

  // 3) unresolved fragments (comma/and separated bits that matched nothing)
  const unresolved: string[] = [];
  if (!matchedRecipe) {
    for (const raw of prompt.split(/,|\band\b|\bplus\b|&|\n/i)) {
      const seg = raw.trim();
      if (!seg || seg.length < 2) continue;
      if (!findSeed(seg) && !/\d/.test(seg) && !RECIPES.some((r) => r.keywords.some((k) => seg.toLowerCase().includes(k)))) {
        // only flag if it looks like a food word we failed on
        if (/^[a-z ]{3,}$/i.test(seg) && !CATALOG.some((s) => s.keywords.some((k) => seg.toLowerCase().includes(k)))) {
          unresolved.push(seg);
        }
      }
    }
  }

  // 4) exclude anything the user already has at home (pantry)
  const pantry = filters.pantry ?? [];
  let kept = items;
  if (pantry.length) {
    const pantryCanon = pantry.map((p) => (findSeed(p)?.name ?? p.toLowerCase()).trim());
    const excluded: string[] = [];
    kept = items.filter((it) => {
      const owned = pantryCanon.some(
        (pc) => pc === it.name || it.name.includes(pc) || pc.includes(it.name)
      );
      if (owned) excluded.push(it.name);
      return !owned;
    });
    if (excluded.length) {
      assumptions.push(
        `Skipped ${excluded.join(", ")} — you said you already have ${excluded.length === 1 ? "it" : "them"}.`
      );
    }
  }

  return { items: kept, assumptions, unresolved: unresolved.slice(0, 4) };
}

/* ---------------- COMPARE (DB stand-in) ---------------- */
function buildProduct(
  seed: Seed,
  store: StoreId,
  preferOwnBrand: boolean
): MatchedProduct {
  const discounter = DISCOUNTERS.includes(store);
  const price = round2(seed.base * MULT[store] * jitter(seed.name + store));
  const useOwn = preferOwnBrand || !seed.brand || discounter;
  const brand = useOwn ? storeName(store) : seed.brand!;
  const title = `${brand} ${titleCase(seed.name)} ${seed.size}`.trim();
  const isSubstitute = !!seed.brand && useOwn;
  const unavailable = seed.unavailableAt?.includes(store);
  return {
    productId: `${store}-${slug(seed.name)}`,
    title,
    brand,
    price,
    size: seed.size,
    isSubstitute,
    matchConfidence: round2(0.82 + (hash(seed.name + store) % 15) / 100),
    availability: unavailable ? "out_of_stock" : "in_stock",
  };
}

// synthetic seed for items the user typed that aren't in the catalog
function syntheticSeed(name: string): Seed {
  const base = 0.9 + (hash(name) % 300) / 100; // £0.90–£3.90
  return {
    name: name.toLowerCase(),
    category: "other",
    unit: "each",
    defaultQty: 1,
    base: round2(base),
    size: "",
    keywords: [name.toLowerCase()],
  };
}

export function mockCompare(
  items: ParsedItem[],
  filters: Filters
): ComparisonResult {
  const storeIds =
    filters.stores && filters.stores.length ? filters.stores : ALL_STORE_IDS;
  const preferOwn = !!filters.preferOwnBrand;

  const baskets: StoreBasket[] = storeIds.map((store) => {
    let total = 0;
    let unavailableCount = 0;
    const lines: StoreLineItem[] = items.map((it) => {
      const seed = findSeed(it.name) ?? syntheticSeed(it.name);
      const product = buildProduct(seed, store, preferOwn);
      if (product.availability === "out_of_stock") {
        unavailableCount++;
        return {
          requestedItemId: it.id,
          requestedName: it.name,
          quantity: it.quantity,
          matched: null,
          lineTotal: 0,
        };
      }
      // quantity handling: weight units price the pack once (seed.size already a pack)
      const units = it.unit === "g" || it.unit === "each" ? Math.max(1, Math.round(it.quantity / (seed.defaultQty || 1))) : it.quantity;
      const qtyMultiplier = Number.isFinite(units) && units > 0 ? units : 1;
      const lineTotal = round2(product.price * qtyMultiplier);
      total = round2(total + lineTotal);
      return {
        requestedItemId: it.id,
        requestedName: it.name,
        quantity: it.quantity,
        matched: product,
        lineTotal,
      };
    });
    return {
      storeId: store,
      storeName: storeName(store),
      lines,
      total,
      unavailableCount,
      isCheapest: false,
    };
  });

  baskets.sort((a, b) => a.total - b.total);
  if (baskets.length) baskets[0].isCheapest = true;
  const cheapest = baskets[0];
  const dearest = baskets[baskets.length - 1];

  return {
    basketId: `b_${Math.random().toString(36).slice(2, 8)}`,
    stores: baskets,
    cheapestStoreId: cheapest?.storeId ?? "aldi",
    maxSaving: round2((dearest?.total ?? 0) - (cheapest?.total ?? 0)),
    generatedAt: new Date().toISOString(),
  };
}

export const EXAMPLE_PROMPTS = [
  "Weekly shop for a family of 4: milk, bread, eggs, chicken, pasta, bananas, cheese",
  "Spaghetti bolognese for 4 people",
  "Milk, bread, eggs, coffee and orange juice",
];
