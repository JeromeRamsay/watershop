import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Customers",
  "Manage Woodstocks Watershop customer profiles, order history, prepaid refills, and override activity.",
);

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return children;
}