import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Employee Hours",
  "Review and record Woodstocks Watershop employee hours for payroll and staffing analysis.",
);

export default function HoursLayout({ children }: { children: React.ReactNode }) {
  return children;
}