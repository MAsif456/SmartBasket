"""Implements POST /api/compare: match ParsedItem[] to real products per store.

Our price data only covers 5 UK supermarkets (Tesco, Sainsbury's, Asda, Morrisons,
Aldi) — lidl/waitrose have no rows, so if requested they're simply omitted from
the response rather than shown as all-unavailable.
"""
import difflib
import math
import re
import sqlite3
import uuid
from datetime import datetime, timezone

from schemas import (
    ComparisonResult,
    Filters,
    MatchedProduct,
    ParsedItem,
    StoreBasket,
    StoreId,
    StoreLineItem,
)

STORE_DB_NAMES: dict[str, str] = {
    "tesco": "Tesco",
    "sainsburys": "Sains",
    "asda": "ASDA",
    "morrisons": "Morrisons",
    "aldi": "Aldi",
}

STORE_DISPLAY_NAMES: dict[str, str] = {
    "tesco": "Tesco",
    "sainsburys": "Sainsbury's",
    "asda": "Asda",
    "morrisons": "Morrisons",
    "aldi": "Aldi",
    "lidl": "Lidl",
    "waitrose": "Waitrose",
}

# The LLM parser categorizes items generically ("dairy", "meat", "veg"...) but this
# dataset uses its own coarser taxonomy (e.g. real milk is filed under "drinks", not
# "dairy"). Bridging the two lets us break ties in favor of plausible categories
# instead of e.g. "Milk Bottles" sweets outranking an actual carton of milk.
CATEGORY_BRIDGE: dict[str, set[str]] = {
    "dairy": {"drinks", "fresh_food", "free-from"},
    "dairy-alternative": {"free-from", "drinks", "fresh_food"},
    "meat": {"fresh_food", "frozen"},
    "veg": {"fresh_food", "frozen"},
    "vegetable": {"fresh_food", "frozen"},
    "fruit": {"fresh_food"},
    "bakery": {"bakery"},
    "tinned": {"food_cupboard"},
    "drinks": {"drinks"},
    "pasta": {"food_cupboard"},
    "grains": {"food_cupboard"},
    "rice": {"food_cupboard"},
    "snacks": {"food_cupboard"},
    "breakfast": {"food_cupboard"},
    "cupboard": {"food_cupboard"},
    "household": {"household", "home"},
    "baby_products": {"baby_products"},
    "health_products": {"health_products"},
    "pets": {"pets"},
    "frozen": {"frozen"},
}

# Words that mark a product as a *variant* of the plain item (flavoured, alternative,
# or otherwise not what "milk"/"eggs" plainly means). Penalized when the requested
# item doesn't itself mention them, so a plain product outranks a novelty one that
# only matches because it happens to contain the same word (e.g. "Milk Bottles" sweets,
# "Milko Kefir", "Chocolate Flavoured Milk" when the shopper just asked for "milk").
VARIANT_WORDS = {
    "flavoured", "flavour", "chocolate", "strawberry", "banana", "vanilla", "caramel",
    "condensed", "coconut", "kefir", "formula", "shake", "milkshake", "mousse",
    "biscuit", "biscuits", "cookie", "cookies", "sweets", "candy", "bottles",
    "thistle", "salt", "granules", "bhaji", "gravy", "soup", "sauce",
    "scotch", "savoury", "twists", "slices", "quiche", "pasty", "pie",
    "wine", "pinot", "noir", "chardonnay", "cabernet", "sauvignon", "rose", "ros",
    "merlot", "prosecco", "cider", "beer", "lager", "ale", "gin", "vodka",
    "whisky", "whiskey", "rum", "cocktail",
}

STOPWORDS = {"a", "an", "the", "of", "for", "and", "or", "some", "fresh"}
COUNT_UNITS = {"each", "pack", "box", "jar", "bottle", "can", "loaf", "bunch"}
WEIGHT_TO_KG = {"g": 0.001, "kg": 1.0}
VOLUME_TO_L = {"ml": 0.001, "l": 1.0}

CANDIDATE_LIMIT = 300


