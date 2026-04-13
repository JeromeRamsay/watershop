"use client";

import { useMemo } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateRefillOverride, useCustomer } from "@/lib/queries";
import { Customer, HydratedCustomer } from "../types";

interface CustomerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

const formatDate = (value?: string | Date) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatLabel = (value?: string) => {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatSignedValue = (value?: number) => {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${numeric}`;
  return numeric.toString();
};

const getOrderType = (itemsCount: number, refillCount: number) => {
  if (itemsCount > 0 && refillCount > 0) return "Item + Refill";
  if (refillCount > 0) return "Refill";
  if (itemsCount > 0) return "Item";
  return "-";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message =
    typeof error === "object" && error !== null
      ? (error as {
          response?: { data?: { message?: string | string[] } };
          message?: string;
        })
      : undefined;

  const responseMessage = message?.response?.data?.message;
  if (Array.isArray(responseMessage) && responseMessage.length) {
    return responseMessage.join(", ");
  }
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  if (typeof message?.message === "string" && message.message.trim()) {
    return message.message;
  }
  return fallback;
};

const getErrorStatus = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  return (error as { response?: { status?: number } }).response?.status;
};

const getAddress = (details?: HydratedCustomer, fallback?: string) => {
  const address = details?.addresses?.find((item) => item.isDefault) ||
    details?.addresses?.[0];

  if (!address) return fallback || "-";

  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : fallback || "-";
};

const formatPhoneNumber = (value?: string) => {
  const trimmedValue = (value || "").trim();
  if (!trimmedValue) return "-";

  const digits = trimmedValue.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 1)}-(${digits.slice(1, 4)})-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return trimmedValue;
};

export function CustomerDetailsModal({
  open,
  onOpenChange,
  customer,
}: CustomerDetailsModalProps) {
  const customerId = customer?.id || "";
  const {
    data,
    isLoading,
    error: detailError,
  } = useCustomer(customerId);
  const overrideMutation = useCreateRefillOverride();

  const detail = data as HydratedCustomer | undefined;
  const prepaidItems = detail?.wallet?.prepaidItems || [];
  const orderHistory = detail?.orderHistory || [];

  const overrideQuantities = useMemo(
    () =>
      new Map(
        (detail?.overrideTotals || []).map((row) => [
          row.itemId,
          Number(row.quantityDelta || 0),
        ]),
      ),
    [detail?.overrideTotals],
  );

  const displayName = detail
    ? `${detail.firstName || ""} ${detail.lastName || ""}`.trim() || customer?.name || "-"
    : customer?.name || "-";
  const displayEmail = detail?.email || customer?.email || "-";
  const displayPhone = formatPhoneNumber(detail?.phone || customer?.phone || "");
  const displayAddress = getAddress(detail, customer?.address);
  const displayOrders = detail ? orderHistory.length : customer?.orders || 0;
  const displayTotalRefills = detail
    ? orderHistory.reduce((sum, order) => sum + Number(order.refillCount || 0), 0)
    : Number(customer?.totalRefills || 0);
  const displayCreditsLeft = detail
    ? prepaidItems.reduce(
        (sum, item) => sum + Number(item.quantityRemaining || 0),
        0,
      )
    : Number(customer?.creditsLeft || 0);
  const displayFamilyGroup = detail?.familyMembers?.length
    ? `${detail.familyMembers.length} Members`
    : customer?.familyGroup || "-";
  const displayNotes = detail?.notes?.trim() || customer?.notes?.trim() || "";

  const detailErrorMessage = detailError
    ? getErrorMessage(detailError, "Failed to load customer details.")
    : "";
  const overrideErrorMessage = overrideMutation.error
    ? getErrorStatus(overrideMutation.error) === 429
      ? "Too many refill override requests were sent. Wait a moment and try again."
      : getErrorMessage(
          overrideMutation.error,
          "Failed to update refill balance.",
        )
    : "";

  const handleOverride = async (itemId: string, quantityDelta: number) => {
    if (!customerId) return;

    try {
      await overrideMutation.mutateAsync({
        customerId,
        itemId,
        quantityDelta,
      });
    } catch {
      return;
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-dark-900 dark:text-white">
            Customer Details
          </DialogTitle>
        </DialogHeader>

        {isLoading && !detail ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="space-y-5">
            {detailErrorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detailErrorMessage}
              </div>
            ) : null}

            {overrideErrorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {overrideErrorMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-dark-500 dark:text-dark-400">Name</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayName}
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">Phone</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayPhone}
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">Email</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayEmail}
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">Address</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayAddress}
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">Total Orders</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayOrders}
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">Total Refills</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayTotalRefills}
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">
                  Remaining Refills
                </p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayCreditsLeft} Refills
                </p>
              </div>
              <div>
                <p className="text-dark-500 dark:text-dark-400">Family Group</p>
                <p className="font-medium text-dark-900 dark:text-white">
                  {displayFamilyGroup}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-dark-900 dark:text-white">
                Customer Information
              </h3>
              <div className="whitespace-pre-wrap rounded-lg border border-dark-200 px-3 py-3 text-sm text-dark-700 dark:border-dark-600 dark:text-dark-200">
                {displayNotes || "No customer information added."}
              </div>
            </div>

            <div>
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-dark-900 dark:text-white">
                  Remaining Refills
                </h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-dark-200 dark:border-dark-600">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-dark-50 dark:bg-dark-600">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Product
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Remaining
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Overrides
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Adjust
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepaidItems.length ? (
                      prepaidItems.map((item) => {
                        const itemId = String(item.itemId);
                        const overrideQuantity = Number(
                          item.overrideQuantity ?? overrideQuantities.get(itemId) ?? 0,
                        );

                        return (
                          <tr
                            key={itemId}
                            className="border-t border-dark-200 dark:border-dark-600"
                          >
                            <td className="px-3 py-2 text-xs">{item.itemName}</td>
                            <td className="px-3 py-2 text-xs">
                              {Number(item.quantityRemaining || 0)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {formatSignedValue(overrideQuantity)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={
                                    overrideMutation.isPending ||
                                    Number(item.quantityRemaining || 0) <= 0
                                  }
                                  onClick={() => handleOverride(itemId, -1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={overrideMutation.isPending}
                                  onClick={() => handleOverride(itemId, 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                {overrideMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-xs text-dark-500" colSpan={4}>
                          No refill products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-dark-900 dark:text-white">
                Orders & Refills
              </h3>
              <div className="overflow-x-auto rounded-lg border border-dark-200 dark:border-dark-600">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-dark-50 dark:bg-dark-600">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Order ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Items
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Refills
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Total
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderHistory.length ? (
                      orderHistory.map((order) => (
                        <tr
                          key={order.id}
                          className="border-t border-dark-200 dark:border-dark-600"
                        >
                          <td className="px-3 py-2 text-xs">{order.orderId}</td>
                          <td className="px-3 py-2 text-xs">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-3 py-2 text-xs">{order.itemsCount}</td>
                          <td className="px-3 py-2 text-xs">{order.refillCount}</td>
                          <td className="px-3 py-2 text-xs">
                            {getOrderType(order.itemsCount, order.refillCount)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            ${Number(order.totalPrice || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="rounded-md border border-dark-300 px-2 py-1 dark:border-dark-500">
                              {formatLabel(order.orderStatus)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="rounded-md border border-dark-300 px-2 py-1 dark:border-dark-500">
                              {formatLabel(order.paymentStatus)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-xs text-dark-500" colSpan={8}>
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}