import Link from "next/link";
import { Delivery } from "../types";
import { cn } from "@/lib/utils";

interface UpcomingDeliveriesProps {
  deliveries: Delivery[];
}

export function UpcomingDeliveries({ deliveries }: UpcomingDeliveriesProps) {
  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-4 flex flex-col w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold text-dark-900 dark:text-white">Upcoming Deliveries</h2>
        <Link
          href="/dashboard/deliveries"
          className="text-xs text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium"
        >
          View All
        </Link>
      </div>
      <div className="overflow-x-auto min-w-0 -mx-4 px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[600px] md:min-w-0">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-600">
              <th className="text-center py-2 px-2 text-xs font-medium text-dark-600 dark:text-dark-300">Customer</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-dark-600 dark:text-dark-300">Address</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-dark-600 dark:text-dark-300">
                Date & Time
              </th>
              <th className="text-center py-2 px-2 text-xs font-medium text-dark-600 dark:text-dark-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.id} className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors">
                <td className="py-2 px-2 text-xs text-dark-900 dark:text-white text-center">{delivery.customer}</td>
                <td className="py-2 px-2 text-xs text-dark-900 dark:text-white text-center">{delivery.address}</td>
                <td className="py-2 px-2 text-xs text-dark-900 dark:text-white text-center">{delivery.dateTime}</td>
                <td className="py-2 px-2 whitespace-nowrap text-center">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap w-20",
                      delivery.status === "Confirmed"
                        ? "bg-status-green-bg text-status-green-text"
                        : delivery.status === "Pending"
                        ? "bg-status-orange-bg text-status-orange-text"
                        : "bg-status-blue-bg text-status-blue-text"
                    )}
                  >
                    {delivery.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
