import { STORES } from "@/lib/stores";
import type { StoreId } from "@/types/contract";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function StoreAvatar({
  id,
  size = 40,
  className,
}: {
  id: StoreId;
  size?: number;
  className?: string;
}) {
  const meta = STORES[id];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold text-white shrink-0",
        className
      )}
      style={{
        background: meta.color,
        width: size,
        height: size,
        fontSize: size * 0.34,
      }}
      aria-hidden
    >
      {initials(meta.name)}
    </span>
  );
}
