import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Employees",
  "Manage Woodstocks Watershop staff accounts, permissions, and archived employee records.",
);

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return children;
}