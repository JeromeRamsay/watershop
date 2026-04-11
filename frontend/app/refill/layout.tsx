import type { Metadata } from "next";
import type { ReactNode } from "react";

import KioskLayout, { metadata as kioskMetadata } from "../kiosk/layout";

export const metadata: Metadata = kioskMetadata;

export default function RefillLayout({ children }: { children: ReactNode }) {
  return <KioskLayout>{children}</KioskLayout>;
}