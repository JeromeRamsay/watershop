/**
 * Centralised TanStack Query hooks for all API data.
 * Import these instead of calling api.get() directly inside components.
 * Data is cached for 30 s (staleTime) and kept in memory for 5 min (gcTime).
 * Re-visiting a page shows cached data INSTANTLY while a background refresh runs.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface ReportQueryParams {
  year?: number;
  from?: string;
  to?: string;
}

interface CachedPrepaidItem {
  itemId?: string;
  quantityRemaining?: number;
  [key: string]: unknown;
}

interface CachedOverrideTotal {
  itemId?: string;
  itemName?: string;
  quantityDelta?: number;
  count?: number;
  [key: string]: unknown;
}

interface CachedCustomerRecord {
  _id?: string;
  wallet?: {
    prepaidItems?: CachedPrepaidItem[];
    [key: string]: unknown;
  };
  overrideTotals?: CachedOverrideTotal[];
  [key: string]: unknown;
}

interface RefillOverrideMutationResult {
  customerId: string;
  itemId: string;
  itemName: string;
  quantityDelta: number;
  quantityRemaining: number;
}

function normalizeReportParams(params?: number | ReportQueryParams) {
  if (typeof params === "number") {
    return { year: params };
  }

  return params ?? {};
}

function updateCachedCustomerRecord(
  current: CachedCustomerRecord | undefined,
  result: RefillOverrideMutationResult,
  includeOverrideTotals: boolean,
) {
  if (!current?.wallet?.prepaidItems?.length) {
    return current;
  }

  let prepaidItemsChanged = false;
  const nextPrepaidItems = current.wallet.prepaidItems.map((item) => {
    if (String(item.itemId ?? "") !== result.itemId) {
      return item;
    }

    prepaidItemsChanged = true;
    return {
      ...item,
      quantityRemaining: result.quantityRemaining,
    };
  });

  let nextOverrideTotals = current.overrideTotals;
  if (includeOverrideTotals) {
    const overrideTotals = current.overrideTotals || [];
    const existingIndex = overrideTotals.findIndex(
      (item) => String(item.itemId ?? "") === result.itemId,
    );

    if (existingIndex === -1) {
      nextOverrideTotals = [
        ...overrideTotals,
        {
          itemId: result.itemId,
          itemName: result.itemName,
          quantityDelta: result.quantityDelta,
          count: 1,
        },
      ];
    } else {
      nextOverrideTotals = overrideTotals.map((item, index) =>
        index === existingIndex
          ? {
              ...item,
              itemName: result.itemName || item.itemName,
              quantityDelta:
                Number(item.quantityDelta || 0) + result.quantityDelta,
              count: Number(item.count || 0) + 1,
            }
          : item,
      );
    }
  }

  const overrideTotalsChanged = nextOverrideTotals !== current.overrideTotals;
  if (!prepaidItemsChanged && !overrideTotalsChanged) {
    return current;
  }

  return {
    ...current,
    wallet: {
      ...current.wallet,
      prepaidItems: nextPrepaidItems,
    },
    ...(includeOverrideTotals ? { overrideTotals: nextOverrideTotals } : {}),
  };
}

function updateCachedCustomersList(
  current: unknown,
  result: RefillOverrideMutationResult,
) {
  if (!current || typeof current !== "object") {
    return current;
  }

  const response = current as {
    data?: CachedCustomerRecord[];
    [key: string]: unknown;
  };

  if (!Array.isArray(response.data)) {
    return current;
  }

  let changed = false;
  const nextData = response.data.map((customer) => {
    if (String(customer?._id ?? "") !== result.customerId) {
      return customer;
    }

    const nextCustomer = updateCachedCustomerRecord(customer, result, false);
    if (nextCustomer !== customer) {
      changed = true;
    }

    return nextCustomer;
  });

  if (!changed) {
    return current;
  }

  return {
    ...response,
    data: nextData,
  };
}

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const queryKeys = {
  dashboardStats: (params?: object) => ["reports", "dashboard", params] as const,
  topItems:       (params?: object) => ["reports", "top-items", params] as const,
  topCustomers:   (params?: object) => ["reports", "top-customers", params] as const,
  frequentCustomers: (params?: object) => ["reports", "frequent-customers", params] as const,
  walkInStats:    (params?: object) => ["reports", "walk-in-stats", params] as const,
  refillOverrideStats: (params?: object) => ["reports", "refill-override-stats", params] as const,
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
export function useDashboardStats(params?: number | ReportQueryParams) {
  const queryParams = normalizeReportParams(params);
  return useQuery({
    queryKey: queryKeys.dashboardStats(queryParams),
    queryFn: () => api.get("/reports/dashboard", { params: queryParams }).then(r => r.data),
  });
}

export function useTopItems(params?: number | ReportQueryParams) {
  const queryParams = normalizeReportParams(params);
  return useQuery({
    queryKey: queryKeys.topItems(queryParams),
    queryFn: () => api.get("/reports/top-items", { params: queryParams }).then(r => r.data),
  });
}

export function useTopCustomers(params?: number | ReportQueryParams) {
  const queryParams = normalizeReportParams(params);
  return useQuery({
    queryKey: queryKeys.topCustomers(queryParams),
    queryFn: () => api.get("/reports/top-customers", { params: queryParams }).then(r => r.data),
  });
}

export function useWalkInStats(params?: number | ReportQueryParams) {
  const queryParams = normalizeReportParams(params);
  return useQuery({
    queryKey: queryKeys.walkInStats(queryParams),
    queryFn: () => api.get("/reports/walk-in-stats", { params: queryParams }).then(r => r.data),
  });
}

export function useFrequentCustomers(params?: number | ReportQueryParams) {
  const queryParams = normalizeReportParams(params);
  return useQuery({
    queryKey: queryKeys.frequentCustomers(queryParams),
    queryFn: () => api.get("/reports/frequent-customers", { params: queryParams }).then(r => r.data),
  });
}

export function useRefillOverrideStats(params?: number | ReportQueryParams) {
  const queryParams = normalizeReportParams(params);
  return useQuery({
    queryKey: queryKeys.refillOverrideStats(queryParams),
    queryFn: () =>
      api.get("/reports/refill-override-stats", { params: queryParams }).then((r) => r.data),
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

export function useCreateRefillOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      customerId: string;
      itemId: string;
      quantityDelta: number;
      notes?: string;
    }) => api.post("/refill-overrides", payload).then((r) => r.data),
    onSuccess: (data: RefillOverrideMutationResult, variables) => {
      qc.setQueryData(
        queryKeys.customer(variables.customerId),
        (current: CachedCustomerRecord | undefined) =>
          updateCachedCustomerRecord(current, data, true),
      );
      qc.setQueriesData(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "customers" &&
            typeof query.queryKey[1] !== "string",
        },
        (current) => updateCachedCustomersList(current, data),
      );
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
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

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.patch("/users/change-password", payload).then((r) => r.data),
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

export function useMonthlyHours(params: { year?: number; userId?: string; from?: string; to?: string } = {}) {
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

