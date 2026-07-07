"use client";

import { useBasket } from "@/store/basket";
import type { BrandPreference, ParsedItem, StoreId } from "@/types/contract";
import { ALL_STORE_IDS, STORES } from "@/lib/stores";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

const BRAND_OPTIONS: { value: BrandPreference; label: string }[] = [
  { value: "none", label: "Any brand" },
  { value: "whitelabel", label: "Own-brand" },
  { value: "specific", label: "Specific" },
];

export function ItemPreferences({ item }: { item: ParsedItem }) {
  const updateItem = useBasket((s) => s.updateItem);
  const filters = useBasket((s) => s.filters);
  const compareStores = filters.stores?.length ? filters.stores : ALL_STORE_IDS;

  const selectedStores = item.stores ?? [];
  const toggleStore = (id: StoreId) => {
    const next = selectedStores.includes(id)
      ? selectedStores.filter((s) => s !== id)
      : [...selectedStores, id];
    updateItem(item.id, { stores: next.length ? next : null });
  };

  const setBrandPref = (value: BrandPreference) => {
    updateItem(item.id, {
      brandPreference: value,
      brand: value === "specific" ? (item.brand ?? "") : null,
    });
  };

  return (
    <div className="mt-2 space-y-3 rounded-[var(--radius-sm)] bg-muted/60 p-3 text-sm">
      {/* brand preference */}
      <div>
        <span className="text-xs font-medium text-muted-foreground">Brand</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card p-0.5">
            {BRAND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBrandPref(opt.value)}
                className={cn(
                  "rounded-full px-3 h-7 text-xs transition-colors",
                  item.brandPreference === opt.value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {item.brandPreference === "specific" && (
            <Input
              value={item.brand ?? ""}
              onChange={(e) => updateItem(item.id, { brand: e.target.value })}
              placeholder="e.g. Warburtons"
              className="h-8 w-40"
            />
          )}
        </div>
      </div>

      {/* per-item store preference */}
      <div>
        <span className="text-xs font-medium text-muted-foreground">
          Buy this from
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            onClick={() => updateItem(item.id, { stores: null })}
            className={cn(
              "rounded-full border px-2.5 h-7 text-xs transition-colors",
              selectedStores.length === 0
                ? "border-primary bg-primary-soft text-primary font-medium"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            Any store
          </button>
          {compareStores.map((id) => {
            const active = selectedStores.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleStore(id)}
                className={cn(
                  "rounded-full border px-2.5 h-7 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary font-medium"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {STORES[id].name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
