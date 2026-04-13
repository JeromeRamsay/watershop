import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Settings",
  "Configure Woodstocks Watershop store settings, operating details, and receipt preferences.",
);

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}