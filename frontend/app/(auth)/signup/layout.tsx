import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Sign Up",
  "Create a Woodstocks Watershop employee account when onboarding new staff into the employee app.",
);

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}