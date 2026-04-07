import { Notification } from "../types";

interface NotificationsProps {
  notifications: Notification[];
}

export function Notifications({ notifications }: NotificationsProps) {
  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4 flex flex-col w-full ">
      <h2 className="text-base font-semibold text-dark-900 dark:text-white mb-3">
        Notifications{" "}
      </h2>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <div key={notification.id} className="flex items-start gap-2 p-1.5">
              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-900 dark:text-white leading-tight">
                  {notification.message}
                </p>
                <p className="text-xs text-dark-400 dark:text-dark-500 mt-0.5">
                  {notification.timestamp}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
