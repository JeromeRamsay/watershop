/**
 * Centralised TanStack Query hooks for all API data.
 * Import these instead of calling api.get() directly inside components.
 * Data is cached for 30 s (staleTime) and kept in memory for 5 min (gcTime).
 * Re-visiting a page shows cached data INSTANTLY while a background refresh runs.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const queryKeys = {
  dashboardStats: (year?: number) => ["reports", "dashboard", year] as const,
  topItems:       (year?: number) => ["reports", "top-items", year] as const,
  topCustomers:   (year?: number) => ["reports", "top-customers", year] as const,
  frequentCustomers: (year?: number) => ["reports", "frequent-customers", year] as const,
  walkInStats:    (year?: number) => ["reports", "walk-in-stats", year] as const,
  customers:      (params?: object) => ["customers", params] as const,
  customer:       (id: string) => ["customers", id] as const,
  orders:         (year?: number) => ["orders", year] as const,
  order:          (id: string) => ["orders", id] as const,
  inventory:      () => ["inventory"] as const,
  inventoryItem:  (id: string) => ["inventory", id] as const,
  deliveries:     () => ["deliveries"] as const,
  suppliers:      () => ["suppliers"] as const,
  notifications:  () => ["notifications"] as const,
  settings:       () => ["settings"] as const,
  users:          () => ["users"] as const,
  staff:          () => ["users", "staff"] as const,
  employeeHours:  (params?: object) => ["employee-hours", params] as const,
  hoursSummary:   (params?: object) => ["employee-hours", "summary", params] as const,
  hoursMonthly:   (params?: object) => ["employee-hours", "monthly", params] as const,
};

// ─── Reports ────────────────────────────────────────────────────────────────
export function useDashboardStats(year?: number) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(year),
    queryFn: () => api.get("/reports/dashboard", { params: year ? { year } : {} }).then(r => r.data),
  });
}

export function useTopItems(year?: number) {
  return useQuery({
    queryKey: queryKeys.topItems(year),
    queryFn: () => api.get("/reports/top-items", { params: year ? { year } : {} }).then(r => r.data),
  });
}

export function useTopCustomers(year?: number) {
  return useQuery({
    queryKey: queryKeys.topCustomers(year),
    queryFn: () => api.get("/reports/top-customers", { params: year ? { year } : {} }).then(r => r.data),
  });
}

export function useWalkInStats(year?: number) {
  return useQuery({
    queryKey: queryKeys.walkInStats(year),
    queryFn: () => api.get("/reports/walk-in-stats", { params: year ? { year } : {} }).then(r => r.data),
  });
}

export function useFrequentCustomers(year?: number) {
  return useQuery({
    queryKey: queryKeys.frequentCustomers(year),
    queryFn: () => api.get("/reports/frequent-customers", { params: year ? { year } : {} }).then(r => r.data),
  });
}

// ─── Customers ───────────────────────────────────────────────────────────────
export function useCustomers(params: {
  page?: number;
  limit?: number;
  q?: string;
  type?: string;
} = {}) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => api.get("/customers", { params }).then(r => r.data),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => api.get(`/customers/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────
export function useOrders(year?: number, page?: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.orders(year),
    queryFn: () =>
      api
        .get("/orders", { params: { ...(year ? { year } : {}), page: page ?? 1, limit: limit ?? 50 } })
        .then((r) => {
          // Normalise: API now returns { data, pagination } — extract the array
          const body = r.data;
          if (body && Array.isArray(body.data)) return body.data as unknown[];
          return body as unknown[];
        }),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export function useInventory() {
  return useQuery({
    queryKey: queryKeys.inventory(),
    queryFn: () => api.get("/inventory").then(r => r.data),
    staleTime: 60_000, // inventory changes less often — cache for 1 min
  });
}

// ─── Deliveries ──────────────────────────────────────────────────────────────
export function useDeliveries() {
  return useQuery({
    queryKey: queryKeys.deliveries(),
    queryFn: () => api.get("/deliveries").then(r => r.data),
  });
}

// ─── Suppliers ───────────────────────────────────────────────────────────────
export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers(),
    queryFn: () => api.get("/suppliers").then(r => r.data),
    staleTime: 60_000,
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => api.get("/notifications").then(r => r.data),
    staleTime: 15_000, // notifications are time-sensitive — refresh every 15 s
    refetchInterval: 60_000,
  });
}

export function useClearNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/notifications/clear-all"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => api.get("/settings").then(r => r.data),
    staleTime: 5 * 60_000, // settings rarely change
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => api.get("/users").then(r => r.data),
  });
}

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("/users/staff").then(r => r.data),
  });
}

// ─── Employee Hours ──────────────────────────────────────────────────────────
export function useEmployeeHours(params: {
  userId?: string;
  from?: string;
  to?: string;
} = {}) {
  return useQuery({
    queryKey: queryKeys.employeeHours(params),
    queryFn: () => api.get("/employee-hours", { params }).then(r => r.data),
  });
}

export function useHoursSummary(params: {
  userId?: string;
  from?: string;
  to?: string;
} = {}) {
  return useQuery({
    queryKey: queryKeys.hoursSummary(params),
    queryFn: () => api.get("/employee-hours/summary", { params }).then(r => r.data),
  });
}

export function useMonthlyHours(params: { year?: number; userId?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.hoursMonthly(params),
    queryFn: () => api.get("/employee-hours/monthly", { params }).then(r => r.data),
  });
}

// ─── Cache Invalidation Helper ───────────────────────────────────────────────
/**
 * Call this after any mutation to invalidate all cached data so the next
 * read triggers a fresh fetch. Used with the realtime WebSocket updates.
 */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

