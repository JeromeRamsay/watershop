"use client";

import { forwardRef, useRef, useState, type ComponentProps } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Printer } from "lucide-react";
import { Order, PolicyDetails } from "../types";

interface ReceiptSettings {
  storeName?: string;
  contactPhone?: string;
  contactEmail?: string;
  receiptFooter?: string;
  taxRate?: number;
}

interface OrderReceiptPreviewDialogProps {
  order: Order;
  settings?: ReceiptSettings | null;
  draft?: boolean;
  disabled?: boolean;
  triggerLabel?: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
}

interface OrderReceiptDocumentProps {
  order: Order;
  settings?: ReceiptSettings | null;
  draft?: boolean;
}

const DEFAULT_STORE_NAME = "Woodstock's Water Shop";
const DEFAULT_STORE_ADDRESS = "196 Springbank Avenue North Woodstock, ON N4S 7R3";
const DEFAULT_STORE_PHONE = "(519) 290-5678";
const DEFAULT_STORE_EMAIL = "info@woodstockswatershop.com";

const GENERIC_WARRANTY_COPY =
  "Warranty coverage begins on the original purchase date and follows the item-specific terms listed above when provided. Damage caused by misuse, neglect, improper installation, freezing, or unauthorized repairs is not covered unless required by law.";

const GENERIC_RETURN_COPY =
  "Returns and exchanges require proof of purchase and prior approval from Woodstock's Water Shop. Opened, installed, used, custom-order, clearance, and special-order items may not be eligible for return. Approved returns may be subject to inspection and restocking fees.";

const RECEIPT_STYLES = `
  :root {
    color-scheme: light;
  }

  .receipt-document,
  .receipt-document * {
    box-sizing: border-box;
  }

  .receipt-document {
    width: 100%;
    max-width: 860px;
    margin: 0 auto;
    padding: 32px;
    border: 1px solid #dbe2ea;
    border-radius: 24px;
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  }

  .receipt-document h1,
  .receipt-document h2,
  .receipt-document p {
    margin: 0;
  }

  .receipt-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 24px;
    border-bottom: 2px solid #dbe2ea;
  }

  .receipt-brand {
    flex: 1 1 360px;
    max-width: 560px;
  }

  .receipt-kicker {
    margin-bottom: 8px;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .receipt-store-name {
    color: #0f172a;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.1;
  }

  .receipt-contact,
  .receipt-copy,
  .receipt-notes,
  .receipt-policy-list,
  .receipt-footer-note {
    color: #334155;
    font-size: 14px;
    line-height: 1.6;
  }

  .receipt-contact {
    display: grid;
    gap: 4px;
    margin-top: 16px;
  }

  .receipt-meta {
    flex: 0 1 280px;
    min-width: 250px;
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid #dbe2ea;
    border-radius: 18px;
    background: #f8fafc;
    color: #334155;
    font-size: 14px;
    line-height: 1.5;
  }

  .receipt-meta-row,
  .receipt-summary-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .receipt-label {
    color: #64748b;
    font-weight: 500;
  }

  .receipt-emphasis {
    color: #0f172a;
    font-weight: 600;
  }

  .receipt-meta-row span:last-child,
  .receipt-summary-row span:last-child {
    text-align: right;
  }

  .receipt-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 24px;
  }

  .receipt-card,
  .receipt-section {
    padding: 20px;
    border: 1px solid #dbe2ea;
    border-radius: 20px;
    background: #ffffff;
  }

  .receipt-section {
    margin-top: 20px;
  }

  .receipt-card-title,
  .receipt-section-title {
    margin-bottom: 12px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .receipt-copy > * + *,
  .receipt-notes > * + *,
  .receipt-copy-stack > * + *,
  .receipt-policy-block > * + * {
    margin-top: 6px;
  }

  .receipt-prewrap {
    white-space: pre-wrap;
  }

  .receipt-table {
    width: 100%;
    margin-top: 8px;
    border-collapse: collapse;
  }

  .receipt-table th,
  .receipt-table td {
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    vertical-align: top;
    font-size: 14px;
  }

  .receipt-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .receipt-table th {
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .receipt-item-name {
    color: #0f172a;
    font-weight: 600;
  }

  .receipt-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }

  .receipt-align-center {
    text-align: center;
  }

  .receipt-align-right {
    text-align: right;
  }

  .receipt-summary {
    width: 100%;
    max-width: 320px;
    margin: 16px 0 0 auto;
    color: #334155;
    font-size: 14px;
    line-height: 1.5;
  }

  .receipt-summary-row {
    padding: 6px 0;
  }

  .receipt-summary-row.is-total {
    margin-top: 6px;
    padding-top: 12px;
    border-top: 2px solid #dbe2ea;
    color: #0f172a;
    font-size: 16px;
    font-weight: 700;
  }

  .receipt-summary-row.is-balance {
    color: #b91c1c;
    font-weight: 700;
  }

  .receipt-policy-item + .receipt-policy-item {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .receipt-policy-title,
  .receipt-policy-subtitle {
    color: #0f172a;
    font-weight: 600;
  }

  .receipt-policy-title {
    margin-bottom: 8px;
    font-size: 14px;
  }

  .receipt-footer-note {
    margin-top: 10px;
  }

  .receipt-footer-message {
    margin-top: 24px;
    text-align: center;
    color: #64748b;
  }

  .receipt-preview-surface {
    overflow-y: auto;
    padding: 24px;
    background: #e2e8f0;
  }

  @media (max-width: 720px) {
    .receipt-document {
      padding: 20px;
      border-radius: 20px;
    }

    .receipt-header {
      flex-direction: column;
    }

    .receipt-meta,
    .receipt-summary {
      width: 100%;
      max-width: none;
      min-width: 0;
    }

    .receipt-grid {
      grid-template-columns: 1fr;
    }

    .receipt-preview-surface {
      padding: 12px;
    }

    .receipt-table th,
    .receipt-table td {
      padding: 10px 8px;
      font-size: 13px;
    }
  }
`;

