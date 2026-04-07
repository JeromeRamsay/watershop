export interface OrderItem {
  id: string;
  itemId?: string;
  sku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  creditsUsed: boolean;
  isRefill?: boolean;
}

export interface PaymentDetails {
  mode: "single" | "split";
  amount?: number;
  paymentMethod?: string;
  payments?: Array<{
    type: string;
    amount: number;
  }>;
}

export interface Order {
  id: string;
  orderId: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  refills?: OrderItem[];
  totalPrice: number;
  grandTotal?: number;
  amountPaid?: number;
  deliveryType: "Delivery" | "Pickup";
  remainingCredits: number;
  orderStatus: "Completed" | "Pending" | "Scheduled" | "Cancelled";
  paymentStatus: "Paid" | "Unpaid" | "Partial" | "Pending" | "Out Stock";
  deliveryAddress?: string;
  customerId_raw?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  discount?: number;
  paymentMethod?: "cash" | "card" | "credit_redemption" | "store_credit";
  paymentDetails?: PaymentDetails;
  emailReceipt?: boolean;
  createdAt: string;
}

export interface OrderFilters {
  orderStatus: string;
  paymentStatus: string;
  deliveryType: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  remainingCredits: number;
}
