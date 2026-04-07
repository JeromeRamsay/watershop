"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  Settings,
  UserCog,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/dashboard/inventory", icon: ClipboardList },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Deliveries", href: "/dashboard/deliveries", icon: Truck },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Employees", href: "/dashboard/employees", icon: UserCog },
  { name: "Hours", href: "/dashboard/hours", icon: Clock3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];


interface SidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isMobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState("admin");

  useEffect(() => {
    const userInfo = Cookies.get("user_info");
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        if (parsed.role) setRole(parsed.role);
      } catch {
        setRole("admin");
      }
    }
  }, []);

  const visibleItems =
    role === "staff"
      ? menuItems.filter(
          (item) =>
            item.name !== "Reports" &&
            item.name !== "Settings" &&
            item.name !== "Employees",
        )
      : menuItems;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  if (isMobile) {
    return (
      <nav className="flex-1 px-4 pt-6 space-y-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleClick}
            className={cn(
              "flex items-center gap-4 py-4 px-4 rounded-xl transition-all duration-200 group",
              isActive
                ? "bg-primary-100/40 dark:bg-dark-700 text-white dark:text-white shadow-sm"
                : "text-primary-100 dark:text-dark-300 hover:bg-primary-700 dark:hover:bg-dark-700 hover:text-white dark:hover:text-white"
            )}
          >
            <Icon 
              size={24} 
              strokeWidth={1.5}
              className={cn(
                "transition-colors",
                isActive
                  ? "text-white dark:text-white"
                  : "text-primary-100 dark:text-dark-400 group-hover:text-white dark:group-hover:text-white"
              )}
            />
            <span className={cn(
              "text-base font-semibold transition-colors",
              isActive
                ? "text-white dark:text-white"
                : "text-primary-100 dark:text-dark-400 group-hover:text-white dark:group-hover:text-white"
            )}>
              {item.name}
            </span>
          </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <aside className="hidden md:flex w-28 fixed left-0 top-20 h-[calc(100vh-5rem)] flex-col z-40 shadow-xl rounded-r-[32px] bg-gradient-to-b from-primary-500 to-primary-600 dark:from-dark-800 dark:to-dark-900 text-white border-r border-transparent dark:border-dark-700">
      <nav className="flex-1 px-2 pt-6 space-y-2 overflow-y-auto no-scrollbar flex flex-col">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-primary-100/40 dark:bg-dark-700 text-white dark:text-white shadow-sm dark:shadow-dark-700/50"
                  : "text-primary-100 dark:text-dark-300 hover:bg-primary-700 dark:hover:bg-dark-700 hover:text-white dark:hover:text-white"
              )}
            >
              <Icon 
                size={26} 
                strokeWidth={1.5} 
                className={cn(
                  "mb-1 transition-colors",
                  isActive 
                    ? "text-white dark:text-white" 
                    : "text-primary-100 dark:text-dark-400 group-hover:text-white dark:group-hover:text-white"
                )} 
              />
              <span className={cn(
                "text-xs font-semibold mt-1 antialiased transition-colors",
                isActive
                  ? "text-white dark:text-white"
                  : "text-primary-100 dark:text-dark-400 group-hover:text-white dark:group-hover:text-white"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
