"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";
import Cookies from "js-cookie"; // Client side cookie reader
import api from "@/lib/api";
import Link from "next/link";

type NavbarNotification = {
  id: string;
  message: string;
  createdAt?: string;
};

function timeAgo(date: string | Date) {
  if (!date) return "Unknown time";
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();

  const seconds = Math.floor(diffInMs / 1000);
  if (seconds < 60) return "Just Now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return past.toLocaleDateString();
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string }>({
    name: "User",
    role: "Staff",
  });
  const [notifications, setNotifications] = useState<NavbarNotification[]>([]);

  const isStaff = useMemo(() => user.role?.toLowerCase() === "staff", [user]);

  useEffect(() => {
    const userInfo = Cookies.get("user_info");
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        setUser({
          name: parsed.name || "User",
          role: parsed.role || "Staff",
        });
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications");
        const mapped = (data || []).map((n: any) => ({
          id: n._id,
          message: n.message,
          createdAt: n.createdAt,
        }));
        setNotifications(mapped);
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-white dark:bg-dark-800 dark:border-dark-700 border-b border-dark-100 dark:border-b dark:shadow-lg flex items-center justify-between px-4 md:px-6 z-50 backdrop-blur-sm dark:backdrop-blur-none">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X size={24} className="text-dark-900 dark:text-white" />
            ) : (
              <Menu size={24} className="text-dark-900 dark:text-white" />
            )}
          </button>
          <div className="relative w-28 h-7 md:w-40 md:h-10">
            <Image
              src="/logo.png"
              alt="Water Shop Logo"
              fill
              sizes="(max-width: 768px) 112px, 160px"
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        {/* 2. Right Side Actions */}
        <div className="flex items-center gap-3 md:gap-6">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-full transition-colors">
                <Bell
                  size={20}
                  className="md:w-6 md:h-6 text-dark-500 dark:text-dark-300"
                />
                {notifications.length > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-dark-800" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 text-sm font-semibold text-dark-900 dark:text-white">
                Notifications
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-dark-500 dark:text-dark-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-3 py-2 border-t border-dark-100 dark:border-dark-700 text-sm"
                    >
                      <div className="text-dark-900 dark:text-white">
                        {n.message}
                      </div>
                      <div className="text-xs text-dark-400 dark:text-dark-500 mt-0.5">
                        {timeAgo(n.createdAt || new Date())}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider - Hidden on mobile */}
          <div className="hidden md:block h-8 w-px bg-dark-200 dark:bg-dark-700"></div>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-dark-100 dark:hover:bg-dark-700 p-1.5 md:p-2 rounded-xl transition-colors">
                {/* Avatar Image */}
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-dark-200 dark:border-dark-700 relative">
                  <Image
                    src="https://github.com/shadcn.png"
                    alt="User"
                    fill
                    sizes="(max-width: 768px) 32px, 40px"
                    className="object-cover"
                  />
                </div>

                {/* Text Info - Hidden on mobile */}
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs text-dark-400 dark:text-dark-500 font-medium capitalize">
                    {user.role}
                  </span>
                  <span className="text-sm font-bold text-dark-900 dark:text-white leading-none">
                    {user.name}
                  </span>
                </div>

                <ChevronDown
                  size={16}
                  className="hidden md:block text-dark-400 dark:text-dark-500"
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-primary-500" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              {!isStaff ? (
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2"
                  >
                    <SettingsIcon className="h-4 w-4 text-primary-500" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10"
                onClick={() => logoutAction()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className={`fixed left-0 top-16 bottom-0 w-64 bg-linear-to-b from-primary-500 to-primary-600 dark:from-dark-800 dark:to-dark-900 text-white z-40 transform transition-transform duration-300 ease-in-out md:hidden border-r border-transparent dark:border-dark-700 ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              isMobile={true}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
