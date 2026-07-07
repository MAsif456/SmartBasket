# SmartBasket — API Contract

**This is the single source of truth for how the frontend, LLM, and database teams talk to each other.**
Everyone builds to these JSON shapes. The canonical TypeScript version is
[`frontend/types/contract.ts`](frontend/types/contract.ts) — this file is the human-readable copy with
example payloads. **Change it only by team agreement** (and ping the frontend so the adapter can keep up).

There are two endpoints:

| Endpoint | Owner | Purpose |
|---|---|---|
| `POST /api/parse` | **LLM team** | Natural-language prompt + filters → structured grocery items |
| `POST /api/compare` | **DB team** | Structured items → per-store baskets, totals, cheapest & savings |

The output of `/api/parse` (`ParsedItem[]`) is the input to `/api/compare`. That array is the seam
between the LLM and DB teams — agree on it once and both sides unblock.

---

## Shared types

```ts
type StoreId = "tesco" | "sainsburys" | "asda" | "morrisons" | "aldi" | "lidl" | "waitrose";

interface Filters {
  location?: string;          // postcode or city (cosmetic today)
  maxBudget?: number;         // £
  preferOwnBrand?: boolean;   // drives substitution behaviour
  brands?: string[];          // e.g. ["Warburtons"]
  dietary?: string[];         // ["vegetarian","gluten-free"]
  stores?: StoreId[];         // which to compare; default = all
  pantry?: string[];          // items the user already has at home — /api/parse excludes these
}
```

---

## 1. `POST /api/parse` — LLM team

Turn a shopper's message into structured items. Handles both angles with one endpoint:
a plain list ("milk, bread, eggs") **and** a meal plan ("spaghetti bolognese for 4").

### Request
```json
{
  "prompt": "Warburtons bread, own-brand milk from Aldi, Heinz beans, and eggs. I'm in M1 4WT",
  "filters": { "stores": ["aldi", "tesco", "sainsburys"] }
}
```

### Response
```json
{
  "postcode": "M1 4WT",
  "items": [
    { "id": "i1", "name": "white bread", "quantity": 1, "unit": "loaf", "category": "bakery", "brandPreference": "specific",   "brand": "Warburtons", "stores": null,       "confidence": 0.9 },
    { "id": "i2", "name": "milk",        "quantity": 1, "unit": "L",    "category": "dairy",  "brandPreference": "whitelabel", "brand": null,         "stores": ["aldi"],   "confidence": 0.9 },
    { "id": "i3", "name": "baked beans", "quantity": 1, "unit": "can",  "category": "tinned", "brandPreference": "specific",   "brand": "Heinz",      "stores": null,       "confidence": 0.92 },
    { "id": "i4", "name": "eggs",        "quantity": 6, "unit": "each", "category": "dairy",  "brandPreference": "none",       "brand": null,         "stores": null,       "confidence": 0.98 }
  ],
  "assumptions": ["Read 'M1 4WT' as your postcode."],
  "unresolved": []
}
```

**Field notes**
- `id` — any stable unique string per item; the DB team echoes it back as `requestedItemId`.
- `confidence` — 0..1; the UI flags low-confidence parses so the user can fix them.
- `assumptions` — plain-English notes the UI shows ("assumed 500g mince…").
- `unresolved` — bits of the prompt you couldn't turn into items (shown as a small note).
- **`postcode`** — top-level. The shopper's UK postcode if given (uppercased/tidied), else `null`.
- **`brandPreference`** (required, per item) — `"none"` (no preference), `"whitelabel"` (own-brand/value),
  or `"specific"`. When `"specific"`, put the brand name in **`brand`**; otherwise `brand` is `null`.
  If `filters.preferOwnBrand` is true, default items to `"whitelabel"` unless a brand is named.
- **`stores`** (per item) — supermarket ids the shopper wants THIS item from (e.g. `["aldi"]`), or `null`
  for no preference. Only record the stated preference; don't pick a store yourself.
- **`filters.pantry`** — a list of items the shopper already has at home. **Exclude** any of
  these from `items` (match on your canonical name), and add an `assumptions` line naming what
  you skipped, e.g. `"Skipped pasta, onions — you already have them."`. Never output a pantry item.

---

## 2. `POST /api/compare` — DB team

Match each requested item to a real product **in each store**, price it, and return per-store baskets
**sorted cheapest-first**. This is where product matching and own-brand substitution live.

### Request
```json
{
  "items": [ /* the ParsedItem[] from /api/parse */ ],
  "filters": { "preferOwnBrand": true, "stores": ["aldi", "tesco", "sainsburys"] }
}
```

### Response
```json
{
  "basketId": "b_8f21",
  "cheapestStoreId": "aldi",
  "maxSaving": 16.50,
  "generatedAt": "2026-07-07T10:30:00Z",
  "stores": [
    {
      "storeId": "aldi",
      "storeName": "Aldi",
      "logoUrl": null,
      "total": 42.30,
      "unavailableCount": 0,
      "isCheapest": true,
      "lines": [
        {
          "requestedItemId": "i5",
          "requestedName": "milk",
          "quantity": 1,
          "lineTotal": 1.45,
          "matched": {
            "productId": "aldi-milk-1",
            "title": "Cowbelle British Semi Skimmed Milk 2.27L",
            "brand": "Cowbelle",
            "price": 1.45,
            "size": "2.27L",
            "pricePerUnit": "64p/L",
            "imageUrl": null,
            "isSubstitute": true,
            "matchConfidence": 0.92,
            "availability": "in_stock"
          },
          "alternatives": []
        }
      ]
    }
  ]
}
```

**Field notes / rules**
- `stores` **must be sorted cheapest-first**; set `isCheapest: true` on the winner.
- `cheapestStoreId` = the cheapest store; `maxSaving` = `mostExpensive.total − cheapest.total` (rounded to 2dp).
- `matched: null` means the item isn't available at that store — count it in `unavailableCount`.
- `lineTotal` = `matched.price × quantity`.
- `isSubstitute: true` when you swapped a named brand for an own-brand (brief example: Philadelphia → own-brand soft cheese). The UI shows a "swap & save" badge.
- `alternatives` — optional other matches the user could pick instead (shown in a popover).
- `imageUrl` / `logoUrl` may be `null` — the UI has fallbacks.
- **Honour per-item preferences** carried on each `ParsedItem`:
  - `brandPreference: "specific"` → match that `brand`; `"whitelabel"` → match own-brand and set `isSubstitute` if it replaces a named brand; `"none"` → your normal best match.
  - `stores: [...]` → the shopper only wants that item from those stores. At any store NOT in the list, return `matched: null` for that line (and count it in `unavailableCount`).

---

## While the backend is being built

The frontend develops against a **mock** of these exact shapes (`frontend/lib/mock.ts`), so nothing is
blocked on the endpoints being live. When an endpoint is ready, send the frontend **one real sample
response** and it plugs in via `frontend/lib/adapters.ts`. If the real field names drift slightly from
this doc, the adapter absorbs it — but staying on-contract means zero integration work.
