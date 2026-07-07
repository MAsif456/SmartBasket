"use client";

import { useState } from "react";
import { Home, Plus, X } from "lucide-react";
import { useBasket } from "@/store/basket";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PantryEditor() {
  const pantry = useBasket((s) => s.pantry);
  const addPantry = useBasket((s) => s.addPantry);
  const removePantry = useBasket((s) => s.removePantry);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = () => {
    addPantry(draft);
    setDraft("");
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm font-medium transition-colors",
          pantry.length
            ? "border-primary bg-primary-soft text-primary"
            : open
              ? "bg-muted border-border"
              : "bg-card border-border hover:bg-muted"
        )}
      >
        <Home size={15} />
        Already have at home
        {pantry.length > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {pantry.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-card p-4 animate-rise">
          <p className="text-sm text-muted-foreground">
            List staples you already have — we&rsquo;ll leave them out of your
            basket so you don&rsquo;t pay twice.
          </p>

          {pantry.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pantry.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 h-8 text-sm capitalize"
                >
                  {p}
                  <button
                    onClick={() => removePantry(p)}
                    className="text-muted-foreground hover:text-danger"
                    aria-label={`Remove ${p}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. pasta, olive oil, onions"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-border bg-card px-3 h-10 text-sm hover:bg-muted disabled:opacity-40"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
