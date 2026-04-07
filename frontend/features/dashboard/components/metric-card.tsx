import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

export function MetricCard({ title, value, icon: Icon, iconColor, iconBg }: MetricCardProps) {
  return (
    <div className="p-5 bg-white dark:bg-dark-700 rounded-2xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{title}</p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white mt-1 leading-tight">
            {value}
          </p>
        </div>
        <div
          className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", iconBg)}
        >
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
      </div>
    </div>
  );
}
