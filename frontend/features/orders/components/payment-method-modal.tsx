/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentEntry {
  type: string;
  amount: string;
}

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onSave: (paymentData: any) => void;
}

export function PaymentMethodModal({
  open,
  onOpenChange,
  totalAmount,
  onSave,
}: PaymentMethodModalProps) {
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [singlePayment, setSinglePayment] = useState({
    type: "cash",
    amount: "",
  });
  const [splitPayments, setSplitPayments] = useState<PaymentEntry[]>([
    { type: "cash", amount: "" },
  ]);

  const handleAddPayment = () => {
    setSplitPayments([...splitPayments, { type: "cash", amount: "" }]);
  };

  const handleRemovePayment = (index: number) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const handleSplitPaymentChange = (
    index: number,
    field: "type" | "amount",
    value: string,
  ) => {
    const updated = [...splitPayments];
    updated[index][field] = value;
    setSplitPayments(updated);
  };

  const calculateBalance = () => {
    if (paymentMode === "single") {
      return totalAmount - Number(singlePayment.amount || 0);
    }
    const totalPaid = splitPayments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    return totalAmount - totalPaid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const balance = calculateBalance();

    const paymentData = {
      mode: paymentMode,
      ...(paymentMode === "single"
        ? {
            paymentMethod: singlePayment.type,
            amount: Number(singlePayment.amount),
          }
        : {
            payments: splitPayments.map((p) => ({
              type: p.type,
              amount: Number(p.amount),
            })),
          }),
      // Automatically set payment status based on balance
      paymentStatus: balance <= 0 ? "paid" : "unpaid",
    };

    onSave(paymentData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Method</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Mode Selection */}
          <div className="space-y-4">
            <Label>Select Payment Option</Label>
            <RadioGroup
              value={paymentMode}
              onValueChange={(value) =>
                setPaymentMode(value as "single" | "split")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Single Payment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="split" id="split" />
                <Label htmlFor="split" className="font-normal cursor-pointer">
                  Split Payment (Multiple)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Balance and Total Display — UI-4: computed values shown as labels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Balance ($)</Label>
              <p className="flex h-10 items-center rounded-md border border-input bg-dark-50 px-3 text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300 select-text">
                {calculateBalance().toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Total ($)</Label>
              <p className="flex h-10 items-center rounded-md border border-input bg-dark-50 px-3 text-sm text-dark-700 dark:bg-dark-800 dark:text-dark-300 select-text">
                {totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Single Payment */}
          {paymentMode === "single" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select
                  value={singlePayment.type}
                  onValueChange={(value) =>
                    setSinglePayment({ ...singlePayment, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interac">Interac</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="e_transfer">E-Transfer</SelectItem>
                    <SelectItem value="financeit_etransfer">Financeit E-Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={singlePayment.amount}
                  onChange={(e) =>
                    setSinglePayment({
                      ...singlePayment,
                      amount: e.target.value,
                    })
                  }
                  placeholder="Enter amount"
                  required
                />
              </div>
            </div>
          )}

          {/* Split Payment */}
          {paymentMode === "split" && (
            <div className="space-y-4">
              {splitPayments.map((payment, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Payment {index + 1}</Label>
                    {splitPayments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePayment(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Type</Label>
                      <Select
                        value={payment.type}
                        onValueChange={(value) =>
                          handleSplitPaymentChange(index, "type", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interac">Interac</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="e_transfer">E-Transfer</SelectItem>
                          <SelectItem value="financeit_etransfer">Financeit E-Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payment.amount}
                        onChange={(e) =>
                          handleSplitPaymentChange(
                            index,
                            "amount",
                            e.target.value,
                          )
                        }
                        placeholder="Amount"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPayment}
                className="w-full text-primary-500 border-primary-500 hover:bg-primary-50"
              >
                Add Another Payment
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
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
