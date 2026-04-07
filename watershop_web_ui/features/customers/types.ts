export interface PrepaidItem {
  itemId: string;
  itemName: string;
  quantityRemaining: number;
  expiryDate?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  billingAddress?: string;
  deliveryAddress?: string;
}

export interface CustomerOrderSummary {
  id: string;
  orderId: string;
  createdAt: string;
  totalPrice: number;
  orderStatus: string;
  paymentStatus: string;
  itemsCount: number;
  refillCount: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: number;
  creditsLeft: number;
  familyGroup: string | null;
  customerType: "Individual" | "Business";
  status: "Active" | "Inactive";
  billingAddress?: string;
  deliveryAddress?: string;
  country?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  familyMembers?: FamilyMember[];
  totalRefills?: number;
  orderHistory?: CustomerOrderSummary[];
  prepaidItems?: PrepaidItem[];
}

export interface CustomerFilters {
  customerType: string;
  status: string;
}
