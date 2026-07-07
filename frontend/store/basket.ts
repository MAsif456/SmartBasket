import { create } from "zustand";
import type {
  ComparisonResult,
  Filters,
  ParsedItem,
} from "@/types/contract";
import { compareBasket, parseBasket } from "@/lib/api";

export type Stage = "input" | "review" | "results";
export type Status = "idle" | "parsing" | "comparing" | "error";

const SAVE_KEY = "smartbasket.saved";
const PANTRY_KEY = "smartbasket.pantry";

interface SavedBasket {
  prompt: string;
  filters: Filters;
  items: ParsedItem[];
  savedAt: string;
}

interface BasketState {
  stage: Stage;
  status: Status;
  error: string | null;

  prompt: string;
  filters: Filters;
  pantry: string[];
  items: ParsedItem[];
  assumptions: string[];
  unresolved: string[];
  result: ComparisonResult | null;
  hasSaved: boolean;

  setPrompt: (p: string) => void;
  setFilters: (f: Partial<Filters>) => void;

  addPantry: (name: string) => void;
  removePantry: (name: string) => void;
  loadPantry: () => void;

  runParse: () => Promise<void>;
  addItem: (name: string) => void;
  updateItem: (id: string, patch: Partial<ParsedItem>) => void;
  removeItem: (id: string) => void;

  runCompare: () => Promise<void>;
  reprice: () => Promise<void>;

  goto: (stage: Stage) => void;
  reset: () => void;

  saveBasket: () => void;
  loadSaved: () => void;
  checkSaved: () => void;
}

export const useBasket = create<BasketState>((set, get) => ({
  stage: "input",
  status: "idle",
  error: null,

  prompt: "",
  filters: { preferOwnBrand: false },
  pantry: [],
  items: [],
  assumptions: [],
  unresolved: [],
  result: null,
  hasSaved: false,

  setPrompt: (p) => set({ prompt: p }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),

  addPantry: (name) => {
    const clean = name.trim().toLowerCase();
    if (!clean || get().pantry.includes(clean)) return;
    const next = [...get().pantry, clean];
    set({ pantry: next });
    try {
      localStorage.setItem(PANTRY_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },

  removePantry: (name) => {
    const next = get().pantry.filter((p) => p !== name);
    set({ pantry: next });
    try {
      localStorage.setItem(PANTRY_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },

  loadPantry: () => {
    try {
      const raw = localStorage.getItem(PANTRY_KEY);
      if (raw) set({ pantry: JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  },

  runParse: async () => {
    const { prompt, filters, pantry } = get();
    if (!prompt.trim()) return;
    set({ status: "parsing", error: null });
    try {
      const res = await parseBasket(prompt, { ...filters, pantry });
      set({
        items: res.items,
        assumptions: res.assumptions,
        unresolved: res.unresolved,
        stage: "review",
        status: "idle",
      });
    } catch (e) {
      set({ status: "error", error: (e as Error).message });
    }
  },

  addItem: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item: ParsedItem = {
      id: `u${Date.now()}`,
      name: trimmed.toLowerCase(),
      quantity: 1,
      unit: "each",
      confidence: 1,
    };
    set({ items: [...get().items, item] });
  },

  updateItem: (id, patch) =>
    set({
      items: get().items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }),

  removeItem: (id) =>
    set({ items: get().items.filter((it) => it.id !== id) }),

  runCompare: async () => {
    const { items, filters } = get();
    if (!items.length) return;
    set({ status: "comparing", error: null, stage: "results" });
    try {
      const result = await compareBasket(items, filters);
      set({ result, status: "idle" });
    } catch (e) {
      set({ status: "error", error: (e as Error).message });
    }
  },

  reprice: async () => {
    const { items, filters } = get();
    set({ status: "comparing", error: null });
    try {
      const result = await compareBasket(items, filters);
      set({ result, status: "idle" });
    } catch (e) {
      set({ status: "error", error: (e as Error).message });
    }
  },

  goto: (stage) => set({ stage }),

  reset: () =>
    set({
      stage: "input",
      status: "idle",
      error: null,
      prompt: "",
      items: [],
      assumptions: [],
      unresolved: [],
      result: null,
    }),

  saveBasket: () => {
    const { prompt, filters, items } = get();
    const payload: SavedBasket = {
      prompt,
      filters,
      items,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      set({ hasSaved: true });
    } catch {
      /* ignore quota / SSR */
    }
  },

  loadSaved: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved: SavedBasket = JSON.parse(raw);
      set({
        prompt: saved.prompt,
        filters: saved.filters,
        items: saved.items,
        stage: "review",
        result: null,
      });
    } catch {
      /* ignore */
    }
  },

  checkSaved: () => {
    try {
      set({ hasSaved: !!localStorage.getItem(SAVE_KEY) });
    } catch {
      /* ignore */
    }
  },
}));
