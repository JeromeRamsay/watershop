"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  dir: SortDirection;
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "center" | "right";
}

/**
 * UI-3: A <th> that toggles asc → desc → unsorted on click.
 * Shows ▲ / ▼ / ⇅ indicator next to the label.
 */
export function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: SortableHeaderProps) {
  const isActive = sort?.key === sortKey;
  const dir = isActive ? sort!.dir : null;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={cn(
        "cursor-pointer select-none whitespace-nowrap",
        "hover:bg-[#F3F4F6] dark:hover:bg-dark-600 transition-colors",
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          align === "center" && "justify-center w-full",
          align === "right" && "justify-end w-full",
        )}
      >
        {label}
        {dir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 text-[#0EA5E9]" aria-hidden />
        ) : dir === "desc" ? (
          <ChevronDown className="h-3.5 w-3.5 text-[#0EA5E9]" aria-hidden />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden />
        )}
      </div>
    </th>
  );
}

/**
 * Helper: toggle sort state — asc → desc → null (unsorted)
 */
export function toggleSort(
  current: SortState | null,
  key: string,
): SortState | null {
  if (current?.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

/**
 * Generic client-side sort comparator.
 * Handles strings (case-insensitive) and numbers.
 */
export function applySortToItems<T extends Record<string, unknown>>(
  items: T[],
  sort: SortState | null,
): T[] {
  if (!sort) return items;
  return [...items].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av ?? "")
        .toLowerCase()
        .localeCompare(String(bv ?? "").toLowerCase());
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

