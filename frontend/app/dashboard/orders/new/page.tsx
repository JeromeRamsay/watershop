/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddProductModal } from "@/features/orders/components/add-product-modal";
import { PaymentMethodModal } from "@/features/orders/components/payment-method-modal";
import { Order, OrderItem, PaymentDetails } from "@/features/orders/types";
import { OrderReceiptPreviewDialog } from "@/features/orders/components/order-receipt-preview";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUpDown,
  Loader2,
  Minus,
  Calendar,
  Search,
  UserX,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useSettings } from "@/lib/queries";
import { Customer } from "@/features/customers/types";
import { InventoryItem } from "@/features/inventory/types";

interface RefillItem {
  id: string;
  productName: string;
  remainingRefill: number;
  price: number;
}

function AddNewOrderContent() {
  const router = useRouter();
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<
    (OrderItem & { productId?: string })[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [promotions, setPromotions] = useState<{ _id: string; name: string; description: string; inventoryItem: { _id: string } | null; discountType: "percent" | "fixed"; discountValue: number; startDate: string; endDate: string; minQuantity: number; maxQuantity: number | null; isActive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Available refill items loaded from selected customer's wallet
  const [refillItems, setRefillItems] = useState<RefillItem[]>([]);

  // Track redeemed quantities locally for the refill counter
  const [usedRefills, setUsedRefills] = useState<Record<string, number>>({});

  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const [formData, setFormData] = useState({
    customerId: "walk-in",
    paymentStatus: "Unpaid",
    deliveryType: initialType === "delivery" ? "Delivery" : "In-Store",
    deliveryAddress: "",
    scheduledDateTime: "",
    deliveryNotes: "",
    notes: "",
    discount: "",
    paymentMethod: "cash",
    paymentStatusSummary: "Paid",
    emailReceipt: false,
  });

  // Derived: true when no real customer is selected
  const isWalkIn = !formData.customerId || formData.customerId === "walk-in";

  const [paymentMethodData, setPaymentMethodData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [customersRes, inventoryRes, promotionsRes] = await Promise.all([
        api.get("/customers"),
        api.get("/inventory"),
        api.get("/promotions"),
      ]);

      const mappedCustomers: Customer[] = (customersRes.data || []).map(
        (c: any) => ({
          id: c._id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.email,
          phone: c.phone,
          address: "",
          orders: 0,
          creditsLeft: c.wallet?.storeCredit || 0,
          familyGroup: null,
          customerType: c.type === "business" ? "Business" : "Individual",
        }),
      );
      setCustomers(mappedCustomers);

      const items: InventoryItem[] = (inventoryRes.data || []).map(
        (i: any) => ({
          id: i._id,
          sku: i.sku,
          itemName: i.name,
          category: i.category,
          stock: i.stockQuantity,
          lastUpdated: new Date(i.updatedAt).toLocaleDateString(),
          status:
            i.stockQuantity > i.lowStockThreshold ? "In Stock" : "Low Stock",
          unitType: i.unitType,
          purchasePrice: i.purchasePrice,
          sellingPrice: i.sellingPrice,
          refillPrice: i.refillPrice,
          isRefillable: !!i.isRefillable,
          supplier: i.supplier,
          description: i.description,
          warranty: i.warranty,
          returnPolicy: i.returnPolicy,
        }),
      );
      setInventory(items);
      setPromotions(promotionsRes.data || []);

      // Initialize refill items from refillable inventory
      const refills: RefillItem[] = items
        .filter((i) => i.isRefillable)
        .map((i) => ({
          id: i.id,
          productName: i.itemName,
          remainingRefill: 0,
          price: i.refillPrice || i.sellingPrice,
        }));
      setRefillItems(refills);
    } catch (error) {
      console.error("Failed to load data for order creation", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCustomerChange = async (customerId: string) => {
    setFormData((prev) => ({ ...prev, customerId }));

    // RESET ALL REFILL STATE ON CUSTOMER CHANGE
    setUsedRefills({});
    setRefillItems((prev) =>
      prev.map((item) => ({ ...item, remainingRefill: 0 })),
    );
    // Remove all previous credit items from order
    setOrderItems((prev) => prev.filter((item) => !item.creditsUsed));

    // "walk-in" is the sentinel value — no customer to look up
    if (!customerId || customerId === "walk-in") return;

    try {
      const { data } = await api.get(`/customers/${customerId}`);
      if (data?.wallet?.prepaidItems) {
        setRefillItems((prev) =>
          prev.map((refill) => {
            const walletItem = data.wallet.prepaidItems.find(
              (p: any) => p.itemId?.toString() === refill.id.toString(),
            );
            return {
              ...refill,
              remainingRefill: walletItem ? walletItem.quantityRemaining : 0,
            };
          }),
        );
      }
    } catch (err) {
      console.error("Failed to load customer wallet", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  const handleAddProduct = (data: any) => {
    const selectedInventoryItem = inventory.find(
      (item) => item.id === (data.productId || data.itemId),
    );
    const newItem: OrderItem & { productId?: string } = {
      id: Date.now().toString(),
      ...data,
      sku: selectedInventoryItem?.sku || data.sku,
      warranty: selectedInventoryItem?.warranty,
      returnPolicy: selectedInventoryItem?.returnPolicy,
      creditsUsed: !!data.creditsUsed,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleRemoveProduct = (id: string) => {
    const itemToRemove = orderItems.find((oi) => oi.id === id);
    if (itemToRemove?.creditsUsed && itemToRemove.productId) {
      setUsedRefills((prev) => {
        const next = { ...prev };
        delete next[itemToRemove.productId!];
        return next;
      });
    }
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const syncOrderRefill = (
    productId: string,
    productName: string,
    newQty: number,
  ) => {
    setOrderItems((prev) => {
      const existing = prev.find(
        (oi) => oi.productId === productId && oi.creditsUsed,
      );
      if (existing) {
        if (newQty <= 0) {
          return prev.filter(
            (oi) => !(oi.productId === productId && oi.creditsUsed),
          );
        }
        return prev.map((oi) =>
          oi.productId === productId && oi.creditsUsed
            ? { ...oi, quantity: newQty, totalPrice: oi.unitPrice * newQty }
            : oi,
        );
      } else if (newQty > 0) {
        const refillInfo = refillItems.find((r) => r.id === productId);
        const inventoryItem = inventory.find((item) => item.id === productId);
        const price = refillInfo?.price || 0;
        return [
          ...prev,
          {
            id: `refill-${productId}-${Date.now()}`,
            productId,
            productName,
            sku: inventoryItem?.sku,
            quantity: newQty,
            unitPrice: price,
            totalPrice: price * newQty,
            creditsUsed: true,
            isRefill: true,
            warranty: inventoryItem?.warranty,
            returnPolicy: inventoryItem?.returnPolicy,
          },
        ];
      }
      return prev;
    });
  };

  const handleRefillIncrement = (id: string) => {
    const refillItem = refillItems.find((item) => item.id === id);
    if (!refillItem) return;

    const currentUsed = usedRefills[id] || 0;
    const nextQty = currentUsed + 1;
    setUsedRefills((prev) => ({ ...prev, [id]: nextQty }));
    syncOrderRefill(id, refillItem.productName, nextQty);
  };

  const handleRefillDecrement = (id: string) => {
    const currentUsed = usedRefills[id] || 0;
    if (currentUsed <= 0) return;

    const nextQty = currentUsed - 1;
    setUsedRefills((prev) => ({ ...prev, [id]: nextQty }));
    const refillItem = refillItems.find((item) => item.id === id);
    syncOrderRefill(id, refillItem?.productName || "Unknown", nextQty);
  };

  const handleRefillRemove = (id: string) => {
    setUsedRefills((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setOrderItems((prev) =>
      prev.filter((item) => !(item.productId === id && item.creditsUsed)),
    );
  };

  const { data: settings } = useSettings();
  const taxRate: number = (settings?.taxRate ?? 0);

  const calculateTotal = () => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + (Number(item.totalPrice) || 0),
      0,
    );
    const discount = Number(formData.discount) || 0;
    return Math.max(0, subtotal - discount);
  };

  const calculateTax = () => calculateTotal() * taxRate;
  const calculateGrandTotal = () => calculateTotal() + calculateTax();

  const draftOrder = useMemo<Order>(() => {
    const paymentDetails = paymentMethodData?.mode
      ? (paymentMethodData as PaymentDetails)
      : undefined;
    const amountPaid = paymentDetails?.mode === "single"
      ? Number(paymentDetails.amount || 0)
      : paymentDetails?.mode === "split"
        ? (paymentDetails.payments || []).reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0,
          )
        : 0;
    const normalizedDeliveryType =
      formData.deliveryType === "Delivery" ? "Delivery" : "Pickup";
    const itemSubtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    );
    const discount = Number(formData.discount || 0);
    const pretaxTotal = Math.max(0, itemSubtotal - discount);
    const totalWithTax = pretaxTotal + pretaxTotal * taxRate;

    return {
      id: "draft-order",
      orderId: "DRAFT",
      customer: isWalkIn
        ? "Walk-in Customer"
        : selectedCustomer?.name || "Customer",
      customerEmail: isWalkIn ? undefined : selectedCustomer?.email,
      customerPhone: isWalkIn ? undefined : selectedCustomer?.phone,
      customerId_raw: isWalkIn ? undefined : selectedCustomer?.id,
      items: orderItems.filter((item) => !item.isRefill),
      refills: orderItems.filter((item) => item.isRefill),
      notes: formData.notes.trim() || undefined,
      totalPrice: pretaxTotal,
      grandTotal: totalWithTax,
      amountPaid,
      deliveryType: normalizedDeliveryType,
      remainingCredits: 0,
      orderStatus: "Pending",
      paymentStatus: formData.paymentStatus as Order["paymentStatus"],
      deliveryAddress:
        normalizedDeliveryType === "Delivery"
          ? formData.deliveryAddress || undefined
          : undefined,
      deliveryNotes:
        normalizedDeliveryType === "Delivery"
          ? formData.deliveryNotes.trim() || undefined
          : undefined,
      scheduledDate:
        normalizedDeliveryType === "Delivery"
          ? formData.scheduledDateTime || undefined
          : undefined,
      discount,
      paymentMethod:
        (paymentDetails?.paymentMethod as Order["paymentMethod"]) ||
        (formData.paymentMethod as Order["paymentMethod"]),
      paymentDetails,
      emailReceipt: formData.emailReceipt,
      createdAt: new Date().toISOString(),
    };
  }, [
    formData.deliveryAddress,
    formData.deliveryNotes,
    formData.deliveryType,
    formData.discount,
    formData.emailReceipt,
    formData.notes,
    formData.paymentMethod,
    formData.paymentStatus,
    formData.scheduledDateTime,
    isWalkIn,
    orderItems,
    paymentMethodData,
    selectedCustomer,
    taxRate,
  ]);

  const handlePaymentSave = (paymentData: any) => {
    console.log("Payment data:", paymentData);
    setPaymentMethodData(paymentData);

    // If the payment modal determined payment status based on balance, update it
    if (paymentData.paymentStatus) {
      setFormData(prev => ({
        ...prev,
        paymentStatus: paymentData.paymentStatus === "paid" ? "Paid" : "Unpaid"
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    setSubmitting(true);
    try {
      const parseDateTime = (dtStr: string) => {
        if (!dtStr) return null;

        // Match formats like "12/04/2024 - 14:30" or "12/04/2024 14:30" or "2024-12-04 14:30"
        // Try standard Date parsing first
        const standardDate = new Date(dtStr);
        if (!isNaN(standardDate.getTime())) return standardDate;

        // Custom parser for "DD/MM/YYYY - HH:mm"
        const parts = dtStr.split(/[\/\-\s:]+/).map(Number);
        if (parts.length >= 5) {
          const [day, month, year, hours, minutes] = parts;
          const fullYear = year < 100 ? 2000 + year : year;
          const date = new Date(fullYear, month - 1, day, hours, minutes);
          if (!isNaN(date.getTime())) return date;
        }

        // Try YYYY-MM-DD HH:mm
        const isoParts = dtStr.split(/[\-\s:]+/).map(Number);
        if (isoParts.length >= 5) {
          const [year, month, day, hours, minutes] = isoParts;
          const date = new Date(year, month - 1, day, hours, minutes);
          if (!isNaN(date.getTime())) return date;
        }

        return null;
      };

      const deliveryDate = parseDateTime(formData.scheduledDateTime);
      console.log("Original Date String:", formData.scheduledDateTime);
      console.log("Parsed Delivery Date:", deliveryDate);

      const payload = {
        ...(isWalkIn ? {} : { customerId: formData.customerId }),
        items: orderItems.map((item) => ({
          itemId: item.productId || item.id,
          quantity: item.quantity,
          isPrepaidRedemption: !!item.creditsUsed && !item.isRefill,
          isRefill: !!item.isRefill,
        })),
        paymentMethod: formData.paymentMethod,
        discount: Number(formData.discount) || 0,
        isDelivery: formData.deliveryType === "Delivery",
        notes: formData.notes.trim() || undefined,
        paymentStatus: formData.paymentStatus.toLowerCase(),
        emailReceipt: formData.emailReceipt,
        deliveryAddress: formData.deliveryAddress || undefined,
        deliveryNotes:
          formData.deliveryType === "Delivery"
            ? formData.deliveryNotes.trim() || undefined
            : undefined,
        deliveryDate:
          deliveryDate && !isNaN(deliveryDate.getTime())
            ? deliveryDate.toISOString()
            : undefined,
        paymentDetails: paymentMethodData || undefined,
      };

      console.log("Submitting Payload:", JSON.stringify(payload, null, 2));

      await api.post("/orders", payload);
      router.push("/dashboard/orders");
    } catch (error: any) {
      console.error("Failed to create order", error);
      const serverMsg = error.response?.data?.message;
      const errorMsg = Array.isArray(serverMsg)
        ? serverMsg.join(", ")
        : serverMsg;
      alert(`Failed to create order: ${errorMsg || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold text-dark-900 dark:text-white">
          Add New Order
        </h1>
        <Link href="/dashboard/orders">
          <Button
            variant="outline"
            className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-6 space-y-6">
          {/* 1. Customer Information */}
          <div>
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">

                <div className="space-y-2 md:col-span-2">
                  <Label
                    htmlFor="orderNotes"
                    className="text-sm text-dark-600 dark:text-dark-300"
                  >
                    Order Notes
                  </Label>
                  <Textarea
                    id="orderNotes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Add any order-specific notes for staff or the customer"
                    className="min-h-28"
                  />
                </div>
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="customer"
                  className="text-sm text-dark-600 dark:text-dark-300"
                >
                  Search Customer
                </Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => handleCustomerChange(value)}
                >
                  <SelectTrigger className="h-11" id="customer">
                    <SelectValue placeholder="Walk-in Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="flex items-center px-3 sticky top-0 bg-white dark:bg-dark-950 z-10 border-b border-dark-200 dark:border-dark-800 mb-1">
                      <Search className="h-4 w-4 mr-2 text-dark-400 opacity-50" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-dark-400 disabled:cursor-not-allowed disabled:opacity-50 text-dark-900 dark:text-dark-100"
                        placeholder="Search customers..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    {/* Walk-in option always visible at top */}
                    <SelectItem value="walk-in">
                      <span className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-dark-400" />
                        Walk-in Customer
                      </span>
                    </SelectItem>
                    {customers
                      .filter((c) =>
                        customerSearchTerm
                          ? c.name
                              .toLowerCase()
                              .includes(customerSearchTerm.toLowerCase()) ||
                            c.email
                              ?.toLowerCase()
                              .includes(customerSearchTerm.toLowerCase()) ||
                            c.phone
                              ?.toLowerCase()
                              .includes(customerSearchTerm.toLowerCase())
                          : true,
                      )
                      .map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    {customers.filter((c) =>
                      customerSearchTerm
                        ? c.name
                            .toLowerCase()
                            .includes(customerSearchTerm.toLowerCase()) ||
                          c.email
                            ?.toLowerCase()
                            .includes(customerSearchTerm.toLowerCase()) ||
                          c.phone
                            ?.toLowerCase()
                            .includes(customerSearchTerm.toLowerCase())
                        : true,
                    ).length === 0 && (
                      <div className="py-6 text-center text-sm text-dark-500">
                        No customers found.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {isWalkIn ? (
                /* Walk-in info banner */
                <div className="md:col-span-3 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Walk-in Customer
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No customer account linked. Credits and email receipt are
                      not available for this order.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm text-dark-600 dark:text-dark-300"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={selectedCustomer?.email || ""}
                      readOnly
                      className="h-11 bg-dark-50 dark:bg-dark-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-sm text-dark-600 dark:text-dark-300"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={selectedCustomer?.phone || ""}
                      readOnly
                      className="h-11 bg-dark-50 dark:bg-dark-600"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dark-200 dark:border-dark-600"></div>

          {/* 2. Add Products */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                Add Products
              </h2>
              <Button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {orderItems.filter((item) => !item.creditsUsed).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] md:min-w-0">
                  <thead>
                    <tr className="border-b border-dark-200 dark:border-dark-600">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                        <div className="flex items-center gap-2">
                          Product Name
                          <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                        <div className="flex items-center justify-center gap-2">
                          Quantity
                          <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                        <div className="flex items-center justify-center gap-2">
                          Unit Price
                          <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                        <div className="flex items-center justify-center gap-2">
                          Total Price
                          <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                        <div className="flex items-center justify-center gap-2">
                          Credits Used
                          <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems
                      .filter((item) => !item.creditsUsed)
                      .map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">
                            {item.productName}
                          </td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white text-center">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white text-center">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white font-medium text-center">
                            ${item.totalPrice?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white text-center">
                            {item.creditsUsed ? "Yes" : "No"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveProduct(item.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">
                No products added yet. Click &quot;Add&quot; to add products.
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-dark-200 dark:border-dark-600"></div>

          {/* 3. Available Refill — only shown for registered customers */}
          {!isWalkIn && (
          <div>
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Available Refill
            </h2>
            {(() => {
              const itemsToShow = refillItems.filter((item) => {
                // Show if product is refillable and in the order
                const isInOrder = orderItems.some(
                  (oi) => oi.productId === item.id && !oi.creditsUsed,
                );
                return isInOrder;
              });

              if (itemsToShow.length === 0) {
                return (
                  <div className="text-center py-8 text-dark-400">
                    No refill items available.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-200 dark:border-dark-600">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          <div className="flex items-center gap-2">
                            Product Name
                            <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          <div className="flex items-center justify-center gap-2">
                            Refill
                            <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsToShow.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-dark-200 dark:border-dark-600 last:border-0"
                        >
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">
                            {item.productName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRefillDecrement(item.id)}
                                className="h-6 w-6 rounded border border-dark-300 dark:border-dark-500 hover:bg-dark-100 dark:hover:bg-dark-600"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium text-dark-900 dark:text-white min-w-[30px] text-center">
                                {(() => {
                                  const used = usedRefills[item.id] || 0;
                                  return used.toString().padStart(2, "0");
                                })()}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRefillIncrement(item.id)}
                                className="h-6 w-6 rounded border border-dark-300 dark:border-dark-500 hover:bg-dark-100 dark:hover:bg-dark-600"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRefillRemove(item.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              );
            })()}
          </div>
          )} {/* end !isWalkIn refill section */}

          {/* Divider */}
          <div className="border-t border-dark-200 dark:border-dark-600"></div>

          {/* 4. Order Details */}
          <div>
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Order Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="paymentStatus"
                  className="text-sm text-dark-600 dark:text-dark-300"
                >
                  Payment Status
                </Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentStatus: value })
                  }
                >
                  <SelectTrigger className="h-11" id="paymentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Out Stock">Out Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-dark-600 dark:text-dark-300">
                  Delivery Type
                </Label>
                <RadioGroup
                  value={formData.deliveryType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, deliveryType: value })
                  }
                  className="flex items-center gap-6 h-11"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="In-Store" id="in-store" />
                    <Label
                      htmlFor="in-store"
                      className="text-sm font-normal cursor-pointer"
                    >
                      In-Store
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Delivery" id="delivery" />
                    <Label
                      htmlFor="delivery"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Delivery
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          {formData.deliveryType === "Delivery" && (
            <>
              {/* Divider */}
              <div className="border-t border-dark-200 dark:border-dark-600"></div>
              <div>
                <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
                  Delivery Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="deliveryAddress"
                      className="text-sm text-dark-600 dark:text-dark-300"
                    >
                      Delivery Address
                    </Label>
                    <Input
                      id="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryAddress: e.target.value,
                        })
                      }
                      placeholder="8502 Preston Rd. Inglewood, Maine 98380"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="scheduledDateTime"
                      className="text-sm text-dark-600 dark:text-dark-300"
                    >
                      Schedule Delivery Date & Time
                    </Label>
                    <div className="relative">
                      <Input
                        id="scheduledDateTime"
                        type="datetime-local"
                        value={formData.scheduledDateTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            scheduledDateTime: e.target.value,
                          })
                        }
                        className="h-11 pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="deliveryNotes"
                      className="text-sm text-dark-600 dark:text-dark-300"
                    >
                      Delivery Notes
                    </Label>
                    <Textarea
                      id="deliveryNotes"
                      value={formData.deliveryNotes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryNotes: e.target.value,
                        })
                      }
                      placeholder="Add delivery-specific notes, access instructions, or timing details"
                      className="min-h-28"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="border-t border-dark-200 dark:border-dark-600"></div>

          {/* 5. Payment & Order Summary */}
          <div>
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Payment & Order Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label
                  htmlFor="discount"
                  className="text-sm text-dark-600 dark:text-dark-300"
                >
                  Apply Discount ($)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount: e.target.value })
                  }
                  placeholder="20"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="totalAmount"
                  className="text-sm text-dark-600 dark:text-dark-300"
                >
                  Total Amount
                </Label>
                <Input
                  id="totalAmount"
                  type="text"
                  value={`$${calculateTotal().toFixed(2)}`}
                  readOnly
                  className="h-11 bg-dark-50 dark:bg-dark-600"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="taxAmount"
                  className="text-sm text-dark-600 dark:text-dark-300"
                >
                  Tax Amount ({(taxRate * 100).toFixed(0)}%)
                </Label>
                <Input
                  id="taxAmount"
                  type="text"
                  value={`$${calculateTax().toFixed(2)}`}
                  readOnly
                  className="h-11 bg-dark-50 dark:bg-dark-600"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="grandTotal"
                  className="text-sm text-dark-600 dark:text-dark-300 font-semibold"
                >
                  Grand Total
                </Label>
                <Input
                  id="grandTotal"
                  type="text"
                  value={`$${calculateGrandTotal().toFixed(2)}`}
                  readOnly
                  className="h-11 bg-dark-50 dark:bg-dark-600 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dark-200 dark:border-dark-600"></div>

          {/* Email Receipt */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="emailReceipt"
              checked={formData.emailReceipt}
              onChange={(e) =>
                setFormData({ ...formData, emailReceipt: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <Label
              htmlFor="emailReceipt"
              className="text-sm font-normal cursor-pointer"
            >
              Email receipt to customer
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/orders">
              <Button
                type="button"
                variant="outline"
                className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 px-8"
              >
                Cancel
              </Button>
            </Link>
            <OrderReceiptPreviewDialog
              order={draftOrder}
              settings={settings}
              draft
              disabled={orderItems.length === 0}
              triggerClassName="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 px-8"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentModalOpen(true)}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 px-8"
            >
              Payment
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary-500 hover:bg-primary-600 text-white px-8"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Order
            </Button>
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="text-end text-sm text-[#545454] dark:text-dark-500 py-4">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>

      {/* Modals */}
      <AddProductModal
        open={isAddProductModalOpen}
        onOpenChange={setIsAddProductModalOpen}
        onSave={handleAddProduct}
        products={inventory}
        promotions={promotions}
      />
      <PaymentMethodModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        totalAmount={calculateGrandTotal()}
        onSave={handlePaymentSave}
      />
    </div>
  );
}

export default function AddNewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <AddNewOrderContent />
    </Suspense>
  );
}
