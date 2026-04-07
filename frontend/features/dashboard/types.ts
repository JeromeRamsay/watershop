export interface MetricCard {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

export interface InventoryItem {
  id: string;
  product: string;
  stockLeft: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Transaction {
  id: string;
  customer: string;
  itemsPurchased: string;
  total: number;
  status: "Paid" | "Pending";
}

export interface Delivery {
  id: string;
  customer: string;
  address: string;
  dateTime: string;
  status: "Confirmed" | "Pending" | "Scheduled";
}
