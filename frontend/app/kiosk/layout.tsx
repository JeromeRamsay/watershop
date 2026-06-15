import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kiosk — Watershop",
  description: "Self-service water refill kiosk",
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {children}
    </div>
  );
}
