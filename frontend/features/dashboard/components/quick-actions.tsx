import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QuickAction } from "../types";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4 flex flex-col w-full">
      <h2 className="text-base font-semibold text-dark-900 dark:text-white mb-3">Quick Actions</h2>
      <div className="space-y-1.5 flex flex-col">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href || "#"}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors group flex-1"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <Icon
                    className="w-4 h-4 text-primary-600 dark:text-primary-400"
                    // @ts-expect-error - Lucide icons accept strokeWidth prop
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-xs font-medium text-dark-900 dark:text-white">{action.label}</span>
              </div>
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                <ChevronRight className="w-3 h-3 text-primary-500" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
