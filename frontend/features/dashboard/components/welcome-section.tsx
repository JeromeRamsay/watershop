import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface WelcomeSectionProps {
  userName?: string;
}

export function WelcomeSection({ userName = "John Doe" }: WelcomeSectionProps) {
  const todayLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-GB");
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2 w-full">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[#333333] dark:text-white">
          Welcome Back, {userName}
        </h1>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
        <div className="relative">
          <input
            type="text"
            readOnly
            value={todayLabel}
            className="h-10 px-3 pr-9 rounded-xl border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white focus:outline-none text-sm w-full sm:w-auto"
          />
          <Calendar className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 dark:text-dark-500 pointer-events-none" />
        </div>
        <Link href="/dashboard/orders/new">
          <Button className="bg-primary-500 hover:bg-primary-600 w-full sm:w-auto h-10 text-sm">
            New Order
          </Button>
        </Link>
      </div>
    </div>
  );
}
