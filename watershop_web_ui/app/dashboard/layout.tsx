import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-100 dark:bg-dark-900 font-sans text-dark-900 dark:text-white overflow-x-hidden">
      <Header />
      <Sidebar />

      {/* Main Content Area - pushed 72 (w-72) units to the right on desktop, full width on mobile */}
      <main className="ml-0 md:ml-28 pt-14 md:pt-16 min-h-screen">
        <div className="container mx-auto px-4 md:px-6 py-2 md:py-3 max-w-8xl w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
