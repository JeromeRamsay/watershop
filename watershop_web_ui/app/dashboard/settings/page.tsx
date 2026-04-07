"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";

interface SettingsData {
  storeName: string;
  currency: string;
  taxRate: number;
  receiptFooter: string;
  enableLowStockAlerts: boolean;
  contactPhone: string;
  operatingHours: {
    open: string;
    close: string;
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SettingsData>({
    storeName: "",
    currency: "EGP",
    taxRate: 0,
    receiptFooter: "",
    enableLowStockAlerts: true,
    contactPhone: "",
    operatingHours: {
      open: "09:00",
      close: "21:00",
    },
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/settings");
      if (data) {
        setFormData({
          storeName: data.storeName || "",
          currency: data.currency || "EGP",
          taxRate: data.taxRate !== undefined ? data.taxRate * 100 : 0, // Convert decimal to percentage for display
          receiptFooter: data.receiptFooter || "",
          enableLowStockAlerts:
            data.enableLowStockAlerts !== undefined
              ? data.enableLowStockAlerts
              : true,
          contactPhone: data.contactPhone || "",
          operatingHours: data.operatingHours || {
            open: "09:00",
            close: "21:00",
          },
        });
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        taxRate: Number(formData.taxRate) / 100, // Convert percentage back to decimal
      };
      await api.patch("/settings", payload);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings", error);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto overflow-x-hidden pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <SettingsIcon className="h-8 w-8 text-primary-500" />
          <h1 className="text-2xl md:text-3xl font-semibold text-dark-900 dark:text-white">
            Store Settings
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-dark-200 dark:border-dark-600 dark:bg-dark-700">
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Basic details about your store.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) =>
                    setFormData({ ...formData, storeName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dark-200 dark:border-dark-600 dark:bg-dark-700">
          <CardHeader>
            <CardTitle>Financial Settings</CardTitle>
            <CardDescription>Currency and tax configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency Code</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  placeholder="EGP"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxRate: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dark-200 dark:border-dark-600 dark:bg-dark-700">
          <CardHeader>
            <CardTitle>Operations & Preferences</CardTitle>
            <CardDescription>
              Manage operating hours and system alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Hours</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={formData.operatingHours.open}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          open: e.target.value,
                        },
                      })
                    }
                  />
                  <span className="text-dark-400">to</span>
                  <Input
                    type="time"
                    value={formData.operatingHours.close}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          close: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
                <Input
                  id="receiptFooter"
                  value={formData.receiptFooter}
                  onChange={(e) =>
                    setFormData({ ...formData, receiptFooter: e.target.value })
                  }
                  placeholder="Thank you for your business!"
                />
              </div>
            </div>
            <Separator className="my-4 bg-dark-200 dark:bg-dark-600" />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lowStock"
                checked={formData.enableLowStockAlerts}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    enableLowStockAlerts: checked as boolean,
                  })
                }
              />
              <Label htmlFor="lowStock" className="font-normal cursor-pointer">
                Enable Low Stock Alerts
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary-500 hover:bg-primary-600 text-white px-8"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>

      {/* Footer */}
      <div className="text-end text-sm text-[#545454] dark:text-dark-500 py-4">
        Copyright {new Date().getFullYear()} Water Shop. All Rights Reserved
      </div>
    </div>
  );
}