def get_latest_date(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT MAX(date) AS d FROM prices").fetchone()
    return row["d"]


def _significant_words(name: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", name.lower())
    return [w for w in words if w not in STOPWORDS]


def _singularize(word: str) -> str:
    return word[:-1] if len(word) > 3 and word.endswith("s") and not word.endswith("ss") else word


VARIANT_WORDS_NORM = {_singularize(w) for w in VARIANT_WORDS}


def _normalized_words(name: str) -> set[str]:
    return {_singularize(w) for w in _significant_words(name)}


def find_candidates(
    conn: sqlite3.Connection, db_supermarket: str, latest_date: str, item_name: str
) -> list[sqlite3.Row]:
    phrase = item_name.strip()
    rows = conn.execute(
        "SELECT * FROM prices WHERE supermarket = ? AND date = ? AND name LIKE ? LIMIT ?",
        (db_supermarket, latest_date, f"%{phrase}%", CANDIDATE_LIMIT),
    ).fetchall()
    if rows:
        return rows

    words = _significant_words(item_name)
    if not words:
        return []

    and_clause = " AND ".join(["name LIKE ?"] * len(words))
    params = [f"%{w}%" for w in words]
    rows = conn.execute(
        f"SELECT * FROM prices WHERE supermarket = ? AND date = ? AND {and_clause} LIMIT ?",
        [db_supermarket, latest_date, *params, CANDIDATE_LIMIT],
    ).fetchall()
    if rows:
        return rows

    or_clause = " OR ".join(["name LIKE ?"] * len(words))
    rows = conn.execute(
        f"SELECT * FROM prices WHERE supermarket = ? AND date = ? AND ({or_clause}) LIMIT ?",
        [db_supermarket, latest_date, *params, CANDIDATE_LIMIT],
    ).fetchall()
    return rows


def _score_row(item: ParsedItem, prefer_own_brand: bool, row: sqlite3.Row) -> float:
    item_words = _normalized_words(item.name)
    row_words = _normalized_words(row["name"])
    overlap = item_words & row_words
    dice = (2 * len(overlap) / (len(item_words) + len(row_words))) if (item_words or row_words) else 0.0
    char_ratio = difflib.SequenceMatcher(None, item.name.lower(), row["name"].lower()).ratio()
    score = (0.8 * dice) + (0.2 * char_ratio)

    variant_words = row_words & VARIANT_WORDS_NORM - item_words
    score -= 0.12 * len(variant_words)

    if item.category:
        bridged = CATEGORY_BRIDGE.get(item.category.lower())
        if bridged:
            score += 0.35 if row["category"] in bridged else -0.15
        elif row["category"] and row["category"].lower() == item.category.lower():
            score += 0.1

    if prefer_own_brand and row["own_brand"]:
        score += 0.04
    return score


def rank_candidates(
    rows: list[sqlite3.Row], item: ParsedItem, prefer_own_brand: bool
) -> list[tuple[float, sqlite3.Row]]:
    return sorted(
        ((_score_row(item, prefer_own_brand, r), r) for r in rows),
        key=lambda t: (-t[0], t[1]["price"]),
    )


def compute_packs(
    item_quantity: float,
    item_unit: str | None,
    product_unit: str | None,
    price: float,
    price_per_unit: float | None,
) -> int:
    item_unit = (item_unit or "").lower()
    product_unit = (product_unit or "").lower()
    price_per_unit = price_per_unit or 0

    packs = 1
    if product_unit == "kg" and item_unit in WEIGHT_TO_KG and price_per_unit > 0:
        needed_kg = item_quantity * WEIGHT_TO_KG[item_unit]
        pack_size = price / price_per_unit
        packs = math.ceil(needed_kg / pack_size) if pack_size > 0 else 1
    elif product_unit == "l" and item_unit in VOLUME_TO_L and price_per_unit > 0:
        needed_l = item_quantity * VOLUME_TO_L[item_unit]
        pack_size = price / price_per_unit
        packs = math.ceil(needed_l / pack_size) if pack_size > 0 else 1
    elif product_unit == "unit" and item_unit in COUNT_UNITS and price_per_unit > 0:
        subunits_per_pack = max(1, round(price / price_per_unit))
        packs = math.ceil(item_quantity / subunits_per_pack)
    elif item_unit in COUNT_UNITS:
        packs = max(1, round(item_quantity))

    return max(1, min(int(packs), 20))


def _format_size(row: sqlite3.Row) -> str:
    unit = (row["unit"] or "").lower()
    ppu = row["price_per_unit"]
    if unit in ("kg", "l") and ppu:
        size_val = row["price"] / ppu
        return f"{size_val:.2f}{'L' if unit == 'l' else unit}"
    return ""


def _format_price_per_unit(row: sqlite3.Row) -> str | None:
    unit = (row["unit"] or "").lower()
    ppu = row["price_per_unit"]
    if unit in ("kg", "l") and ppu:
        return f"£{ppu:.2f}/{unit}"
    return None


def _guess_brand(row: sqlite3.Row, store_id: str) -> str:
    if row["own_brand"]:
        return STORE_DISPLAY_NAMES[store_id]
    words = row["name"].split()
    return words[0] if words else STORE_DISPLAY_NAMES[store_id]


def build_matched_product(
    store_id: str, row: sqlite3.Row, confidence: float, prefer_own_brand: bool
) -> MatchedProduct:
    return MatchedProduct(
        productId=f"{store_id}-{row['id']}",
        title=row["name"],
        brand=_guess_brand(row, store_id),
        price=round(row["price"], 2),
        size=_format_size(row),
        pricePerUnit=_format_price_per_unit(row),
        imageUrl=None,
        isSubstitute=bool(prefer_own_brand and row["own_brand"]),
        matchConfidence=confidence,
        availability="in_stock",
    )


def compare(conn: sqlite3.Connection, items: list[ParsedItem], filters: Filters) -> ComparisonResult:
    requested = filters.stores or list(STORE_DB_NAMES.keys())
    store_ids: list[StoreId] = [s for s in requested if s in STORE_DB_NAMES]
    latest_date = get_latest_date(conn)
    prefer_own = bool(filters.preferOwnBrand)

    baskets: list[StoreBasket] = []
    for store_id in store_ids:
        db_name = STORE_DB_NAMES[store_id]
        lines: list[StoreLineItem] = []
        total = 0.0
        unavailable = 0

        for item in items:
            rows = find_candidates(conn, db_name, latest_date, item.name)
            ranked = rank_candidates(rows, item, prefer_own)

            if not ranked:
                unavailable += 1
                lines.append(
                    StoreLineItem(
                        requestedItemId=item.id,
                        requestedName=item.name,
                        quantity=item.quantity,
                        matched=None,
                        lineTotal=0.0,
                    )
                )
                continue

            best_score, best_row = ranked[0]
            confidence = max(0.05, min(1.0, round(best_score, 2)))
            packs = compute_packs(
                item.quantity, item.unit, best_row["unit"], best_row["price"], best_row["price_per_unit"]
            )
            product = build_matched_product(store_id, best_row, confidence, prefer_own)
            line_total = round(product.price * packs, 2)
            total = round(total + line_total, 2)

            alternatives = []
            seen_names = {best_row["name"]}
            for alt_score, alt_row in ranked[1:]:
                if alt_row["name"] in seen_names:
                    continue
                seen_names.add(alt_row["name"])
                alt_confidence = max(0.05, min(1.0, round(alt_score, 2)))
                alternatives.append(build_matched_product(store_id, alt_row, alt_confidence, prefer_own))
                if len(alternatives) == 3:
                    break

            lines.append(
                StoreLineItem(
                    requestedItemId=item.id,
                    requestedName=item.name,
                    quantity=item.quantity,
                    matched=product,
                    lineTotal=line_total,
                    alternatives=alternatives or None,
                )
            )

        baskets.append(
            StoreBasket(
                storeId=store_id,
                storeName=STORE_DISPLAY_NAMES[store_id],
                lines=lines,
                total=round(total, 2),
                unavailableCount=unavailable,
                isCheapest=False,
            )
        )

    baskets.sort(key=lambda b: b.total)
    if baskets:
        baskets[0].isCheapest = True
    cheapest = baskets[0] if baskets else None
    dearest = baskets[-1] if baskets else None

    return ComparisonResult(
        basketId=f"b_{uuid.uuid4().hex[:8]}",
        stores=baskets,
        cheapestStoreId=cheapest.storeId if cheapest else None,
        maxSaving=round(dearest.total - cheapest.total, 2) if baskets else 0.0,
        generatedAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
