"use client";

import Cookies from "js-cookie";
import { useEffect, useState } from "react";

type CurrentUserRole = "admin" | "staff";

export interface CurrentUserInfo {
  id?: string;
  name?: string;
  role?: CurrentUserRole | string;
}

export function getCurrentUserInfo(): CurrentUserInfo {
  try {
    return JSON.parse(Cookies.get("user_info") || "{}") as CurrentUserInfo;
  } catch {
    return {};
  }
}

export function isCurrentUserAdmin(): boolean {
  return getCurrentUserInfo().role?.toLowerCase() === "admin";
}

export function useCurrentUserInfo(): CurrentUserInfo {
  const [userInfo, setUserInfo] = useState<CurrentUserInfo>({});

  useEffect(() => {
    setUserInfo(getCurrentUserInfo());
  }, []);

  return userInfo;
}

export function useIsCurrentUserAdmin(): boolean {
  const userInfo = useCurrentUserInfo();
  return userInfo.role?.toLowerCase() === "admin";
}