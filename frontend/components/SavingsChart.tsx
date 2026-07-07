"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { ComparisonResult } from "@/types/contract";
import { STORES } from "@/lib/stores";
import { gbp } from "@/lib/utils";

export function SavingsChart({ result }: { result: ComparisonResult }) {
  const data = result.stores.map((s) => ({
    name: STORES[s.storeId].name,
    total: s.total,
    color: s.isCheapest ? "var(--primary)" : STORES[s.storeId].color,
    cheapest: s.isCheapest,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 24, right: 8, left: 8, bottom: 0 }}
          barCategoryGap="28%"
        >
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis hide domain={[0, "dataMax + 6"]} />
          <Bar dataKey="total" radius={[8, 8, 0, 0]} isAnimationActive>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              formatter={(v) => gbp(Number(v))}
              style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
