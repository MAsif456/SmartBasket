"use client";

import { useState } from "react";
import {
  ChevronDown,
  Crown,
  Repeat,
  XCircle,
} from "lucide-react";
import type { ComparisonResult, StoreBasket } from "@/types/contract";
import { StoreAvatar } from "@/components/StoreAvatar";
import { Badge, Card } from "@/components/ui";
import { cn, gbp } from "@/lib/utils";

function LineRow({ line }: { line: StoreBasket["lines"][number] }) {
  if (!line.matched) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <XCircle size={15} className="text-danger shrink-0" />
        <span className="capitalize">{line.requestedName}</span>
        <span className="ml-auto text-xs">not available</span>
      </div>
    );
  }
  const p = line.matched;
  return (
    <div className="flex items-start gap-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{p.title}</span>
          {p.isSubstitute && (
            <Badge tone="accent" className="gap-1">
              <Repeat size={11} /> own-brand swap
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {line.quantity > 1 ? `${line.quantity} × ` : ""}
          {gbp(p.price)}
          {line.matched.pricePerUnit ? ` · ${line.matched.pricePerUnit}` : ""}
        </span>
      </div>
      <span className="tabular-nums font-medium">{gbp(line.lineTotal)}</span>
    </div>
  );
}

function StoreCard({
  store,
  cheapestTotal,
  defaultOpen,
}: {
  store: StoreBasket;
  cheapestTotal: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const diff = store.total - cheapestTotal;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow",
        store.isCheapest
          ? "border-primary ring-1 ring-primary shadow-sm"
          : "hover:shadow-sm"
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <StoreAvatar id={store.storeId} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{store.storeName}</span>
            {store.isCheapest && (
              <Badge tone="primary" className="gap-1">
                <Crown size={11} /> Cheapest
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {store.unavailableCount > 0
              ? `${store.unavailableCount} item${store.unavailableCount === 1 ? "" : "s"} unavailable`
              : "All items in stock"}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">
            {gbp(store.total)}
          </div>
          {diff > 0.001 ? (
            <div className="text-xs text-muted-foreground tabular-nums">
              +{gbp(diff)}
            </div>
          ) : (
            <div className="text-xs font-medium text-primary">best price</div>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 divide-y divide-border">
          {store.lines.map((line) => (
            <LineRow key={line.requestedItemId} line={line} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function StoreComparison({ result }: { result: ComparisonResult }) {
  const cheapestTotal = result.stores[0]?.total ?? 0;
  return (
    <div className="grid gap-3">
      {result.stores.map((store) => (
        <StoreCard
          key={store.storeId}
          store={store}
          cheapestTotal={cheapestTotal}
          defaultOpen={store.isCheapest}
        />
      ))}
    </div>
  );
}
