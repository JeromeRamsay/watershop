export interface PolicyDetails {
  description?: string;
  periodYears?: number;
  periodMonths?: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  stock: number;
  lastUpdated: string;
  status: "In Stock" | "Low Stock" | "Out Stock";
  unitType: string;
  purchasePrice: number;
  sellingPrice: number;
  refillPrice?: number;
  isRefillable?: boolean;
  supplier: string;
  description: string;
  warranty?: PolicyDetails;
  returnPolicy?: PolicyDetails;
  lowStockThreshold?: number;
  isTaxable?: boolean;
  rentalPrice?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryFilters {
  category: string;
  status: string;
}
