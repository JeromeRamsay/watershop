"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer } from "../types";
import { Edit, Trash2, Plus, ArrowUpDown } from "lucide-react";

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onUpdate: (data: Customer) => void;
  onOpenAddFamilyMember?: () => void;
  onDeleteFamilyMember?: (customerId: string, memberId: string) => void;
}

export function EditCustomerModal({
  open,
  onOpenChange,
  customer,
  onUpdate,
  onOpenAddFamilyMember,
  onDeleteFamilyMember,
}: EditCustomerModalProps) {
  const initialFormData = useMemo(() => {
    if (!customer) {
      return {
        name: "",
        email: "",
        phone: "",
        customerType: "Individual",
        billingAddress: "",
        deliveryAddress: "",
        country: "",
        city: "",
        state: "",
        zipCode: "",
        totalOrders: "",
        remainingCredits: "",
      };
    }
    return {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      customerType: customer.customerType,
      billingAddress: customer.billingAddress || "",
      deliveryAddress: customer.deliveryAddress || "",
      country: customer.country || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
      totalOrders: customer.orders.toString(),
      remainingCredits: customer.creditsLeft.toString(),
    };
  }, [customer]);

  const [formData, setFormData] = useState(initialFormData);

  // Reset form when customer changes
  if (customer && formData.name !== customer.name) {
    setFormData(initialFormData);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const updatedCustomer: Customer = {
      ...customer,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      customerType: formData.customerType as "Individual" | "Business",
      billingAddress: formData.billingAddress,
      deliveryAddress: formData.deliveryAddress,
      country: formData.country,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      orders: parseInt(formData.totalOrders) || 0,
      creditsLeft: parseInt(formData.remainingCredits) || 0,
    };

    onUpdate(updatedCustomer);
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={customer.id}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-dark-900 dark:text-white">Edit Customer Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-dark-600 dark:text-white">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-dark-600 dark:text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-dark-600 dark:text-white">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerType" className="text-dark-600 dark:text-white">Customer Type</Label>
                <Select
                  value={formData.customerType}
                  onValueChange={(value) => setFormData({ ...formData, customerType: value })}
                >
                  <SelectTrigger className="dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Address Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billingAddress" className="text-dark-600 dark:text-white">Billing Address</Label>
                <Input
                  id="billingAddress"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress" className="text-dark-600 dark:text-white">Delivery Address</Label>
                <Input
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-dark-600 dark:text-white">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger className="dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="USA">USA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-dark-600 dark:text-white">City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger className="dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toronto">Toronto</SelectItem>
                      <SelectItem value="Vancouver">Vancouver</SelectItem>
                      <SelectItem value="Montreal">Montreal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-dark-600 dark:text-white">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger className="dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toronto">Toronto</SelectItem>
                      <SelectItem value="Ontario">Ontario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-dark-600 dark:text-white">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Family Group */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Family Group</h3>
              {onOpenAddFamilyMember && (
                <Button
                  type="button"
                  onClick={onOpenAddFamilyMember}
                  className="bg-primary-500 hover:bg-primary-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
            {customer.familyMembers && customer.familyMembers.length > 0 ? (
              <div className="bg-white dark:bg-dark-700 rounded-xl overflow-hidden border border-dark-200 dark:border-dark-600">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-600">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          <div className="flex items-center gap-2">
                            Name
                            <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          <div className="flex items-center gap-2">
                            Relationship
                            <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          <div className="flex items-center gap-2">
                            Phone
                            <ArrowUpDown className="h-4 w-4 text-dark-400 dark:text-dark-500" />
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.familyMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">{member.name}</td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">{member.relationship}</td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">{member.phone}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary-500 hover:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {onDeleteFamilyMember && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDeleteFamilyMember(customer.id, member.id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400">No family members added yet.</p>
            )}
          </div>

          {/* Order & Credit Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Order & Credit Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalOrders" className="text-dark-600 dark:text-white">Total Orders</Label>
                <Input
                  id="totalOrders"
                  type="number"
                  value={formData.totalOrders}
                  onChange={(e) => setFormData({ ...formData, totalOrders: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingCredits" className="text-dark-600 dark:text-white">Remaining Credits</Label>
                <Input
                  id="remainingCredits"
                  type="number"
                  value={formData.remainingCredits}
                  onChange={(e) => setFormData({ ...formData, remainingCredits: e.target.value })}
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
              </div>
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
