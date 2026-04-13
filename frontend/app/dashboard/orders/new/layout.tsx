import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "New Order",
  "Create a new Woodstocks Watershop sale, apply credits or refills, and prepare receipts from the employee app.",
);

export default function NewOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}