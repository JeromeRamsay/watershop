"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  Receipt,
  Truck,
  X,
} from "lucide-react";
import { Order, PaymentDetails } from "../types";
import api from "@/lib/api";
import { useInventory, useSettings } from "@/lib/queries";

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onUpdate: (data: Order) => void;
}

interface SplitPayment {
  type: string;
  amount: string;
}

interface EditableItem {
  itemId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isRefill: boolean;
}

interface MappedInventoryItem {
  id: string;
  itemName: string;
  sku: string;
  sellingPrice: number;
  refillPrice: number;
  isRefillable: boolean;
  isActive: boolean;
}

const toDisplayDateTime = (rawDate?: string) => {
  if (!rawDate) return "";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
};

const fmt = (v: number) => `$${v.toFixed(2)}`;

const PAYMENT_TYPES = [
  { value: "interac", label: "Interac" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "e_transfer", label: "E-Transfer" },
  { value: "financeit_etransfer", label: "Financeit E-Transfer" },
];

export function EditOrderModal({
  open,
  onOpenChange,
  order,
  onUpdate,
}: EditOrderModalProps) {
  const [saving, setSaving] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { type: "cash", amount: "" },
  ]);
  const [singlePaymentType, setSinglePaymentType] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);
  const [newItemId, setNewItemId] = useState("");
  const [newItemIsRefill, setNewItemIsRefill] = useState(false);
  const paymentInteracted = useRef(false);

  const [formData, setFormData] = useState({
    customerId: "",
    orderStatus: "Pending",
    paymentStatus: "Unpaid",
    deliveryType: "Pickup",
    deliveryAddress: "",
    deliveryDateTime: "",
    discount: "0",
    emailReceipt: false,
  });

  const { data: settings } = useSettings();
  const { data: inventoryRaw } = useInventory();
  const inventory = useMemo<MappedInventoryItem[]>(
    () =>
      ((inventoryRaw as any[] | undefined) ?? []).map((item: any) => ({
        id: item._id || item.id,
        itemName: item.name || item.itemName || "",
        sku: item.sku || "",
        sellingPrice: item.sellingPrice ?? 0,
        refillPrice: item.refillPrice ?? 0,
        isRefillable: !!item.isRefillable,
        isActive: item.isActive !== false,
      })),
    [inventoryRaw],
  );

  const taxRate: number = settings?.taxRate ?? 0;

  useEffect(() => {
    if (!order) return;

    setFormData({
      customerId: order.customerId_raw || "",
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress || "",
      deliveryDateTime: toDisplayDateTime(order.scheduledDate),
      discount: String(order.discount || 0),
      emailReceipt: !!order.emailReceipt,
    });

    const items: EditableItem[] = [
      ...(order.items || []).map((item) => ({
        itemId: item.itemId || "",
        productName: item.productName,
        sku: item.sku || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        isRefill: false,
      })),
      ...(order.refills || []).map((item) => ({
        itemId: item.itemId || "",
        productName: item.productName,
        sku: item.sku || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        isRefill: true,
      })),
    ];
    setEditedItems(items);
    setNewItemId("");
    setNewItemIsRefill(false);

    const details = order.paymentDetails;
    if (details?.mode === "split") {
      setPaymentMode("split");
      setSplitPayments(
        (details.payments || []).map((p) => ({
          type: p.type,
          amount: String(p.amount || 0),
        })),
      );
      setAmountPaid("");
    } else {
      setPaymentMode("single");
      setSinglePaymentType(
        details?.paymentMethod || order.paymentMethod || "cash",
      );
      setAmountPaid(String(details?.amount ?? order.amountPaid ?? 0));
      setSplitPayments([{ type: "cash", amount: "" }]);
    }
    paymentInteracted.current = false;
  }, [order]);

  // Derived financials
  const itemsSubTotal = editedItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const backendSubTotal = order?.totalPrice ?? 0;
  const subTotal = editedItems.length > 0 ? itemsSubTotal : backendSubTotal;
  const discountAmt = Number(formData.discount || 0);
  const pretaxTotal = Math.max(0, subTotal - discountAmt);
  const taxAmount = pretaxTotal * taxRate;
  const grandTotal = pretaxTotal + taxAmount;
  const totalPaid =
    paymentMode === "single"
      ? Number(amountPaid || 0)
      : splitPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balance = grandTotal - totalPaid;

  useEffect(() => {
    if (!paymentInteracted.current) return;
    if (totalPaid === 0)
      setFormData((p) => ({ ...p, paymentStatus: "Unpaid" }));
    else if (balance <= 0)
      setFormData((p) => ({ ...p, paymentStatus: "Paid" }));
    else setFormData((p) => ({ ...p, paymentStatus: "Partial" }));
  }, [totalPaid, balance]);

  // Items handlers
  const handleQtyChange = (index: number, qty: number) => {
    setEditedItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: Math.max(1, qty),
              totalPrice: item.unitPrice * Math.max(1, qty),
            }
          : item,
      ),
    );
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!newItemId) return;
    const inv = inventory.find((i) => i.id === newItemId);
    if (!inv) return;
    const unitPrice = newItemIsRefill
      ? inv.refillPrice || inv.sellingPrice
      : inv.sellingPrice;
    const existingIndex = editedItems.findIndex(
      (i) => i.itemId === newItemId && i.isRefill === newItemIsRefill,
    );
    if (existingIndex >= 0) {
      handleQtyChange(existingIndex, editedItems[existingIndex].quantity + 1);
    } else {
      setEditedItems((prev) => [
        ...prev,
        {
          itemId: newItemId,
          productName: inv.itemName,
          sku: inv.sku,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
          isRefill: newItemIsRefill,
        },
      ]);
    }
    setNewItemId("");
    setNewItemIsRefill(false);
  };

  // Split payment handlers
  const handleAddSplitPayment = () =>
    setSplitPayments((prev) => [...prev, { type: "cash", amount: "" }]);
  const handleRemoveSplitPayment = (index: number) =>
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
  const handleSplitChange = (
    index: number,
    field: "type" | "amount",
    value: string,
  ) => {
    if (field === "amount") paymentInteracted.current = true;
    setSplitPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order) return;
    try {
      setSaving(true);
      const paymentDetails: PaymentDetails =
        paymentMode === "single"
          ? {
              mode: "single",
              paymentMethod: singlePaymentType,
              amount: Number(amountPaid || 0),
            }
          : {
              mode: "split",
              payments: splitPayments.map((p) => ({
                type: p.type,
                amount: Number(p.amount || 0),
              })),
            };

      const itemsPayload = editedItems
        .filter((i) => i.itemId)
        .map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          isRefill: i.isRefill,
        }));

      const payload: Record<string, unknown> = {
        customerId: formData.customerId || undefined,
        discount: Number(formData.discount || 0),
        paymentStatus: formData.paymentStatus.toLowerCase(),
        isDelivery: formData.deliveryType === "Delivery",
        deliveryAddress:
          formData.deliveryType === "Delivery"
            ? formData.deliveryAddress || undefined
            : undefined,
        deliveryDate:
          formData.deliveryType === "Delivery" && formData.deliveryDateTime
            ? new Date(formData.deliveryDateTime).toISOString()
            : undefined,
        emailReceipt: formData.emailReceipt,
        paymentDetails,
        status: formData.orderStatus.toLowerCase(),
        amountPaid: totalPaid,
      };

      if (itemsPayload.length > 0) {
        payload.items = itemsPayload;
      }

      await api.patch(`/orders/${order.id}`, payload);

      onUpdate({
        ...order,
        customerId_raw: formData.customerId || order.customerId_raw,
        orderStatus: formData.orderStatus as Order["orderStatus"],
        paymentStatus: formData.paymentStatus as Order["paymentStatus"],
        deliveryType: formData.deliveryType as Order["deliveryType"],
        deliveryAddress: formData.deliveryAddress || undefined,
        scheduledDate:
          formData.deliveryType === "Delivery" && formData.deliveryDateTime
            ? new Date(formData.deliveryDateTime).toISOString()
            : undefined,
        discount: Number(formData.discount || 0),
        amountPaid: totalPaid,
        paymentDetails,
        emailReceipt: formData.emailReceipt,
        items: editedItems
          .filter((i) => !i.isRefill)
          .map((i) => ({
            id: i.itemId,
            itemId: i.itemId,
            productName: i.productName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            creditsUsed: false,
            isRefill: false,
          })),
        refills: editedItems
          .filter((i) => i.isRefill)
          .map((i) => ({
            id: i.itemId,
            itemId: i.itemId,
            productName: i.productName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            creditsUsed: false,
            isRefill: true,
          })),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update order", error);
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  const selectedInv = inventory.find((i) => i.id === newItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col overflow-hidden p-0"
        style={{ maxWidth: "min(96vw, 88rem)", maxHeight: "90vh" }}
      >
        {/* Fixed header */}
        <DialogHeader className="flex-none border-b border-dark-100 px-6 py-4 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-none">
                Edit Order
              </DialogTitle>
              <DialogDescription className="mt-0.5 font-mono text-xs text-dark-400">
                {order.orderId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-dark-50 p-5 dark:bg-dark-900">
          <form id="edit-order-form" onSubmit={handleSubmit} className="space-y-4">

            {/* ── Order Items + Order Details side-by-side ────────── */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_2fr]">
            {/* ── Order Items ─────────────────────────────────────────── */}
            <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-dark-400" />
                <span className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                  Order Items
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-dark-100 dark:border-dark-700">
                <table className="w-full text-sm">
                  <thead className="bg-dark-50 dark:bg-dark-900/50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-dark-500">
                        Item
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-dark-500">
                        SKU
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-dark-500">
                        Qty
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-dark-500">
                        Unit Price
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-dark-500">
                        Total
                      </th>
                      <th className="w-8 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100 dark:divide-dark-700">
                    {editedItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-sm text-dark-400"
                        >
                          No items in this order
                        </td>
                      </tr>
                    ) : (
                      editedItems.map((item, i) => (
                        <tr key={i} className="bg-white dark:bg-dark-800">
                          <td className="px-3 py-2.5">
                            <span className="font-medium text-dark-800 dark:text-dark-100">
                              {item.productName}
                            </span>
                            {item.isRefill && (
                              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Refill
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-dark-400">
                            {item.sku || "-"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQtyChange(i, item.quantity - 1)
                                }
                                disabled={item.quantity <= 1}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-dark-200 bg-white text-dark-600 hover:bg-dark-50 disabled:opacity-40 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQtyChange(
                                    i,
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                className="w-12 rounded-md border border-dark-200 bg-white px-1 py-0.5 text-center text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleQtyChange(i, item.quantity + 1)
                                }
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-dark-200 bg-white text-dark-600 hover:bg-dark-50 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-dark-500">
                            {fmt(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-dark-800 dark:text-dark-100">
                            {fmt(item.totalPrice)}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(i)}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-dark-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add item row */}
              <div className="mt-3 flex items-center gap-2">
                <Select value={newItemId} onValueChange={setNewItemId}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Add item from inventory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory
                      .filter((i) => i.isActive)
                      .map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.itemName} ({inv.sku}) {fmt(inv.sellingPrice)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedInv?.isRefillable && (
                  <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-dark-500">
                    <Checkbox
                      checked={newItemIsRefill}
                      onCheckedChange={(v) => setNewItemIsRefill(Boolean(v))}
                    />
                    Refill
                  </label>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!newItemId}
                  className="h-9 shrink-0"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
            {/* ── Order Details ──────────────────────────────────────── */}
            <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-dark-400" />
                <span className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                  Order Details
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-dark-500">
                    Customer
                  </Label>
                  <Input
                    value={order.customer || "Walk-in Customer"}
                    readOnly
                    className="h-11 cursor-default select-none bg-dark-50 text-dark-500 dark:bg-dark-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-dark-500">
                    Order Status
                  </Label>
                  <Select
                    value={formData.orderStatus}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, orderStatus: v }))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-dark-500">
                    Delivery Type
                  </Label>
                  <Select
                    value={formData.deliveryType}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, deliveryType: v }))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pickup">Pickup</SelectItem>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-dark-500">
                    Discount ($)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, discount: e.target.value }))
                    }
                    className="h-11"
                  />
                </div>

                {formData.deliveryType === "Delivery" && (
                  <>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-medium text-dark-500">
                        Delivery Address
                      </Label>
                      <Input
                        value={formData.deliveryAddress}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            deliveryAddress: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-dark-500">
                        Delivery Date / Time
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.deliveryDateTime}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            deliveryDateTime: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-dark-500">
                    Email Receipt
                  </Label>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-dark-200 px-3 dark:border-dark-600">
                    <Checkbox
                      id="edit-emailReceipt"
                      checked={formData.emailReceipt}
                      onCheckedChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          emailReceipt: Boolean(v),
                        }))
                      }
                    />
                    <Label
                      htmlFor="edit-emailReceipt"
                      className="cursor-pointer text-sm font-normal"
                    >
                      Send receipt by email
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            </div>{/* end Items+Details grid */}

            {/* ── Payment + Summary side-by-side ─────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-dark-400" />
                <span className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                  Payment
                </span>
              </div>

              <div className="space-y-4">
                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2">
                  {(["single", "split"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-colors ${
                        paymentMode === mode
                          ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                          : "border-dark-200 text-dark-500 hover:border-dark-300 dark:border-dark-600 dark:text-dark-400"
                      }`}
                    >
                      {mode === "single" ? "Single Payment" : "Split Payment"}
                    </button>
                  ))}
                </div>

                {/* Single payment */}
                {paymentMode === "single" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-dark-500">
                      Payment Type
                    </Label>
                    <Select
                      value={singlePaymentType}
                      onValueChange={setSinglePaymentType}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((pt) => (
                          <SelectItem key={pt.value} value={pt.value}>
                            {pt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  /* Split payment */
                  <div className="space-y-2">
                    {splitPayments.map((payment, index) => (
                      <div key={index} className="flex gap-2">
                        <Select
                          value={payment.type}
                          onValueChange={(v) =>
                            handleSplitChange(index, "type", v)
                          }
                        >
                          <SelectTrigger className="h-11 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TYPES.map((pt) => (
                              <SelectItem key={pt.value} value={pt.value}>
                                {pt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount"
                          className="h-11 w-32"
                          value={payment.amount}
                          onChange={(e) =>
                            handleSplitChange(index, "amount", e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-11 shrink-0 p-0"
                          onClick={() => handleRemoveSplitPayment(index)}
                          disabled={splitPayments.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSplitPayment}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Payment Line
                    </Button>
                  </div>
                )}

                {/* Payment status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-dark-500">
                    Payment Status
                  </Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, paymentStatus: v }))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Summary ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
              <div className="mb-4 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-dark-400" />
                <span className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                  Summary
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Subtotal</span>
                  <span className="text-dark-700 dark:text-dark-200">
                    {fmt(subTotal)}
                  </span>
                </div>

                {discountAmt > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">Discount</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{fmt(discountAmt)}
                    </span>
                  </div>
                )}

                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">
                      Tax ({(taxRate * 100).toFixed(0)}%)
                    </span>
                    <span className="text-dark-700 dark:text-dark-200">
                      {fmt(taxAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-dark-200 pt-2.5 dark:border-dark-600">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    Grand Total
                  </span>
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    {fmt(grandTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-500">Amount Paid</span>
                  {paymentMode === "single" ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => {
                        paymentInteracted.current = true;
                        setAmountPaid(e.target.value);
                      }}
                      className="h-8 w-28 text-right"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                      {fmt(totalPaid)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between border-t border-dark-200 pt-2.5 dark:border-dark-600">
                  <span className="text-sm font-semibold text-dark-600 dark:text-dark-300">
                    {balance > 0
                      ? "Balance Due"
                      : balance < 0
                        ? "Overpaid"
                        : "Balance"}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      balance > 0
                        ? "text-red-600 dark:text-red-400"
                        : balance < 0
                          ? "text-orange-500 dark:text-orange-400"
                          : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {balance === 0 ? "Paid in Full" : fmt(Math.abs(balance))}
                  </span>
                </div>
              </div>
            </div>
            </div>{/* end Payment+Summary grid */}

          </form>
        </div>

        {/* Fixed footer */}
        <div className="flex-none flex justify-end gap-2 border-t border-dark-100 bg-white px-6 py-4 dark:border-dark-700 dark:bg-dark-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-order-form" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}