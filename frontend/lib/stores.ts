import type { StoreId } from "@/types/contract";

export interface StoreMeta {
  id: StoreId;
  name: string;
  color: string; // brand-ish colour for avatar + chart
}

export const STORES: Record<StoreId, StoreMeta> = {
  tesco: { id: "tesco", name: "Tesco", color: "#00539f" },
  sainsburys: { id: "sainsburys", name: "Sainsbury's", color: "#f06c00" },
  asda: { id: "asda", name: "Asda", color: "#68a51c" },
  morrisons: { id: "morrisons", name: "Morrisons", color: "#007733" },
  aldi: { id: "aldi", name: "Aldi", color: "#1e3d8f" },
  lidl: { id: "lidl", name: "Lidl", color: "#0050aa" },
  waitrose: { id: "waitrose", name: "Waitrose", color: "#4b9560" },
};

export const ALL_STORE_IDS: StoreId[] = Object.keys(STORES) as StoreId[];

export function storeName(id: StoreId): string {
  return STORES[id]?.name ?? id;
}
