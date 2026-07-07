"""Build smartbasket.db (SQLite) from the CSVs in PriceData/.

Usage: python build_db.py
"""
import sqlite3
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent
CSV_DIR = BASE_DIR / "PriceData"
DB_PATH = BASE_DIR / "smartbasket.db"

CSV_FILES = [
    "All_Data_Aldi.csv",
    "All_Data_ASDA.csv",
    "All_Data_Morrisons.csv",
    "All_Data_Sains.csv",
    "All_Data_Tesco.csv",
]

COLUMN_RENAME = {
    "supermarket": "supermarket",
    "prices_(£)": "price",
    "prices_unit_(£)": "price_per_unit",
    "unit": "unit",
    "names": "name",
    "date": "date",
    "category": "category",
    "own_brand": "own_brand",
}

CHUNK_SIZE = 200_000


def build():
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA synchronous = OFF")
    conn.execute("PRAGMA journal_mode = MEMORY")

    conn.execute(
        """
        CREATE TABLE prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supermarket TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            price REAL,
            price_per_unit REAL,
            unit TEXT,
            own_brand INTEGER,
            date TEXT NOT NULL
        )
        """
    )

    total_rows = 0
    for csv_name in CSV_FILES:
        csv_path = CSV_DIR / csv_name
        print(f"Loading {csv_name}...")
        for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE, low_memory=False):
            chunk = chunk.rename(columns=COLUMN_RENAME)
            chunk = chunk.dropna(subset=["name"])
            chunk["date"] = pd.to_datetime(chunk["date"], format="%Y%m%d").dt.strftime("%Y-%m-%d")
            chunk["own_brand"] = chunk["own_brand"].fillna(False).infer_objects(copy=False).astype(bool).astype(int)
            chunk = chunk[["supermarket", "name", "category", "price", "price_per_unit", "unit", "own_brand", "date"]]
            chunk.to_sql("prices", conn, if_exists="append", index=False)
            total_rows += len(chunk)
        print(f"  {csv_name} done, running total: {total_rows} rows")

    print("Creating indexes...")
    conn.execute("CREATE INDEX idx_prices_supermarket ON prices(supermarket)")
    conn.execute("CREATE INDEX idx_prices_category ON prices(category)")
    conn.execute("CREATE INDEX idx_prices_date ON prices(date)")
    conn.execute("CREATE INDEX idx_prices_name ON prices(name)")
    conn.execute("CREATE INDEX idx_prices_name_supermarket ON prices(name, supermarket)")
    conn.commit()
    conn.close()

    print(f"Done. {total_rows} rows written to {DB_PATH}")


if __name__ == "__main__":
    build()
