"use client";

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  PiggyBank,
  RefreshCw,
} from "lucide-react";
import { useBasket } from "@/store/basket";
import { storeName } from "@/lib/stores";
import { Button, Card } from "@/components/ui";
import { SavingsChart } from "@/components/SavingsChart";
import { StoreComparison } from "@/components/StoreComparison";
import { gbp } from "@/lib/utils";

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-28 rounded-[var(--radius-lg)] bg-muted animate-pulse" />
      <div className="h-[220px] rounded-[var(--radius-lg)] bg-muted animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 rounded-[var(--radius-lg)] bg-muted animate-pulse"
        />
      ))}
    </div>
  );
}

export function ResultsStage() {
  const result = useBasket((s) => s.result);
  const status = useBasket((s) => s.status);
  const goto = useBasket((s) => s.goto);
  const reprice = useBasket((s) => s.reprice);
  const saveBasket = useBasket((s) => s.saveBasket);
  const hasSaved = useBasket((s) => s.hasSaved);

  const comparing = status === "comparing";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-rise">
      <button
        onClick={() => goto("review")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Edit basket
      </button>

      {comparing || !result ? (
        <ResultsSkeleton />
      ) : (
        <>
          {/* Savings banner */}
          <Card className="overflow-hidden border-primary/40 bg-gradient-to-br from-primary-soft to-card p-5">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-full bg-primary text-primary-foreground shrink-0">
                <PiggyBank size={22} />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">
                  Cheapest at
                </div>
                <div className="text-2xl font-bold tracking-tight">
                  {storeName(result.cheapestStoreId)} —{" "}
                  {gbp(result.stores[0]?.total ?? 0)}
                </div>
                {result.maxSaving > 0.001 && (
                  <div className="mt-1 text-sm">
                    You&rsquo;d save{" "}
                    <span className="font-semibold text-primary">
                      {gbp(result.maxSaving)}
                    </span>{" "}
                    vs {storeName(result.stores[result.stores.length - 1].storeId)}.
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Chart */}
          <Card className="mt-3 p-4">
            <SavingsChart result={result} />
          </Card>

          {/* Per-store breakdown */}
          <h3 className="mt-6 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Basket at each store
          </h3>
          <StoreComparison result={result} />

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" onClick={reprice} disabled={comparing}>
              <RefreshCw size={16} /> Reprice
            </Button>
            <Button
              variant={hasSaved ? "ghost" : "outline"}
              onClick={saveBasket}
            >
              {hasSaved ? (
                <>
                  <BookmarkCheck size={16} /> Saved
                </>
              ) : (
                <>
                  <Bookmark size={16} /> Save basket
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
