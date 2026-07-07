"use client";

import { ShoppingBasket } from "lucide-react";
import { useBasket } from "@/store/basket";

export function Header() {
  const reset = useBasket((s) => s.reset);
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <button
          onClick={reset}
          className="flex items-center gap-2 font-semibold text-lg tracking-tight"
        >
          <span className="grid place-items-center h-8 w-8 rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
            <ShoppingBasket size={18} />
          </span>
          Smart<span className="text-primary -ml-1.5">Basket</span>
        </button>
        <span className="text-xs text-muted-foreground hidden sm:block">
          UK grocery price comparison
        </span>
      </div>
    </header>
  );
}
