import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ReadOnlyField } from "@/components/ui/read-only-field";
import { createCustomerSchema } from "@/lib/schemas";
import { formatCanadianPostalCode, formatPhoneNumber } from "@/lib/utils";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

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

function normalizeCanadianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCustomerModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    type: "individual",
    // Address fields
    addressLabel: "Home",
    street: "",
    city: "",
    state: "ON",
    zipCode: "",
    country: "Canada",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "zipCode") {
      setFormData((prev) => ({
        ...prev,
        zipCode: formatCanadianPostalCode(value),
      }));
      return;
    }
    if (name === "firstName" || name === "lastName" || name === "city") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^A-Za-z]/g, ""),
      }));
      return;
    }
    if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhoneNumber(value),
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    // ── Zod validation ────────────────────────────────────────────────────
    const parsed = createCustomerSchema.safeParse({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      notes: formData.notes,
      street: formData.street,
      city: formData.city,
      zipCode: formData.zipCode,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setLoading(false);
      return;
    }

    try {
      const normalizedPhone = normalizeCanadianPhone(formData.phone);
      const normalizedPostalCode = formatCanadianPostalCode(formData.zipCode);

      const payload = {
        type: formData.type,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: normalizedPhone,
        notes: formData.notes || undefined,
        addresses: [
          {
            label: formData.addressLabel,
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zipCode: normalizedPostalCode,
            country: "Canada",
            isDefault: true,
          },
        ],
      };

      await api.post("/customers", payload);
      onSuccess();
      onOpenChange(false);
      // Reset form usually handled by re-mounting or manual reset, but closing modal is fine
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
        type: "individual",
        addressLabel: "Home",
        street: "",
        city: "",
        state: "ON",
        zipCode: "",
        country: "Canada",
      });
    } catch (error) {
      console.error("Failed to create customer", error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = error;
      const serverMsg = err?.response?.data?.message;
      const message = Array.isArray(serverMsg)
        ? serverMsg.join(", ")
        : serverMsg || "Failed to create customer.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your database. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Customer Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              {fieldErrors.firstName && <p className="text-xs text-red-600">{fieldErrors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
              {fieldErrors.lastName && <p className="text-xs text-red-600">{fieldErrors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="(416) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Customer Information / Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add internal notes about this customer"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
            />
            {fieldErrors.notes && <p className="text-xs text-red-600">{fieldErrors.notes}</p>}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium">Address</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                name="street"
                placeholder="123 Main St"
                value={formData.street}
                onChange={handleChange}
                required
              />
              {fieldErrors.street && <p className="text-xs text-red-600">{fieldErrors.street}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="Toronto"
                value={formData.city}
                onChange={handleChange}
                required
              />
              {fieldErrors.city && <p className="text-xs text-red-600">{fieldErrors.city}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">Province</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleSelectChange("state", value)}
              >
                <SelectTrigger id="state">
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
              <Label htmlFor="zipCode">Postal Code</Label>
              <Input
                id="zipCode"
                name="zipCode"
                placeholder="A1A 1A1"
                value={formData.zipCode}
                onChange={handleChange}
                maxLength={7}
                required
              />
              {fieldErrors.zipCode && <p className="text-xs text-red-600">{fieldErrors.zipCode}</p>}
            </div>
            <div className="space-y-2">
              <ReadOnlyField
                id="country"
                label="Country"
                value={formData.country}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
