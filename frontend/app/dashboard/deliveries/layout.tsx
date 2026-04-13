import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Deliveries",
  "Schedule, assign, and track Woodstocks Watershop delivery orders and driver activity.",
);

export default function DeliveriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}