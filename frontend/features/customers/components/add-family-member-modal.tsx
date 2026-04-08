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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FamilyMember } from "../types";
import { formatPhoneNumber } from "@/lib/utils";

interface AddFamilyMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (member: FamilyMember) => void;
  primaryCustomerAddress?: {
    billingAddress?: string;
    deliveryAddress?: string;
  };
}

export function AddFamilyMemberModal({
  open,
  onOpenChange,
  onAdd,
  primaryCustomerAddress,
}: AddFamilyMemberModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    relationship: "",
    billingAddress: "",
    deliveryAddress: "",
    sameAddressAsPrimary: false,
    viewOrderHistory: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member: FamilyMember = {
      id: Date.now().toString(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email || undefined,
      relationship: formData.relationship,
      billingAddress: formData.billingAddress || undefined,
      deliveryAddress: formData.deliveryAddress || undefined,
    };

    onAdd(member);
    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      relationship: "",
      billingAddress: "",
      deliveryAddress: "",
      sameAddressAsPrimary: false,
      viewOrderHistory: false,
    });
    onOpenChange(false);
  };

  const handleSameAddressChange = (checked: boolean) => {
    setFormData({
      ...formData,
      sameAddressAsPrimary: checked,
      billingAddress: checked ? primaryCustomerAddress?.billingAddress || "" : formData.billingAddress,
      deliveryAddress: checked ? primaryCustomerAddress?.deliveryAddress || "" : formData.deliveryAddress,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-dark-900 dark:text-white">Add Family Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-dark-600 dark:text-white">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value.replace(/[^A-Za-z]/g, "") })}
                placeholder="Please Enter"
                className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-dark-600 dark:text-white">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value.replace(/[^A-Za-z]/g, "") })}
                placeholder="Please Enter"
                className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-dark-600 dark:text-white">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                placeholder="(416) 123-4567"
                className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailAddress" className="text-dark-600 dark:text-white">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Please Enter"
                className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship" className="text-dark-600 dark:text-white">Relationship</Label>
              <Select
                value={formData.relationship}
                onValueChange={(value) => setFormData({ ...formData, relationship: value })}
              >
                <SelectTrigger className="dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                  <SelectValue placeholder="Please Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Son">Son</SelectItem>
                  <SelectItem value="Daughter">Daughter</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="billingAddress" className="text-dark-600 dark:text-white">Billing Address</Label>
              <Textarea
                id="billingAddress"
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                placeholder="Please Enter"
                className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className="text-dark-600 dark:text-white">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="Please Enter"
                className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sameAddress"
                checked={formData.sameAddressAsPrimary}
                onCheckedChange={handleSameAddressChange}
                className="dark:border-dark-600 dark:bg-dark-700"
              />
              <Label htmlFor="sameAddress" className="text-sm text-dark-600 dark:text-white cursor-pointer">
                Same Address as Primary Customer
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="viewOrderHistory"
                checked={formData.viewOrderHistory}
                onCheckedChange={(checked) => setFormData({ ...formData, viewOrderHistory: checked as boolean })}
                className="dark:border-dark-600 dark:bg-dark-700"
              />
              <Label htmlFor="viewOrderHistory" className="text-sm text-dark-600 dark:text-white cursor-pointer">
                View Order History of Family Group
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
