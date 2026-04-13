import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Orders",
  "Review and manage Woodstocks Watershop orders, payment status, delivery flags, and order lifecycle activity.",
);

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}