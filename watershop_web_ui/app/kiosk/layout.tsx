// app/kiosk/layout.tsx
import type { ReactNode } from "react";

export default function KioskLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={{ minHeight: "100vh" }}>{children}</main>
      </body>
    </html>
  );
}
