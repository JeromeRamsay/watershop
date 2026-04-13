import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Reports",
  "Analyze Woodstocks Watershop revenue, customer activity, delivery mix, staff hours, and refill override trends.",
);

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}