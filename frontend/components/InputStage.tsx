"use client";

import { ArrowRight, Sparkles, Bookmark } from "lucide-react";
import { useBasket } from "@/store/basket";
import { EXAMPLE_PROMPTS } from "@/lib/mock";
import { Button, Textarea } from "@/components/ui";
import { FilterBar } from "@/components/FilterBar";
import { PantryEditor } from "@/components/PantryEditor";

export function InputStage() {
  const prompt = useBasket((s) => s.prompt);
  const setPrompt = useBasket((s) => s.setPrompt);
  const runParse = useBasket((s) => s.runParse);
  const status = useBasket((s) => s.status);
  const hasSaved = useBasket((s) => s.hasSaved);
  const loadSaved = useBasket((s) => s.loadSaved);

  const parsing = status === "parsing";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16 animate-rise">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
          <Sparkles size={13} /> AI-powered basket builder
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          What&rsquo;s on your shopping list?
        </h1>
        <p className="mt-3 text-muted-foreground text-balance">
          Type your groceries or a meal in plain English. We&rsquo;ll build the
          basket and show which UK supermarket is cheapest.
        </p>
      </div>

      <div className="mt-7">
        <Textarea
          rows={4}
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runParse();
          }}
          placeholder={"e.g. Weekly shop for a family of 4: milk, bread, eggs, chicken, pasta…\nor: Spaghetti bolognese for 4 people"}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              {ex.length > 46 ? ex.slice(0, 44) + "…" : ex}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <FilterBar />
          <PantryEditor />
        </div>

        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={runParse}
          disabled={!prompt.trim() || parsing}
        >
          {parsing ? "Building your basket…" : "Build my basket"}
          {!parsing && <ArrowRight size={18} />}
        </Button>

        {hasSaved && (
          <button
            onClick={loadSaved}
            className="mt-3 mx-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Bookmark size={14} /> Reopen my saved basket
          </button>
        )}
      </div>
    </div>
  );
}
