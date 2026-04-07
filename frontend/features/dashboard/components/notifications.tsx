"use client";

import { X, Trash2 } from "lucide-react";
import { Notification } from "../types";
import { Button } from "@/components/ui/button";

interface NotificationsProps {
  notifications: Notification[];
  onClear: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export function Notifications({
  notifications,
  onClear,
  onClearAll,
  onNotificationClick,
}: NotificationsProps) {
  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4 flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold text-dark-900 dark:text-white">
          Notifications
        </h2>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 px-2 gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-xs text-dark-400 dark:text-dark-500 text-center py-4">
            No notifications
          </p>
        ) : (
          notifications.map((notification) => {
            const Icon = notification.icon;
            const isUrgent = !!notification.hasBalance;
            const isClickable = !!notification.orderId && !!onNotificationClick;

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-2 p-1.5 rounded-md group transition-colors ${
                  isClickable
                    ? "cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-600 active:bg-dark-100 dark:active:bg-dark-500"
                    : ""
                }`}
                onClick={
                  isClickable
                    ? () => onNotificationClick!(notification)
                    : undefined
                }
              >
                {/* Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isUrgent
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-primary-100 dark:bg-primary-900"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isUrgent
                        ? "text-red-500 dark:text-red-400"
                        : "text-primary-500 dark:text-primary-400"
                    }`}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-tight ${isClickable ? "text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400" : "text-dark-900 dark:text-white"}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-dark-400 dark:text-dark-500 mt-0.5">
                    {notification.timestamp}
                    {isClickable && (
                      <span className="ml-1 text-primary-500 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        · tap to edit
                      </span>
                    )}
                  </p>
                </div>

                {/* Clear button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear(notification.id);
                  }}
                  className="opacity-30 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-dark-200 dark:hover:bg-dark-500 text-dark-400 hover:text-dark-700 dark:hover:text-white"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