const PRINT_STYLES = `
  @page {
    margin: 12mm;
    size: auto;
  }

  html {
    background: #ffffff;
  }

  body {
    margin: 0;
    padding: 24px;
    background: #f5f7fb;
    color: #0f172a;
    font-family: Arial, Helvetica, sans-serif;
  }

  ${RECEIPT_STYLES}

  @media print {
    body {
      padding: 0;
      background: #ffffff;
    }

    .receipt-document {
      max-width: none;
      padding: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }
  }
`;

const formatCurrency = (value?: number) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value?: string) => {
  if (!value) return "-";
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

const formatPolicyDuration = (policy?: PolicyDetails) => {
  if (!policy) return undefined;
  const parts: string[] = [];
  if (policy.periodYears) {
    parts.push(`${policy.periodYears} year${policy.periodYears === 1 ? "" : "s"}`);
  }
  if (policy.periodMonths) {
    parts.push(`${policy.periodMonths} month${policy.periodMonths === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
};

const getAmountPaid = (order: Order) => {
  if (typeof order.amountPaid === "number") {
    return order.amountPaid;
  }
  if (order.paymentDetails?.mode === "single") {
    return Number(order.paymentDetails.amount || 0);
  }
  if (order.paymentDetails?.mode === "split") {
    return (order.paymentDetails.payments || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
  }
  return 0;
};

const shouldShowCustomer = (order: Order) => {
  if (order.customerId_raw) return true;
  return !order.customer.toLowerCase().includes("walk-in");
};

const OrderReceiptDocument = forwardRef<HTMLDivElement, OrderReceiptDocumentProps>(
  function OrderReceiptDocument({ order, settings, draft = false }, ref) {
    const allItems = [...(order.items || []), ...(order.refills || [])];
    const itemSubtotal = allItems.reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    );
    const discount = Number(order.discount || 0);
    const pretaxTotal = Math.max(0, itemSubtotal - discount);
    const taxRate = Number(settings?.taxRate || 0);
    const taxAmount = pretaxTotal * taxRate;
    const grandTotal = pretaxTotal + taxAmount;
    const amountPaid = getAmountPaid(order);
    const balanceDue = Math.max(0, grandTotal - amountPaid);
    const policyItems = allItems.filter(
      (item) =>
        item.warranty?.description ||
        item.returnPolicy?.description ||
        item.warranty?.periodYears ||
        item.warranty?.periodMonths ||
        item.returnPolicy?.periodYears ||
        item.returnPolicy?.periodMonths,
    );
    const invoiceLabel = draft || !order.orderId ? "Draft Invoice" : "Invoice";
    const storeName = settings?.storeName || DEFAULT_STORE_NAME;
    const storePhone = settings?.contactPhone || DEFAULT_STORE_PHONE;
    const storeEmail = settings?.contactEmail || DEFAULT_STORE_EMAIL;
    const receiptFooter =
      settings?.receiptFooter || "Thank you for your business!";
    const normalizedDeliveryType =
      order.deliveryType === "Delivery" ? "Delivery" : "Pickup";

    return (
      <div ref={ref} className="receipt-document mx-auto max-w-[860px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:shadow-none">
        <div className="receipt-header flex flex-col gap-6 border-b-2 border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="receipt-brand max-w-2xl">
            <p className="receipt-kicker mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
              {invoiceLabel}
            </p>
            <h1 className="receipt-store-name text-3xl font-bold text-slate-900">
              {storeName}
            </h1>
            <div className="receipt-contact mt-4 space-y-1 text-sm text-slate-600">
              <p>{DEFAULT_STORE_ADDRESS}</p>
              <p>{storePhone}</p>
              <p>{storeEmail}</p>
            </div>
          </div>

          <div className="receipt-meta space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:min-w-[250px]">
            <div className="receipt-meta-row flex items-center justify-between gap-4">
              <span className="receipt-label font-medium text-slate-500">Order Number</span>
              <span className="receipt-emphasis font-semibold text-slate-900">
                {draft || !order.orderId ? "DRAFT" : order.orderId}
              </span>
            </div>
            <div className="receipt-meta-row flex items-center justify-between gap-4">
              <span className="receipt-label font-medium text-slate-500">Created</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="receipt-meta-row flex items-center justify-between gap-4">
              <span className="receipt-label font-medium text-slate-500">Delivery Type</span>
              <span>{normalizedDeliveryType}</span>
            </div>
            <div className="receipt-meta-row flex items-center justify-between gap-4">
              <span className="receipt-label font-medium text-slate-500">Order Status</span>
              <span>{order.orderStatus}</span>
            </div>
            <div className="receipt-meta-row flex items-center justify-between gap-4">
              <span className="receipt-label font-medium text-slate-500">Payment Status</span>
              <span>{order.paymentStatus}</span>
            </div>
            <div className="receipt-meta-row flex items-center justify-between gap-4">
              <span className="receipt-label font-medium text-slate-500">Payment Method</span>
              <span>
                {order.paymentDetails?.mode === "split"
                  ? "Split Payment"
                  : formatPaymentType(
                      order.paymentDetails?.paymentMethod || order.paymentMethod,
                    )}
              </span>
            </div>
            {normalizedDeliveryType === "Delivery" && order.scheduledDate && (
              <div className="receipt-meta-row flex items-center justify-between gap-4">
                <span className="receipt-label font-medium text-slate-500">Scheduled</span>
                <span>{formatDateTime(order.scheduledDate)}</span>
              </div>
            )}
          </div>
        </div>

        {shouldShowCustomer(order) && (
          <div className="receipt-grid mt-6 grid gap-4 sm:grid-cols-2">
            <section className="receipt-card rounded-2xl border border-slate-200 p-5">
              <h2 className="receipt-card-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Customer
              </h2>
              <div className="receipt-copy receipt-copy-stack space-y-1.5 text-sm text-slate-700">
                <p className="receipt-emphasis font-semibold text-slate-900">{order.customer}</p>
                {order.customerEmail && <p>{order.customerEmail}</p>}
                {order.customerPhone && <p>{order.customerPhone}</p>}
              </div>
            </section>

            <section className="receipt-card rounded-2xl border border-slate-200 p-5">
              <h2 className="receipt-card-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Fulfilment
              </h2>
              <div className="receipt-copy receipt-copy-stack space-y-1.5 text-sm text-slate-700">
                <p>
                  <span className="receipt-label font-medium text-slate-500">Delivery Type:</span>{" "}
                  {normalizedDeliveryType}
                </p>
                {normalizedDeliveryType === "Delivery" && order.deliveryAddress && (
                  <p>
                    <span className="receipt-label font-medium text-slate-500">Address:</span>{" "}
                    {order.deliveryAddress}
                  </p>
                )}
                {normalizedDeliveryType === "Delivery" && order.scheduledDate && (
                  <p>
                    <span className="receipt-label font-medium text-slate-500">Scheduled:</span>{" "}
                    {formatDateTime(order.scheduledDate)}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {(order.notes || (normalizedDeliveryType === "Delivery" && order.deliveryNotes)) && (
          <section className="receipt-section mt-5 rounded-2xl border border-slate-200 p-5">
            <h2 className="receipt-section-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Additional Notes
            </h2>
            <div className="receipt-notes space-y-3 text-sm text-slate-700">
              {order.notes && (
                <div>
                  <p className="receipt-emphasis font-semibold text-slate-900">Order Notes</p>
                  <p className="receipt-prewrap whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
              {normalizedDeliveryType === "Delivery" && order.deliveryNotes && (
                <div>
                  <p className="receipt-emphasis font-semibold text-slate-900">Delivery Notes</p>
                  <p className="receipt-prewrap whitespace-pre-wrap">{order.deliveryNotes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="receipt-section mt-5 rounded-2xl border border-slate-200 p-5">
          <h2 className="receipt-section-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Items
          </h2>
          <table className="receipt-table w-full border-collapse">
            <thead>
              <tr>
                <th>Item</th>
                <th className="receipt-align-center text-center">Qty</th>
                <th className="receipt-align-right text-right">Unit Price</th>
                <th className="receipt-align-right text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, index) => (
                <tr key={`${item.id}-${index}`}>
                  <td className="receipt-item-cell">
                    <div className="receipt-copy-stack space-y-1">
                      <p className="receipt-item-name font-semibold text-slate-900">{item.productName}</p>
                      <div className="receipt-item-meta flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.sku && <span>SKU: {item.sku}</span>}
                        {item.isRefill && <span>Refill</span>}
                        {item.creditsUsed && <span>Prepaid Redemption</span>}
                      </div>
                    </div>
                  </td>
                  <td className="receipt-align-center text-center">{item.quantity}</td>
                  <td className="receipt-align-right text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="receipt-align-right text-right">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-summary ml-auto mt-4 w-full max-w-xs space-y-1 text-sm text-slate-700">
            <div className="receipt-summary-row flex items-center justify-between gap-4 py-1.5">
              <span>Subtotal</span>
              <span>{formatCurrency(itemSubtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="receipt-summary-row flex items-center justify-between gap-4 py-1.5">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="receipt-summary-row flex items-center justify-between gap-4 py-1.5">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="receipt-summary-row is-total flex items-center justify-between gap-4 border-t-2 border-slate-200 pt-3 font-bold text-slate-900">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className="receipt-summary-row flex items-center justify-between gap-4 py-1.5">
              <span>Amount Paid</span>
              <span>{formatCurrency(amountPaid)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="receipt-summary-row is-balance flex items-center justify-between gap-4 py-1.5 font-semibold text-red-700">
                <span>Balance Due</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            )}
          </div>
        </section>

        {policyItems.length > 0 && (
          <section className="receipt-section mt-5 rounded-2xl border border-slate-200 p-5">
            <h2 className="receipt-section-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Item-Specific Warranty & Returns
            </h2>
            <div className="receipt-policy-list space-y-4 text-sm text-slate-700">
              {policyItems.map((item, index) => {
                const warrantyDuration = formatPolicyDuration(item.warranty);
                const returnDuration = formatPolicyDuration(item.returnPolicy);

                return (
                  <div
                    key={`${item.id}-policy-${index}`}
                    className="receipt-policy-item border-t border-slate-200 pt-4 first:border-t-0 first:pt-0"
                  >
                    <p className="receipt-policy-title text-sm font-semibold text-slate-900">
                      {item.productName}
                    </p>
                    {item.warranty && (
                      <div className="mt-2 space-y-1">
                        <p className="receipt-policy-subtitle font-medium text-slate-900">Warranty</p>
                        {item.warranty.description && (
                          <p className="receipt-prewrap whitespace-pre-wrap">{item.warranty.description}</p>
                        )}
                        {warrantyDuration && <p>Coverage period: {warrantyDuration}</p>}
                      </div>
                    )}
                    {item.returnPolicy && (
                      <div className="receipt-policy-block mt-2 space-y-1">
                        <p className="receipt-policy-subtitle font-medium text-slate-900">Return Policy</p>
                        {item.returnPolicy.description && (
                          <p className="receipt-prewrap whitespace-pre-wrap">{item.returnPolicy.description}</p>
                        )}
                        {returnDuration && <p>Return window: {returnDuration}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="receipt-section mt-5 rounded-2xl border border-slate-200 p-5">
          <h2 className="receipt-section-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Warranty
          </h2>
          <p className="receipt-footer-note text-sm text-slate-700">
            {GENERIC_WARRANTY_COPY}
          </p>
        </section>

        <section className="receipt-section mt-5 rounded-2xl border border-slate-200 p-5">
          <h2 className="receipt-section-title mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Returns
          </h2>
          <p className="receipt-footer-note text-sm text-slate-700">
            {GENERIC_RETURN_COPY}
          </p>
        </section>

        <p className="receipt-footer-note receipt-footer-message mt-6 text-center text-sm text-slate-500">
          {receiptFooter}
        </p>
      </div>
    );
  },
);

export function OrderReceiptPreviewDialog({
  order,
  settings,
  draft = false,
  disabled = false,
  triggerLabel = "Preview Receipt",
  triggerVariant = "outline",
  triggerClassName,
}: OrderReceiptPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const markup = receiptRef.current?.outerHTML;
    if (!markup) return;

    const printFrame = document.createElement("iframe");
    printFrame.setAttribute(
      "title",
      draft ? "Draft invoice print frame" : "Receipt print frame",
    );
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";

    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printWindow?.document;

    if (!printWindow || !printDocument) {
      printFrame.remove();
      return;
    }

    const cleanup = () => {
      window.removeEventListener("afterprint", cleanup);
      printWindow.removeEventListener("afterprint", cleanup);
      printFrame.remove();
    };

    printWindow.addEventListener("afterprint", cleanup, { once: true });
    window.addEventListener("afterprint", cleanup, { once: true });

    printDocument.open();
    printDocument.write(`<!DOCTYPE html><html><head><meta charSet="utf-8" /><title>${draft ? "Draft Invoice" : order.orderId || "Invoice"}</title><style>${PRINT_STYLES}</style></head><body>${markup}</body></html>`);
    printDocument.close();

    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => {
        printWindow.focus();
        printWindow.print();
      });
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        className={triggerClassName}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Eye className="mr-2 h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92vh] w-full max-w-6xl flex-col gap-0 overflow-hidden p-0 !sm:max-w-6xl">
          <DialogHeader className="border-b border-dark-100 bg-white px-6 py-4 dark:border-dark-700 dark:bg-dark-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <DialogTitle>Receipt Preview</DialogTitle>
                <DialogDescription>
                  Review the printable receipt before sending it to the printer.
                </DialogDescription>
              </div>
              <Button type="button" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </DialogHeader>

          <div className="receipt-preview-surface overflow-y-auto bg-slate-100 p-4 sm:p-6">
            <style>{RECEIPT_STYLES}</style>
            <OrderReceiptDocument
              ref={receiptRef}
              order={order}
              settings={settings}
              draft={draft}
            />
          </div>

          <div className="flex justify-end border-t border-dark-100 bg-white px-6 py-4 dark:border-dark-700 dark:bg-dark-800">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}