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
}
```

---

## 1. `POST /api/parse` — LLM team

Turn a shopper's message into structured items. Handles both angles with one endpoint:
a plain list ("milk, bread, eggs") **and** a meal plan ("spaghetti bolognese for 4").

### Request
```json
{
  "prompt": "spaghetti bolognese for 4 people, plus milk and eggs",
  "filters": { "preferOwnBrand": true, "stores": ["aldi", "tesco", "sainsburys"] }
}
```

### Response
```json
{
  "items": [
    { "id": "i1", "name": "spaghetti",   "quantity": 500, "unit": "g",    "category": "pasta",  "note": "for bolognese", "confidence": 0.95 },
    { "id": "i2", "name": "beef mince",  "quantity": 500, "unit": "g",    "category": "meat",   "note": "for bolognese", "confidence": 0.9 },
    { "id": "i3", "name": "chopped tomatoes", "quantity": 2, "unit": "can", "category": "tinned", "note": "for bolognese", "confidence": 0.9 },
    { "id": "i4", "name": "onion",       "quantity": 1,   "unit": "each", "category": "veg",    "confidence": 0.85 },
    { "id": "i5", "name": "milk",        "quantity": 1,   "unit": "L",    "category": "dairy",  "confidence": 0.98 },
    { "id": "i6", "name": "eggs",        "quantity": 6,   "unit": "each", "category": "dairy",  "confidence": 0.98 }
  ],
  "assumptions": ["assumed 500g mince and 500g spaghetti for 4 people"],
  "unresolved": []
}
```

**Field notes**
- `id` — any stable unique string per item; the DB team echoes it back as `requestedItemId`.
- `confidence` — 0..1; the UI flags low-confidence parses so the user can fix them.
- `assumptions` — plain-English notes the UI shows ("assumed 500g mince…").
- `unresolved` — bits of the prompt you couldn't turn into items (shown as a small note).

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

---

## While the backend is being built

The frontend develops against a **mock** of these exact shapes (`frontend/lib/mock.ts`), so nothing is
blocked on the endpoints being live. When an endpoint is ready, send the frontend **one real sample
response** and it plugs in via `frontend/lib/adapters.ts`. If the real field names drift slightly from
this doc, the adapter absorbs it — but staying on-contract means zero integration work.
