"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { FamilyMember } from "@/features/customers/types";
import {
  Edit,
  Trash2,
  Plus,
  ArrowUpDown,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { AddFamilyMemberModal } from "@/features/customers/components/add-family-member-modal";
import api from "@/lib/api";

const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

const CANADIAN_POSTAL_CODE_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

function formatCanadianPostalCode(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)} ${clean.slice(3)}`;
}

function normalizeCanadianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

interface BackendCustomer {
  _id: string;
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: Array<{
    label: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }>;
  familyMembers: Array<{
    _id?: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    allowCreditUse?: boolean;
  }>;
  wallet?: {
    storeCredit: number;
    prepaidItems: Array<{ quantityRemaining: number }>;
  };
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [backendData, setBackendData] = useState<BackendCustomer | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAddFamilyMemberOpen, setIsAddFamilyMemberOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    customerType: "individual",
    // Address fields
    street: "",
    city: "",
    state: "ON",
    zipCode: "",
    country: "Canada",
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/customers/${customerId}`);
        if (data) {
          setBackendData(data);
          const defaultAddress =
            data.addresses?.find((a: { isDefault: boolean }) => a.isDefault) ||
            data.addresses?.[0];

          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            customerType: data.type || "individual",
            street: defaultAddress?.street || "",
            city: defaultAddress?.city || "",
            state: defaultAddress?.state || "ON",
            zipCode: formatCanadianPostalCode(defaultAddress?.zipCode || ""),
            country: "Canada",
          });

          const mapped: FamilyMember[] =
            data.familyMembers?.map(
              (m: {
                _id?: string;
                name: string;
                relationship: string;
                phone: string;
                email?: string;
              }) => ({
                id: m._id || Date.now().toString() + Math.random(),
                name: m.name,
                relationship: m.relationship,
                phone: m.phone,
                email: m.email,
              }),
            ) || [];
          setFamilyMembers(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch customer", err);
        setError("Failed to load customer data.");
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const buildPayload = (currentFamilyMembers: FamilyMember[]) => {
    const normalizedPhone = normalizeCanadianPhone(formData.phone);
    const normalizedPostalCode = formatCanadianPostalCode(formData.zipCode);

    return {
      type: formData.customerType,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: normalizedPhone,
      addresses: [
        {
          label: "Home",
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: normalizedPostalCode,
          country: "Canada",
          isDefault: true,
        },
      ],
      familyMembers: currentFamilyMembers.map((m) => ({
        name: m.name,
        relationship: m.relationship,
        phone: m.phone,
        email: m.email || "",
      })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendData) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedPhone = normalizeCanadianPhone(formData.phone);
      if (normalizedPhone.length !== 10) {
        setError("Enter a valid Canadian phone number (10 digits).");
        return;
      }

      const normalizedPostalCode = formatCanadianPostalCode(formData.zipCode);
      if (!CANADIAN_POSTAL_CODE_REGEX.test(normalizedPostalCode)) {
        setError("Enter a valid Canadian postal code (e.g. A1A 1A1).");
        return;
      }

      const payload = buildPayload(familyMembers);
      await api.patch(`/customers/${customerId}`, payload);
      setSuccess("Customer updated successfully!");
      setTimeout(() => {
        router.push("/dashboard/customers");
      }, 1000);
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to update customer.";
      setError(errMsg || "Failed to update customer.");
      console.error("Failed to update customer", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFamilyMember = async (member: FamilyMember) => {
    const updatedMembers = [...familyMembers, member];
    setFamilyMembers(updatedMembers);

    // Persist to backend
    try {
      const payload = {
        familyMembers: updatedMembers.map((m) => ({
          name: m.name,
          relationship: m.relationship,
          phone: m.phone,
          email: m.email || "",
        })),
      };
      await api.patch(`/customers/${customerId}`, payload);
      setSuccess("Family member added successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save family member", err);
      setError("Failed to save family member to server.");
      // Revert local state
      setFamilyMembers(familyMembers);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteFamilyMember = async (memberId: string) => {
    const updatedMembers = familyMembers.filter((m) => m.id !== memberId);
    const previousMembers = [...familyMembers];
    setFamilyMembers(updatedMembers);

    // Persist to backend
    try {
      const payload = {
        familyMembers: updatedMembers.map((m) => ({
          name: m.name,
          relationship: m.relationship,
          phone: m.phone,
          email: m.email || "",
        })),
      };
      await api.patch(`/customers/${customerId}`, payload);
      setSuccess("Family member removed.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to delete family member", err);
      setError("Failed to remove family member from server.");
      // Revert
      setFamilyMembers(previousMembers);
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!backendData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-dark-600 dark:text-dark-400">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/customers")}
          className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-dark-900 dark:text-white">
          Edit Customer Details
        </h1>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-dark-700 rounded-xl border border-dark-200 dark:border-dark-600 shadow-sm dark:shadow-dark-900/50 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className="text-dark-600 dark:text-white"
                >
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="lastName"
                  className="text-dark-600 dark:text-white"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-dark-600 dark:text-white"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-dark-600 dark:text-white"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                  placeholder="4161231234"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="customerType"
                  className="text-dark-600 dark:text-white"
                >
                  Customer Type
                </Label>
                <Select
                  value={formData.customerType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customerType: value })
                  }
                >
                  <SelectTrigger className="dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 pt-6 border-t border-dark-200 dark:border-dark-600">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
              Address Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="street"
                  className="text-dark-600 dark:text-white"
                >
                  Street
                </Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData({ ...formData, street: e.target.value })
                  }
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="city"
                    className="text-dark-600 dark:text-white"
                  >
                    City
                  </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                    placeholder="Toronto"
                    />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="state"
                    className="text-dark-600 dark:text-white"
                  >
                    Province
                  </Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) =>
                      setFormData({ ...formData, state: value })
                    }
                  >
                    <SelectTrigger
                      id="state"
                      className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                    >
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES.map((province) => (
                        <SelectItem key={province.code} value={province.code}>
                          {province.name} ({province.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="zipCode"
                    className="text-dark-600 dark:text-white"
                  >
                    Postal Code
                  </Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        zipCode: formatCanadianPostalCode(e.target.value),
                      })
                    }
                    className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                    placeholder="A1A 1A1"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="country"
                    className="text-dark-600 dark:text-white"
                  >
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    className="dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                    placeholder="Canada"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Family Group */}
          <div className="space-y-4 pt-6 border-t border-dark-200 dark:border-dark-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
                Family Group
              </h3>
              <Button
                type="button"
                onClick={() => setIsAddFamilyMemberOpen(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {familyMembers.length > 0 ? (
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
                        <th className="text-center py-3 px-4 text-sm font-semibold text-dark-600 dark:text-dark-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-dark-200 dark:border-dark-600 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">
                            {member.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">
                            {member.relationship}
                          </td>
                          <td className="py-3 px-4 text-sm text-dark-900 dark:text-white">
                            {member.phone}
                          </td>
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleDeleteFamilyMember(member.id)
                                }
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
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
              </div>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400">
                No family members added yet.
              </p>
            )}
          </div>

          {/* Wallet / Credits Information (read-only) */}
          <div className="space-y-4 pt-6 border-t border-dark-200 dark:border-dark-600">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
              Wallet Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-dark-600 dark:text-white">
                  Store Credit
                </Label>
                <Input
                  type="number"
                  value={backendData.wallet?.storeCredit || 0}
                  disabled
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-dark-600 dark:text-white">
                  Prepaid Items
                </Label>
                <Input
                  value={
                    backendData.wallet?.prepaidItems?.reduce(
                      (sum, item) => sum + (item.quantityRemaining || 0),
                      0,
                    ) || 0
                  }
                  disabled
                  className="dark:border-dark-600 dark:bg-dark-700 dark:text-white opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-dark-200 dark:border-dark-600">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/customers")}
              className="border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Add Family Member Modal */}
      <AddFamilyMemberModal
        open={isAddFamilyMemberOpen}
        onOpenChange={setIsAddFamilyMemberOpen}
        onAdd={handleAddFamilyMember}
        primaryCustomerAddress={{
          billingAddress: formData.street,
          deliveryAddress: formData.street,
        }}
      />
    </div>
  );
}
