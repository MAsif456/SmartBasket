"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useBasket } from "@/store/basket";
import { Header } from "@/components/Header";
import { InputStage } from "@/components/InputStage";
import { ReviewStage } from "@/components/ReviewStage";
import { ResultsStage } from "@/components/ResultsStage";
import { Button } from "@/components/ui";

export default function Home() {
  const stage = useBasket((s) => s.stage);
  const status = useBasket((s) => s.status);
  const error = useBasket((s) => s.error);
  const checkSaved = useBasket((s) => s.checkSaved);
  const loadPantry = useBasket((s) => s.loadPantry);

  useEffect(() => {
    checkSaved();
    loadPantry();
  }, [checkSaved, loadPantry]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      {status === "error" && (
        <div className="mx-auto mt-4 w-full max-w-2xl px-4">
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertTriangle size={16} />
            <span className="flex-1">
              Something went wrong: {error}. Please try again.
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => useBasket.setState({ status: "idle", error: null })}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {stage === "input" && <InputStage />}
        {stage === "review" && <ReviewStage />}
        {stage === "results" && <ResultsStage />}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        SmartBasket · prices are indicative · built for the GDM Hackathon
      </footer>
    </div>
  );
}
