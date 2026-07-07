"""FastAPI app serving price data from smartbasket.db.

Run with: uvicorn main:app --reload
"""
import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query

DB_PATH = Path(__file__).parent / "smartbasket.db"

app = FastAPI(title="SmartBasket API")


def get_db():
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/supermarkets")
def list_supermarkets(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT DISTINCT supermarket FROM prices ORDER BY supermarket").fetchall()
    return [row["supermarket"] for row in rows]


@app.get("/categories")
def list_categories(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT DISTINCT category FROM prices ORDER BY category").fetchall()
    return [row["category"] for row in rows]


@app.get("/products/search")
def search_products(
    q: str = Query(..., min_length=1, description="Substring to search for in product names"),
    supermarket: Optional[str] = None,
    category: Optional[str] = None,
    own_brand: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: sqlite3.Connection = Depends(get_db),
):
    """Latest known row (most recent date) for each matching (supermarket, name) pair."""
    conditions = ["name LIKE ?"]
    params: list = [f"%{q}%"]

    if supermarket:
        conditions.append("supermarket = ?")
        params.append(supermarket)
    if category:
        conditions.append("category = ?")
        params.append(category)
    if own_brand is not None:
        conditions.append("own_brand = ?")
        params.append(int(own_brand))

    where_clause = " AND ".join(conditions)

    sql = f"""
        SELECT p.*
        FROM prices p
        JOIN (
            SELECT supermarket, name, MAX(date) AS max_date
            FROM prices
            WHERE {where_clause}
            GROUP BY supermarket, name
        ) latest
        ON p.supermarket = latest.supermarket
        AND p.name = latest.name
        AND p.date = latest.max_date
        ORDER BY p.name
        LIMIT ? OFFSET ?
    """
    rows = db.execute(sql, params + [limit, offset]).fetchall()
    return [dict(row) for row in rows]


@app.get("/products/history")
def product_history(
    name: str,
    supermarket: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """Full price history for an exact product name, optionally scoped to one supermarket."""
    conditions = ["name = ?"]
    params: list = [name]

    if supermarket:
        conditions.append("supermarket = ?")
        params.append(supermarket)

    where_clause = " AND ".join(conditions)
    sql = f"SELECT * FROM prices WHERE {where_clause} ORDER BY date"
    rows = db.execute(sql, params).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No price history found for this product")

    return [dict(row) for row in rows]


@app.get("/prices")
def list_prices(
    date: Optional[str] = Query(None, description="ISO date, e.g. 2024-04-13"),
    supermarket: Optional[str] = None,
    category: Optional[str] = None,
    own_brand: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: sqlite3.Connection = Depends(get_db),
):
    conditions = []
    params: list = []

    if date:
        conditions.append("date = ?")
        params.append(date)
    if supermarket:
        conditions.append("supermarket = ?")
        params.append(supermarket)
    if category:
        conditions.append("category = ?")
        params.append(category)
    if own_brand is not None:
        conditions.append("own_brand = ?")
        params.append(int(own_brand))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM prices {where_clause} ORDER BY id LIMIT ? OFFSET ?"
    rows = db.execute(sql, params + [limit, offset]).fetchall()
    return [dict(row) for row in rows]
