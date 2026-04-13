import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Suppliers",
  "Manage Woodstocks Watershop supplier contacts, procurement records, and soft-deleted supplier accounts.",
);

export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
  return children;
}