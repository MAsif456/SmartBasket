"""Pydantic models mirroring frontend/types/contract.ts. Keep in sync with CONTRACT.md."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

StoreId = Literal["tesco", "sainsburys", "asda", "morrisons", "aldi", "lidl", "waitrose"]


class Filters(BaseModel):
    location: Optional[str] = None
    maxBudget: Optional[float] = None
    preferOwnBrand: Optional[bool] = None
    brands: Optional[list[str]] = None
    dietary: Optional[list[str]] = None
    stores: Optional[list[StoreId]] = None


# ---- POST /api/parse ----
class ParseRequest(BaseModel):
    prompt: str
    filters: Filters = Field(default_factory=Filters)


class ParsedItem(BaseModel):
    id: str
    name: str
    quantity: float
    unit: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    confidence: float


class ParseResponse(BaseModel):
    items: list[ParsedItem]
    assumptions: list[str] = Field(default_factory=list)
    unresolved: list[str] = Field(default_factory=list)


# ---- POST /api/compare ----
class CompareRequest(BaseModel):
    items: list[ParsedItem]
    filters: Filters = Field(default_factory=Filters)


class MatchedProduct(BaseModel):
    productId: str
    title: str
    brand: str
    price: float
    size: str
    pricePerUnit: Optional[str] = None
    imageUrl: Optional[str] = None
    isSubstitute: bool
    matchConfidence: float
    availability: Literal["in_stock", "out_of_stock"]


class StoreLineItem(BaseModel):
    requestedItemId: str
    requestedName: str
    quantity: float
    matched: Optional[MatchedProduct]
    lineTotal: float
    alternatives: Optional[list[MatchedProduct]] = None


class StoreBasket(BaseModel):
    storeId: StoreId
    storeName: str
    logoUrl: Optional[str] = None
    lines: list[StoreLineItem]
    total: float
    unavailableCount: int
    isCheapest: bool


class ComparisonResult(BaseModel):
    basketId: str
    stores: list[StoreBasket]
    cheapestStoreId: Optional[StoreId]
    maxSaving: float
    generatedAt: str
