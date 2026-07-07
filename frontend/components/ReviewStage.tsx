"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  MapPin,
  Minus,
  Plus,
  SlidersHorizontal,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useBasket } from "@/store/basket";
import type { ParsedItem } from "@/types/contract";
import { STORES } from "@/lib/stores";
import { Badge, Button, Card, Input } from "@/components/ui";
import { FilterBar } from "@/components/FilterBar";
import { ItemPreferences } from "@/components/ItemPreferences";
import { cn } from "@/lib/utils";

const LOW_CONFIDENCE = 0.85;

function PrefBadges({ item }: { item: ParsedItem }) {
  const storeIds = item.stores ?? [];
  return (
    <>
      {item.brandPreference === "specific" && item.brand && (
        <Badge tone="primary">{item.brand}</Badge>
      )}
      {item.brandPreference === "whitelabel" && (
        <Badge tone="neutral">Own-brand</Badge>
      )}
      {storeIds.length > 0 && (
        <Badge tone="accent" className="gap-1">
          <MapPin size={10} />
          {STORES[storeIds[0]].name}
          {storeIds.length > 1 ? ` +${storeIds.length - 1}` : ""}
        </Badge>
      )}
    </>
  );
}

function ItemRow({ item }: { item: ParsedItem }) {
  const updateItem = useBasket((s) => s.updateItem);
  const removeItem = useBasket((s) => s.removeItem);
  const [showPrefs, setShowPrefs] = useState(false);
  const low = item.confidence < LOW_CONFIDENCE;

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium capitalize truncate">{item.name}</span>
            {low && (
              <span
                className="inline-flex items-center gap-1 text-accent-foreground/80"
                title="We inferred this from your text — double-check it"
              >
                <AlertCircle size={13} className="text-accent" />
              </span>
            )}
            <PrefBadges item={item} />
          </div>
          {item.note && (
            <span className="text-xs text-muted-foreground">{item.note}</span>
          )}
        </div>

        <button
          onClick={() => setShowPrefs((o) => !o)}
          className={cn(
            "grid place-items-center h-8 w-8 rounded-full transition-colors",
            showPrefs
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-label={`Preferences for ${item.name}`}
          title="Brand & store preferences"
        >
          <SlidersHorizontal size={15} />
        </button>

        <div className="flex items-center rounded-full border border-border">
          <button
            className="grid place-items-center h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
            onClick={() =>
              updateItem(item.id, {
                quantity: Math.max(1, item.quantity - stepFor(item)),
              })
            }
            disabled={item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus size={14} />
          </button>
          <span className="w-14 text-center text-sm tabular-nums">
            {item.quantity}
            <span className="text-muted-foreground ml-0.5">{item.unit}</span>
          </span>
          <button
            className="grid place-items-center h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() =>
              updateItem(item.id, { quantity: item.quantity + stepFor(item) })
            }
            aria-label="Increase quantity"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          className="grid place-items-center h-8 w-8 rounded-full text-muted-foreground hover:text-danger hover:bg-danger-soft"
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {showPrefs && <ItemPreferences item={item} />}
    </div>
  );
}

function stepFor(item: ParsedItem): number {
  return item.unit === "g" ? 50 : 1;
}

export function ReviewStage() {
  const items = useBasket((s) => s.items);
  const assumptions = useBasket((s) => s.assumptions);
  const unresolved = useBasket((s) => s.unresolved);
  const postcode = useBasket((s) => s.postcode);
  const addItem = useBasket((s) => s.addItem);
  const runCompare = useBasket((s) => s.runCompare);
  const goto = useBasket((s) => s.goto);
  const [draft, setDraft] = useState("");

  const submitAdd = () => {
    addItem(draft);
    setDraft("");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-rise">
      <button
        onClick={() => goto("input")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Edit prompt
      </button>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Review your basket</h2>
        {postcode && (
          <Badge tone="neutral" className="gap-1">
            <MapPin size={12} /> {postcode}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-muted-foreground">
        {items.length} item{items.length === 1 ? "" : "s"} — tweak quantities,
        set brand or store preferences, then compare.
      </p>

      {assumptions.length > 0 && (
        <div className="mt-4 flex gap-2 rounded-[var(--radius-md)] bg-primary-soft px-3 py-2.5 text-sm text-primary">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div>{assumptions.join(" ")}</div>
        </div>
      )}

      <Card className="mt-4 divide-y divide-border px-4">
        {items.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Your basket is empty — add an item below.
          </div>
        )}
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}

        <div className="flex items-center gap-2 py-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAdd()}
            placeholder="Add an item (e.g. orange juice)"
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={submitAdd} disabled={!draft.trim()}>
            <Plus size={15} /> Add
          </Button>
        </div>
      </Card>

      {unresolved.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Couldn&rsquo;t match:{" "}
          <span className="italic">{unresolved.join(", ")}</span>. Add them
          manually if you need them.
        </p>
      )}

      <div className="mt-5">
        <FilterBar />
      </div>

      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={runCompare}
        disabled={items.length === 0}
      >
        Compare prices across supermarkets <ArrowRight size={18} />
      </Button>
    </div>
  );
}
