export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierFilters {
  search: string;
}
