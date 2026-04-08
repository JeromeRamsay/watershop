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
    <div className="min-h-screen h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-auto">
      {children}
    </div>
  );
}
