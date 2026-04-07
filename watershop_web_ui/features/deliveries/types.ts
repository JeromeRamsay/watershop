export interface Delivery {
  id: string;
  customer: string;
  address: string;
  dateTime: string;
  status:
    | "Scheduled"
    | "Out for delivery"
    | "Delivered"
    | "Failed"
    | "Cancelled"
    | "Pending"
    | "Confirmed";
  orderId?: string;
  orderNumber?: string;
  customerEmail?: string;
  customerPhone?: string;
  scheduledDate?: string;
  timeSlot?: string;
  deliveryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  paymentStatus?: string;
  grandTotal?: number;
}

export interface DeliveryFilters {
  orderStatus: string;
  deliveryType: string;
  dateRange?: {
    from: string;
    to: string;
  };
}
