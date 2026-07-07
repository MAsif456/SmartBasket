"use client";

import { useState } from "react";
import { MapPin, PoundSterling, SlidersHorizontal, Tag } from "lucide-react";
import { useBasket } from "@/store/basket";
import { ALL_STORE_IDS, STORES } from "@/lib/stores";
import type { StoreId } from "@/types/contract";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

const DIETARY = ["vegetarian", "vegan", "gluten-free", "dairy-free"];

export function FilterBar() {
  const filters = useBasket((s) => s.filters);
  const setFilters = useBasket((s) => s.setFilters);
  const [open, setOpen] = useState(false);

  const selectedStores = filters.stores ?? ALL_STORE_IDS;
  const toggleStore = (id: StoreId) => {
    const next = selectedStores.includes(id)
      ? selectedStores.filter((s) => s !== id)
      : [...selectedStores, id];
    setFilters({ stores: next.length ? next : undefined });
  };

  const toggleDietary = (d: string) => {
    const cur = filters.dietary ?? [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
    setFilters({ dietary: next.length ? next : undefined });
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border px-3 h-9 text-sm font-medium transition-colors",
            open ? "bg-muted" : "bg-card hover:bg-muted"
          )}
        >
          <SlidersHorizontal size={15} />
          Filters
        </button>

        <button
          onClick={() => setFilters({ preferOwnBrand: !filters.preferOwnBrand })}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm font-medium transition-colors",
            filters.preferOwnBrand
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-card hover:bg-muted"
          )}
        >
          <Tag size={15} />
          Prefer own-brand
        </button>

        <span className="text-xs text-muted-foreground ml-auto">
          Comparing {selectedStores.length} store
          {selectedStores.length === 1 ? "" : "s"}
        </span>
      </div>

      {open && (
        <div className="mt-3 grid gap-4 rounded-[var(--radius-md)] border border-border bg-card p-4 animate-rise sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin size={14} /> Location
            </span>
            <Input
              placeholder="Postcode (e.g. M1 4WT)"
              value={filters.location ?? ""}
              onChange={(e) => setFilters({ location: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <PoundSterling size={14} /> Max budget
            </span>
            <Input
              type="number"
              min={0}
              placeholder="No limit"
              value={filters.maxBudget ?? ""}
              onChange={(e) =>
                setFilters({
                  maxBudget: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>

          <div className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Stores to compare</span>
            <div className="flex flex-wrap gap-2">
              {ALL_STORE_IDS.map((id) => {
                const active = selectedStores.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleStore(id)}
                    className={cn(
                      "rounded-full border px-3 h-8 text-sm transition-colors",
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

          <div className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Dietary</span>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((d) => {
                const active = (filters.dietary ?? []).includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDietary(d)}
                    className={cn(
                      "rounded-full border px-3 h-8 text-sm capitalize transition-colors",
                      active
                        ? "border-primary bg-primary-soft text-primary font-medium"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
