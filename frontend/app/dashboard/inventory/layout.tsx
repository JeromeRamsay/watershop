import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Inventory",
  "Track Woodstocks Watershop products, refillable items, pricing, stock levels, warranties, and return policies.",
);

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}