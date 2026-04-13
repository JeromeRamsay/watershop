export interface SalesData {
  month: string;
  sales: number;
}

export interface ReportDateRange {
  year?: number;
  from?: string;
  to?: string;
}

export interface SalesTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  todayDeliveryOrders: number;
  todayPrepaidOrders: number;
  uniqueCustomersServed: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  deliveryOrders: number;
  walkInOrders: number;
  walkInPercentage: number;
  prepaidRedemptions: number;
  refillCount: number;
  salesTrend: SalesTrendPoint[];
}

export interface CustomerSales {
  customer: string;
  sales: number;
}

export interface CustomerFrequency {
  customer: string;
  frequency: number;
}

export interface ProductSales {
  name: string;
  units: number;
  color: string;
}

export interface WalkInStats {
  totalWalkInOrders: number;
  walkInRevenue: number;
  avgWalkInOrderValue: number;
  totalOrders: number;
  walkInPercentage: number;
  monthlyBreakdown: { month: string; orders: number; revenue: number }[];
}

export interface RefillOverrideSummary {
  totalOverrides: number;
  quantityDelta: number;
  positiveQuantityDelta: number;
  negativeQuantityDelta: number;
  usersAffected: number;
  customersAffected: number;
}

export interface RefillOverrideByUser {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  overrideCount: number;
  quantityDelta: number;
  positiveQuantityDelta: number;
  negativeQuantityDelta: number;
  customersAffected: number;
}

export interface RefillOverrideByCustomer {
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  overrideCount: number;
  quantityDelta: number;
  positiveQuantityDelta: number;
  negativeQuantityDelta: number;
  usersAffected: number;
}

export interface RefillOverrideByUserCustomer {
  userId: string;
  customerId: string;
  username?: string;
  userFirstName?: string;
  userLastName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  overrideCount: number;
  quantityDelta: number;
  positiveQuantityDelta: number;
  negativeQuantityDelta: number;
}

export interface RefillOverrideStats {
  summary: RefillOverrideSummary;
  byUser: RefillOverrideByUser[];
  byCustomer: RefillOverrideByCustomer[];
  byUserCustomer: RefillOverrideByUserCustomer[];
}

