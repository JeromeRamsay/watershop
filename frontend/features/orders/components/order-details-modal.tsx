"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  User,
  MapPin,
  CreditCard,
  Package,
  Truck,
  Store,
  Receipt,
  Calendar,
  Phone,
  Mail,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Hash,
} from "lucide-react";
import { Order } from "../types";
import { OrderReceiptPreviewDialog } from "./order-receipt-preview";
import { useSettings } from "@/lib/queries";

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  loading: boolean;
}

const formatCurrency = (value?: number) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatPaymentType = (value?: string) => {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const orderStatusConfig: Record<string, { color: string; icon: React.ElementType; bg: string }> = {
  Completed: { color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 },
  Pending:   { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: Clock },
  Scheduled: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", icon: Calendar },
  Cancelled: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle },
};

const paymentStatusConfig: Record<string, { color: string; bg: string }> = {
  Paid:    { color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  Unpaid:  { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  Partial: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  Pending: { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
};

function StatusBadge({ label, colorClass, bgClass, icon: Icon }: { label: string; colorClass: string; bgClass: string; icon?: React.ElementType }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${bgClass} ${colorClass}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
        <Icon className="h-4 w-4 text-primary-500" />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-dark-400 dark:text-dark-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-dark-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-dark-400 dark:text-dark-500">
      {children}
    </p>
  );
}

export function OrderDetailsModal({
  open,
  onOpenChange,
  order,
  loading,
}: OrderDetailsModalProps) {
  const { data: settings } = useSettings();
  const taxRate: number = settings?.taxRate ?? 0;

  const allItems = [...(order?.items || []), ...(order?.refills || [])];
  const itemSubtotal = allItems.reduce(
    (sum, item) => sum + Number(item.totalPrice || 0),
    0,
  );
  const discount = order?.discount ?? 0;
  const pretaxTotal = Math.max(0, itemSubtotal - discount);
  const taxAmount = pretaxTotal * taxRate;
  const grandTotal = pretaxTotal + taxAmount;
  const amountPaid = order?.amountPaid ?? 0;
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const allItems = [...(order?.items || []), ...(order?.refills || [])];

  const statusCfg = orderStatusConfig[order?.orderStatus ?? ""] ?? { color: "text-dark-600", bg: "bg-dark-100", icon: AlertCircle };
  const paymentCfg = paymentStatusConfig[order?.paymentStatus ?? ""] ?? { color: "text-dark-600", bg: "bg-dark-100" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 !sm:max-w-5xl" style={{ maxWidth: "min(90vw, 72rem)" }}>
        {/* ── Top header bar ── */}
        <DialogHeader className="shrink-0 border-b border-dark-100 bg-white px-6 pt-5 pb-4 dark:border-dark-700 dark:bg-dark-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                <Receipt className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-dark-900 dark:text-white">
                  Order Details
                </DialogTitle>
                <p className="font-mono text-sm font-semibold text-primary-500">
                  {order?.orderId ?? ""}
                </p>
              </div>
            </div>
            {order && (
              <div className="flex flex-col gap-3 sm:items-end">
                <OrderReceiptPreviewDialog order={order} settings={settings} />
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <StatusBadge
                    label={order.orderStatus}
                    colorClass={statusCfg.color}
                    bgClass={statusCfg.bg}
                    icon={statusCfg.icon}
                  />
                  <StatusBadge
                    label={order.paymentStatus}
                    colorClass={paymentCfg.color}
                    bgClass={paymentCfg.bg}
                  />
                  <StatusBadge
                    label={order.deliveryType}
                    colorClass={order.deliveryType === "Delivery" ? "text-indigo-700 dark:text-indigo-400" : "text-dark-600 dark:text-dark-300"}
                    bgClass={order.deliveryType === "Delivery" ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-dark-100 dark:bg-dark-700"}
                    icon={order.deliveryType === "Delivery" ? Truck : Store}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto bg-dark-50 dark:bg-dark-900">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
            </div>
          ) : !order ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-dark-300" />
              <p className="text-sm text-dark-400">Order details not found.</p>
            </div>
          ) : (
            <div className="space-y-4 p-5">

              {/* ── Row 1: Customer + Order Info ── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Customer card */}
                <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                  <SectionLabel>Customer</SectionLabel>
                  <div className="space-y-4">
                    <DetailItem icon={User} label="Name" value={order.customer} />
                    <DetailItem icon={Mail} label="Email" value={order.customerEmail} />
                    <DetailItem icon={Phone} label="Phone" value={order.customerPhone} />
                  </div>
                </div>

                {/* Order info card */}
                <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                  <SectionLabel>Order Info</SectionLabel>
                  <div className="space-y-4">
                    <DetailItem icon={Hash} label="Created" value={formatDateTime(order.createdAt)} />
                    {order.scheduledDate && (
                      <DetailItem icon={Calendar} label="Scheduled Date" value={formatDateTime(order.scheduledDate)} />
                    )}
                    {order.deliveryType === "Delivery" && order.deliveryAddress && (
                      <DetailItem icon={MapPin} label="Delivery Address" value={order.deliveryAddress} />
                    )}
                  </div>
                </div>
              </div>

              {(order.notes || (order.deliveryType === "Delivery" && order.deliveryNotes)) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {order.notes && (
                    <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                      <SectionLabel>Order Notes</SectionLabel>
                      <p className="whitespace-pre-wrap text-sm text-dark-700 dark:text-dark-200">
                        {order.notes}
                      </p>
                    </div>
                  )}
                  {order.deliveryType === "Delivery" && order.deliveryNotes && (
                    <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                      <SectionLabel>Delivery Notes</SectionLabel>
                      <p className="whitespace-pre-wrap text-sm text-dark-700 dark:text-dark-200">
                        {order.deliveryNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Row 2: Items ── */}
              <div className="rounded-2xl border border-dark-100 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800">
                <div className="border-b border-dark-100 px-5 py-3.5 dark:border-dark-700">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary-500" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-dark-400 dark:text-dark-500">
                      Items ({allItems.length})
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-dark-50 dark:border-dark-700">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
                          Product
                        </th>
                        <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
                          SKU
                        </th>
                        <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
                          Qty
                        </th>
                        <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
                          Unit Price
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allItems.map((item, index) => (
                        <tr
                          key={`${item.id}-${index}`}
                          className="border-b border-dark-50 transition-colors last:border-0 hover:bg-dark-50/50 dark:border-dark-700/40 dark:hover:bg-dark-700/20"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-dark-900 dark:text-white">
                                {item.productName}
                              </span>
                              {item.isRefill && (
                                <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  Refill
                                </span>
                              )}
                              {item.creditsUsed && !item.isRefill && (
                                <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  Credits
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-xs text-dark-400 dark:text-dark-500">
                            {item.sku || "-"}
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-bold text-dark-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-dark-500 dark:text-dark-400">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-dark-900 dark:text-white">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Row 3: Summary + Payment ── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Order summary */}
                <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                  <SectionLabel>Summary</SectionLabel>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-500 dark:text-dark-400">Subtotal</span>
                      <span className="font-medium text-dark-900 dark:text-white">{formatCurrency(itemSubtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">Discount</span>
                        <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    {taxRate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-500 dark:text-dark-400">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                        <span className="font-medium text-dark-900 dark:text-white">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-dark-500 dark:text-dark-400">Pretax Total</span>
                      <span className="font-medium text-dark-900 dark:text-white">{formatCurrency(pretaxTotal)}</span>
                    </div>

                    {/* Grand total */}
                    <div className="flex justify-between border-t border-dark-200 pt-2.5 dark:border-dark-600">
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">Grand Total</span>
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatCurrency(grandTotal)}</span>
                    </div>

                    {balanceDue > 0 && (
                      <div className="flex justify-between border-t border-red-200 pt-2.5 dark:border-red-900">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">Balance Due</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(balanceDue)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment details */}
                <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800">
                  <SectionLabel>Payment</SectionLabel>
                  <div className="space-y-3">
                    {/* Mode badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-500 dark:text-dark-400">Mode</span>
                      <span className="rounded-full bg-dark-100 px-3 py-0.5 text-xs font-semibold text-dark-700 dark:bg-dark-700 dark:text-dark-300">
                        {order.paymentDetails?.mode === "split" ? "Split Payment" : "Single Payment"}
                      </span>
                    </div>

                    {order.paymentDetails?.mode === "single" ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-dark-500 dark:text-dark-400">Method</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                          <Tag className="h-3 w-3" />
                          {formatPaymentType(order.paymentDetails.paymentMethod || order.paymentMethod)}
                        </span>
                      </div>
                    ) : order.paymentDetails?.mode === "split" ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-dark-400 dark:text-dark-500">Split entries</p>
                        {(order.paymentDetails.payments || []).map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-xl border border-dark-100 bg-dark-50 px-3 py-2 dark:border-dark-700 dark:bg-dark-700/40"
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3.5 w-3.5 text-dark-400" />
                              <span className="text-xs font-medium text-dark-700 dark:text-dark-300">
                                {formatPaymentType(p.type)}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-dark-900 dark:text-white">
                              {formatCurrency(p.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-dark-500 dark:text-dark-400">Method</span>
                        <span className="text-sm font-medium text-dark-900 dark:text-white">
                          {formatPaymentType(order.paymentMethod)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-dark-100 pt-3 dark:border-dark-700">
                      <span className="text-sm text-dark-500 dark:text-dark-400">Total Paid</span>
                      <span className="text-base font-bold text-dark-900 dark:text-white">
                        {formatCurrency(amountPaid)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
