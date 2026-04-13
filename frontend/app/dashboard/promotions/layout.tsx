import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Promotions",
  "Create and manage Woodstocks Watershop promotions that surface during employee checkout flows.",
);

export default function PromotionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}