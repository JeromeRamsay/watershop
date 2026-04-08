"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Loader2 } from "lucide-react";
import { Order, PaymentDetails } from "../types";
import api from "@/lib/api";

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

const toDisplayDateTime = (rawDate?: string) => {
  if (!rawDate) return "";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
};

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
  const [singlePayment, setSinglePayment] = useState({
    type: "cash",
    amount: "",
  });

  const [formData, setFormData] = useState({
    customerId: "",
    orderStatus: "Pending",
    paymentStatus: "Unpaid",
    deliveryType: "Pickup",
    deliveryAddress: "",
    deliveryDateTime: "",
    discount: "0",
    paymentMethod: "cash",
    amountPaid: "0",
    emailReceipt: false,
  });

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
      paymentMethod: order.paymentMethod || "cash",
      amountPaid: String(order.amountPaid || 0),
      emailReceipt: !!order.emailReceipt,
    });

    const details = order.paymentDetails;
    if (details?.mode === "split") {
      setPaymentMode("split");
      setSplitPayments(
        (details.payments || []).map((payment) => ({
          type: payment.type,
          amount: String(payment.amount || 0),
        })),
      );
    } else {
      setPaymentMode("single");
      setSinglePayment({
        type: details?.paymentMethod || order.paymentMethod || "cash",
        amount: String(details?.amount ?? order.amountPaid ?? 0),
      });
      setSplitPayments([{ type: "cash", amount: "" }]);
    }
  }, [order]);

  const handleAddSplitPayment = () => {
    setSplitPayments((prev) => [...prev, { type: "cash", amount: "" }]);
  };

  const handleRemoveSplitPayment = (index: number) => {
    setSplitPayments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSplitPaymentChange = (
    index: number,
    field: "type" | "amount",
    value: string,
  ) => {
    setSplitPayments((prev) =>
      prev.map((payment, idx) =>
        idx === index ? { ...payment, [field]: value } : payment,
      ),
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
              paymentMethod: singlePayment.type,
              amount: Number(singlePayment.amount || 0),
            }
          : {
              mode: "split",
              payments: splitPayments.map((payment) => ({
                type: payment.type,
                amount: Number(payment.amount || 0),
              })),
            };

      const payload = {
        customerId: formData.customerId || undefined,
        paymentMethod: formData.paymentMethod,
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
        amountPaid: Number(formData.amountPaid || 0),
      };

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
        paymentMethod: formData.paymentMethod as Order["paymentMethod"],
        amountPaid: Number(formData.amountPaid || 0),
        paymentDetails,
        emailReceipt: formData.emailReceipt,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update order", error);
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Update order customer, delivery, statuses and payment details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer</Label>
              <Input
                id="edit-customer"
                value={order.customer || "Walk-in Customer"}
                readOnly
                className="h-12 bg-muted cursor-default select-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger className="h-12" id="edit-paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit_redemption">
                    Credit Redemption
                  </SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-orderStatus">Order Status</Label>
              <Select
                value={formData.orderStatus}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, orderStatus: value }))
                }
              >
                <SelectTrigger className="h-12" id="edit-orderStatus">
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

            <div className="space-y-2">
              <Label htmlFor="edit-paymentStatus">Payment Status</Label>
              <Select
                value={formData.paymentStatus}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentStatus: value }))
                }
              >
                <SelectTrigger className="h-12" id="edit-paymentStatus">
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

            <div className="space-y-2">
              <Label htmlFor="edit-deliveryType">Delivery Type</Label>
              <Select
                value={formData.deliveryType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, deliveryType: value }))
                }
              >
                <SelectTrigger className="h-12" id="edit-deliveryType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pickup">Pickup</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.deliveryType === "Delivery" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-deliveryAddress">Delivery Address</Label>
                <Input
                  id="edit-deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryAddress: event.target.value,
                    }))
                  }
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deliveryDateTime">
                  Delivery Date/Time
                </Label>
                <Input
                  id="edit-deliveryDateTime"
                  type="datetime-local"
                  value={formData.deliveryDateTime}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDateTime: event.target.value,
                    }))
                  }
                  className="h-12"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-discount">Discount</Label>
              <Input
                id="edit-discount"
                type="number"
                min="0"
                value={formData.discount}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    discount: event.target.value,
                  }))
                }
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amountPaid">Amount Paid</Label>
              <Input
                id="edit-amountPaid"
                type="number"
                min="0"
                step="0.01"
                value={formData.amountPaid}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    amountPaid: event.target.value,
                  }))
                }
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Receipt</Label>
              <div className="h-12 flex items-center gap-2 border rounded-md px-3">
                <Checkbox
                  checked={formData.emailReceipt}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      emailReceipt: Boolean(checked),
                    }))
                  }
                  id="edit-emailReceipt"
                />
                <Label htmlFor="edit-emailReceipt" className="font-normal">
                  Send receipt by email
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Details</Label>
            <Select
              value={paymentMode}
              onValueChange={(value) =>
                setPaymentMode(value as "single" | "split")
              }
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Payment</SelectItem>
                <SelectItem value="split">Split Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select
                  value={singlePayment.type}
                  onValueChange={(value) =>
                    setSinglePayment((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit_redemption">
                      Credit Redemption
                    </SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={singlePayment.amount}
                  onChange={(event) =>
                    setSinglePayment((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  className="h-12"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {splitPayments.map((payment, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                >
                  <Select
                    value={payment.type}
                    onValueChange={(value) =>
                      handleSplitPaymentChange(index, "type", value)
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="credit_redemption">
                        Credit Redemption
                      </SelectItem>
                      <SelectItem value="store_credit">Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-12"
                    value={payment.amount}
                    onChange={(event) =>
                      handleSplitPaymentChange(
                        index,
                        "amount",
                        event.target.value,
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12"
                    onClick={() => handleRemoveSplitPayment(index)}
                    disabled={splitPayments.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSplitPayment}
              >
                Add Payment Line
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
