import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Edit Customer",
  "Update Woodstocks Watershop customer contact details, notes, addresses, and account information.",
);

export default function EditCustomerLayout({ children }: { children: React.ReactNode }) {
  return children;
}