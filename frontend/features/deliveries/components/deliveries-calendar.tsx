"use client";

import { Delivery } from "../types";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveriesCalendarProps {
  deliveries: Delivery[];
  onDateClick?: (date: Date) => void;
  view?: "month" | "week" | "day";
  onViewChange?: (view: "month" | "week" | "day") => void;
}

interface DayDeliveries {
  date: Date;
  deliveries: Delivery[];
  statusCounts: {
    Scheduled: number;
    Confirmed: number;
    Pending: number;
    Cancelled: number;
  };
}

export function DeliveriesCalendar({
  deliveries,
  onDateClick,
  view = "month",
  onViewChange,
}: DeliveriesCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const parseDeliveryDate = (dateTime: string): Date | null => {
    if (!dateTime) return null;
    const standardDate = new Date(dateTime);
    if (!isNaN(standardDate.getTime())) return standardDate;
    try {
      const [datePart] = dateTime.split(" ");
      if (datePart.includes("/")) {
        const [month, day, year] = datePart.split("/").map(Number);
        const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        const date = new Date(fullYear, month - 1, day);
        if (!isNaN(date.getTime())) return date;
      }
    } catch { /* ignore */ }
    return null;
  };

  const deliveriesByDate = useMemo(() => {
    const grouped: Map<string, Delivery[]> = new Map();
    deliveries.forEach((delivery) => {
      const date = parseDeliveryDate(delivery.dateTime);
      if (date && !isNaN(date.getTime())) {
        const dateKey = date.toISOString().split("T")[0];
        if (!grouped.has(dateKey)) grouped.set(dateKey, []);
        grouped.get(dateKey)!.push(delivery);
      }
    });
    return grouped;
  }, [deliveries]);

  const buildDayData = (date: Date): DayDeliveries => {
    if (isNaN(date.getTime())) {
      return { date: new Date(), deliveries: [], statusCounts: { Scheduled: 0, Confirmed: 0, Pending: 0, Cancelled: 0 } };
    }
    const dateKey = date.toISOString().split("T")[0];
    const dayDeliveries = deliveriesByDate.get(dateKey) || [];
    const statusCounts = { Scheduled: 0, Confirmed: 0, Pending: 0, Cancelled: 0 };
    dayDeliveries.forEach((d) => {
      if (d.status in statusCounts) statusCounts[d.status as keyof typeof statusCounts]++;
    });
    return { date, deliveries: dayDeliveries, statusCounts };
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysFromPrevMonth = new Date(year, month - 1, 0).getDate();
    const days: DayDeliveries[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(buildDayData(new Date(year, month - 1, daysFromPrevMonth - i)));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(buildDayData(new Date(year, month, day)));
    }
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push(buildDayData(new Date(year, month + 1, day)));
    }
    return days;
  }, [currentDate, deliveriesByDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return buildDayData(date);
    });
  }, [currentDate, deliveriesByDate]);

  const dayData = useMemo(() => buildDayData(currentDate), [currentDate, deliveriesByDate]);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPrevious = () => {
    if (view === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    else if (view === "week") { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
    else { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }
  };

  const goToNext = () => {
    if (view === "month") setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    else if (view === "week") { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
    else { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }
  };

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear();

  const getHeaderText = () => {
    if (view === "month") return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const sm = monthNames[start.getMonth()].substring(0, 3);
      const em = monthNames[end.getMonth()].substring(0, 3);
      return start.getMonth() === end.getMonth()
        ? `${sm} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
        : `${sm} ${start.getDate()} - ${em} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  };

  const getDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Exact colors from the spec
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Scheduled": return { bg: "#07C9FF2E", text: "#07C9FF",  border: "#07C9FF" };
      case "Confirmed": return { bg: "#48B97C2E", text: "#48B97C",  border: "#48B97C" };
      case "Pending":   return { bg: "#FF99332E", text: "#FF9933",  border: "#FF9933" };
      case "Cancelled": return { bg: "#FF7D762E", text: "#FF7D76",  border: "#FF7D76" };
      default:          return { bg: "#F3F4F6",   text: "#6B7280",  border: "#E5E7EB" };
    }
  };

  const renderDayCell = (dayData: DayDeliveries, isCurrentMonthDay = true, index?: number) => {
    const { date, statusCounts } = dayData;
    const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const dominantStatus = (["Scheduled", "Confirmed", "Pending", "Cancelled"] as const).find(
      (s) => statusCounts[s] > 0
    );
    const style = dominantStatus ? getStatusStyle(dominantStatus) : null;

    return (
      <div
        key={index !== undefined ? `${getDateKey(date)}-${index}` : getDateKey(date)}
        className="min-h-[120px] border border-[#E2E8F0] bg-white flex flex-col pt-2 pb-4 px-2 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
        onClick={() => onDateClick?.(date)}
      >
        {/* Date number — top right, larger */}
        <div className="flex justify-end mb-3">
          <span className={cn(
            "text-sm font-medium",
            isCurrentMonthDay ? "text-[#374151]" : "text-[#CBD5E1]",
          )}>
            {String(date.getDate()).padStart(2, "0")}
          </span>
        </div>

        {/* Status badge with left border accent */}
        {dominantStatus && totalOrders > 0 && style && (
          <div className="flex flex-col gap-2 px-1">
            <div
              className="text-sm font-medium py-1.5 px-3 rounded-md w-full"
              style={{
                backgroundColor: style.bg,
                color: style.text,
                borderLeft: `3px solid ${style.border}`,
              }}
            >
              {dominantStatus}
            </div>
            <span className="text-sm font-medium text-[#374151] pl-1">
              {totalOrders} Orders
            </span>
          </div>
        )}
      </div>
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-status-green-bg text-status-green-text";
      case "Pending":   return "bg-status-orange-bg text-status-orange-text";
      case "Scheduled": return "bg-status-blue-bg text-status-blue-text";
      case "Cancelled": return "bg-status-red-bg text-status-red-text";
      default:          return "bg-dark-100 text-dark-600";
    }
  };

  const renderGrid = (days: DayDeliveries[]) => (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-[#E2E8F0]">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center py-3 text-sm font-medium text-[#64748B] bg-[#EBF5FB]"
          >
            {day}
          </div>
        ))}
      </div>
      {/* Grid cells */}
      <div className="grid grid-cols-7">
        {days.map((day, index) =>
          renderDayCell(day, isCurrentMonth(day.date), index)
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header: arrows + month label LEFT, Month/Week/Day toggle RIGHT */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrevious}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#6B7280] hover:bg-[#F1F5F9] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={goToNext}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#6B7280] hover:bg-[#F1F5F9] transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1.5 ml-1 text-sm font-semibold text-[#1E293B] hover:text-[#3B82F6] transition-colors">
            {getHeaderText()}
            <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
          </button>
        </div>

        {/* Month / Week / Day toggle */}
        <div className="flex items-center rounded-lg overflow-hidden border border-[#E2E8F0]">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange?.(v)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition-colors capitalize",
                view === v
                  ? "bg-[#0EA5E9] text-white"
                  : "bg-white text-[#6B7280] hover:bg-[#F1F5F9]",
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Month View */}
      {view === "month" && renderGrid(calendarDays)}

      {/* Week View */}
      {view === "week" && renderGrid(weekDays)}

      {/* Day View */}
      {view === "day" && (
        <div className="space-y-2">
          <div className="text-center py-3 text-sm font-medium text-[#64748B] bg-[#EBF5FB] rounded-lg border border-[#E2E8F0]">
            {dayNames[currentDate.getDay()]}
          </div>
          <div className="min-h-[300px] border border-[#E2E8F0] rounded-xl p-4">
            <div className="mb-3">
              <h4 className="text-base font-semibold text-dark-900 dark:text-white mb-1.5">
                {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
              </h4>
            </div>
            <div className="space-y-2">
              {dayData.deliveries.length === 0 ? (
                <p className="text-center text-xs text-dark-400 py-6">
                  No deliveries scheduled for this day
                </p>
              ) : (
                dayData.deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="border border-[#E2E8F0] rounded-lg p-2.5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h5 className="text-sm font-semibold text-dark-900 dark:text-white">
                          {delivery.customer}
                        </h5>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-md", getStatusBadgeClass(delivery.status))}>
                          {delivery.status}
                        </span>
                      </div>
                      <p className="text-xs text-dark-600 dark:text-dark-300 mb-0.5">{delivery.address}</p>
                      <p className="text-xs text-dark-500 dark:text-dark-400">{delivery.dateTime}</p>
                      {delivery.orderId && (
                        <p className="text-xs text-dark-400 dark:text-dark-500 mt-0.5">Order: {delivery.orderId}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {dayData.deliveries.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                <h5 className="text-xs font-semibold text-dark-900 dark:text-white mb-2">Summary</h5>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["Scheduled", "Confirmed", "Pending", "Cancelled"] as const).map((status) => {
                    const s = getStatusStyle(status);
                    return dayData.statusCounts[status] > 0 ? (
                      <div key={status} className="text-center p-1.5 rounded-lg" style={{ backgroundColor: s.bg }}>
                        <div className="text-sm font-semibold" style={{ color: s.text }}>{dayData.statusCounts[status]}</div>
                        <div className="text-xs" style={{ color: s.text }}>{status}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}