import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Login",
  "Sign in to the Woodstocks Watershop employee app to process orders, manage customers, and run store operations.",
);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}