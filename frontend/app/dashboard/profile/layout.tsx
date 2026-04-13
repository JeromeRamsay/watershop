import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "My Profile",
  "Update your Woodstocks Watershop account password from your employee profile.",
);

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
