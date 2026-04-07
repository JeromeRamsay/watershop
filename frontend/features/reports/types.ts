export interface SalesData {
  month: string;
  sales: number;
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

