"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Supplier } from "@/features/suppliers/types";
import { EditSupplierModal } from "@/features/suppliers/components/edit-supplier-modal";
import { DeleteSupplierModal } from "@/features/suppliers/components/delete-supplier-modal";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface SupplierSelectProps {
  value: string;
  onChange: (value: string) => void;
  suppliers: Supplier[];
}

export function SupplierSelect({
  value,
  onChange,
  suppliers,
}: SupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  );
  const router = useRouter();

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setAdding(true);
    try {
      const res = await api.post("/suppliers", {
        name: newSupplierName,
        isActive: true,
      });
      // Optionally select the new supplier
      if (res.data && res.data.name) {
        onChange(res.data.name);
      }
      setNewSupplierName("");
      router.refresh(); // Refresh to update the list
    } catch (error) {
      console.error("Failed to add supplier", error);
    } finally {
      setAdding(false);
    }
  };

  const onSuccess = () => {
    router.refresh();
  };

  // ✅ Design-only tokens (no logic changes)
  const triggerCls =
    "w-full justify-between h-12 rounded-xl border border-[#E5E7EB] bg-white px-3 " +
    "text-sm font-normal text-[#111827] shadow-sm " +
    "focus-visible:outline-none focus-visible:border-[#38BDF8] focus-visible:ring-4 focus-visible:ring-[#E0F2FE]";

  const placeholderCls = "text-[#9CA3AF]";
  const contentCls =
    "w-[--radix-popover-trigger-width] p-0 rounded-xl border border-[#E5E7EB] bg-white " +
    "shadow-[0_10px_30px_rgba(17,24,39,0.10)] overflow-hidden";

  const addRowWrap = "p-3 bg-white";
  const addInputCls =
    "h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] " +
    "placeholder:text-[#9CA3AF] shadow-sm outline-none " +
    "focus:border-[#38BDF8] focus:ring-4 focus:ring-[#E0F2FE]";

  const addBtnCls =
    "h-10 rounded-xl bg-[#0EA5E9] text-white hover:bg-[#0284C7] w-16 shrink-0 shadow-sm";

  const listWrap = "max-h-[220px] overflow-y-auto p-2 pt-1";
  const itemCls =
    "flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer " +
    "hover:bg-[#F3F4F6] transition-colors";

  const itemActiveCls = "bg-[#EAF7FF]";
  const nameCls = "text-sm text-[#111827] truncate";
  const dividerCls = "border-t border-[#EEF2F7]";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={triggerCls}
          >
            <span className={cn("truncate", !value && placeholderCls)}>
              {value
                ? suppliers.find((supplier) => supplier.name === value)?.name ||
                  value
                : "Please Select"}
            </span>

            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#9CA3AF]" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className={contentCls} align="start">
          {/* Add Supplier Row */}
          <div className={addRowWrap}>
            <div className="flex gap-2">
              <Input
                placeholder="Enter name"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className={addInputCls}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSupplier();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddSupplier}
                disabled={adding || !newSupplierName.trim()}
                className={addBtnCls}
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>

          <div className={dividerCls} />

          {/* Supplier List */}
          <div className={listWrap}>
            {suppliers.length === 0 && (
              <div className="text-sm text-center py-6 text-[#6B7280]">
                No suppliers found
              </div>
            )}

            <div className="space-y-1">
              {suppliers.map((supplier) => {
                const active = value === supplier.name;

                return (
                  <div
                    key={supplier.id}
                    className={cn(itemCls, active && itemActiveCls, "group")}
                  >
                    <div
                      className="flex-1 flex items-center gap-2 truncate"
                      onClick={() => {
                        onChange(supplier.name);
                        setOpen(false);
                      }}
                    >
                      <span className={nameCls}>{supplier.name}</span>
                      {active && <Check className="h-4 w-4 text-[#0EA5E9]" />}
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-[#9CA3AF] hover:text-[#0EA5E9] hover:bg-[#F3F4F6]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSupplier(supplier);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-[#F3F4F6]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSupplier(supplier);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <EditSupplierModal
        open={!!editingSupplier}
        onOpenChange={(open) => !open && setEditingSupplier(null)}
        supplier={editingSupplier}
        onSuccess={onSuccess}
      />

      <DeleteSupplierModal
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
        supplier={deletingSupplier}
        onSuccess={() => {
          if (deletingSupplier?.name === value) {
            onChange("");
          }
          onSuccess();
        }}
      />
    </>
  );
}
