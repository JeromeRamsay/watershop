import { Order, OrderItem } from "@/features/orders/types";

export interface OrderApiCustomer {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface OrderApiItem {
  item?:
    | {
        _id?: string;
        id?: string;
        toString?: () => string;
      }
    | string;
  name?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  isPrepaidRedemption?: boolean;
  isRefill?: boolean;
  warranty?: OrderItem["warranty"];
  returnPolicy?: OrderItem["returnPolicy"];
}

export interface OrderApiResponse {
  _id: string;
  orderNumber?: string;
  customer?: OrderApiCustomer;
  isWalkIn?: boolean;
  items?: OrderApiItem[];
  refills?: OrderApiItem[];
  subTotal?: number;
  taxRate?: number;
  grandTotal?: number;
  amountPaid?: number;
  isDelivery?: boolean;
  refillCount?: number;
  status?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  notes?: string;
  deliveryNotes?: string;
  discount?: number;
  paymentMethod?: "cash" | "card" | "credit_redemption" | "store_credit";
  paymentDetails?: Order["paymentDetails"];
  emailReceipt?: boolean;
  createdAt?: string;
}

const capitalize = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const getOrderItemId = (itemRef?: OrderApiItem["item"]) => {
  if (!itemRef) {
    return undefined;
  }

  if (typeof itemRef === "string") {
    return itemRef;
  }

  if (itemRef._id) {
    return itemRef._id;
  }

  if (itemRef.id) {
    return itemRef.id;
  }

  const stringified = itemRef.toString?.();
  return stringified && stringified !== "[object Object]"
    ? stringified
    : undefined;
};

export const mapApiOrderToOrder = (order: OrderApiResponse): Order => {
  const orderItems = (order.items || []).filter((item) => !item.isRefill);
  const orderRefills = (order.refills || []).length
    ? (order.refills || [])
    : (order.items || []).filter((item) => !!item.isRefill);

  const mappedItems = orderItems.map((item, index) => ({
    id: getOrderItemId(item.item) || `${order._id}-item-${index}`,
    itemId: getOrderItemId(item.item),
    sku: item.sku,
    productName: item.name || "Unknown Product",
    quantity: item.quantity || 0,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
    creditsUsed: !!item.isPrepaidRedemption,
    isRefill: !!item.isRefill,
    warranty: item.warranty,
    returnPolicy: item.returnPolicy,
  }));

  const mappedRefills = orderRefills.map((item, index) => ({
    id: getOrderItemId(item.item) || `${order._id}-refill-${index}`,
    itemId: getOrderItemId(item.item),
    sku: item.sku,
    productName: item.name || "Unknown Refill",
    quantity: item.quantity || 0,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
    creditsUsed: !!item.isPrepaidRedemption,
    isRefill: true,
    warranty: item.warranty,
    returnPolicy: item.returnPolicy,
  }));

  const subTotal =
    order.subTotal ??
    [...mappedItems, ...mappedRefills].reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    );
  const discount = Number(order.discount || 0);
  const pretaxTotal = Math.max(0, subTotal - discount);
  const taxRate = Number(order.taxRate || 0);
  const grandTotal =
    order.grandTotal ?? pretaxTotal + pretaxTotal * taxRate;

  return {
    id: order._id,
    orderId: order.orderNumber || `ORD-${order._id.slice(-6).toUpperCase()}`,
    customer: order.customer
      ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() ||
        "Walk-in Customer"
      : "Walk-in Customer",
    customerEmail: order.customer?.email,
    customerPhone: order.customer?.phone,
    customerId_raw: order.customer?._id || order.customer?.id,
    items: mappedItems,
    refills: mappedRefills,
    notes: order.notes,
    subTotal,
    totalPrice: pretaxTotal,
    taxRate,
    grandTotal,
    amountPaid: order.amountPaid || 0,
    deliveryType: order.isDelivery ? "Delivery" : "Pickup",
    remainingCredits:
      order.refillCount ||
      mappedRefills.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
    orderStatus: (capitalize(order.status) || "Pending") as Order["orderStatus"],
    paymentStatus: (capitalize(order.paymentStatus) ||
      "Unpaid") as Order["paymentStatus"],
    deliveryAddress: order.deliveryAddress,
    deliveryNotes: order.deliveryNotes,
    scheduledDate: order.deliveryDate,
    createdAt: order.createdAt || "",
    discount: order.discount,
    paymentMethod: order.paymentMethod,
    paymentDetails: order.paymentDetails,
    emailReceipt: order.emailReceipt,
  };
};