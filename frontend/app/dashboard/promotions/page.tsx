"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Loader2, Tag, CalendarRange, ChevronDown, Percent, DollarSign,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InventoryOption { _id: string; name: string; sku: string; }
interface Promotion {
  _id: string;
  name: string;
  description: string;
  inventoryItem: { _id: string; name: string; sku: string } | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  minQuantity: number;
  maxQuantity: number | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  inventoryItem: "",
  discountType: "percent" as "percent" | "fixed",
  discountValue: "",
  startDate: "",
  endDate: "",
  minQuantity: "1",
  maxQuantity: "",
  isActive: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isCurrentlyActive(promo: Promotion) {
  const now = new Date();
  return promo.isActive && new Date(promo.startDate) <= now && new Date(promo.endDate) >= now;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function PromotionModal({
  open, onClose, onSaved, editing, inventory,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Promotion | null;
  inventory: InventoryOption[];
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        inventoryItem: editing.inventoryItem?._id ?? "",
        discountType: editing.discountType,
        discountValue: String(editing.discountValue),
        startDate: editing.startDate.split("T")[0],
        endDate: editing.endDate.split("T")[0],
        minQuantity: String(editing.minQuantity ?? 1),
        maxQuantity: editing.maxQuantity != null ? String(editing.maxQuantity) : "",
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [open, editing]);

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.inventoryItem) { setError("Please select an inventory item."); return; }
    if (!form.startDate || !form.endDate) { setError("Start and end date are required."); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setError("End date must be after start date."); return; }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim() || undefined,
        description: form.description,
        inventoryItem: form.inventoryItem,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate + "T23:59:59").toISOString(),
        minQuantity: Number(form.minQuantity) || 1,
        maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await api.patch(`/promotions/${editing._id}`, payload);
      } else {
        await api.post("/promotions", payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Failed to save promotion."));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = "w-full h-10 px-3 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelCls = "block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-dark-100 dark:border-dark-700">
          <h2 className="text-lg font-bold text-dark-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-500" />
            {editing ? "Edit Promotion" : "New Promotion"}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-700 dark:hover:text-white text-xl leading-none">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Promotion Name <span className="text-dark-300">(auto-generated if blank)</span></label>
            <input className={inputCls} placeholder="e.g. wwpromo4421" value={form.name} onChange={f("name")} />
          </div>
          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls + " h-20 py-2 resize-none"} placeholder="Describe the promotion…" value={form.description} onChange={f("description")} />
          </div>
          {/* Inventory item */}
          <div>
            <label className={labelCls}>Inventory Item <span className="text-red-500">*</span></label>
            <div className="relative">
              <select className={inputCls + " appearance-none pr-8"} value={form.inventoryItem} onChange={f("inventoryItem")} required>
                <option value="">Select item…</option>
                {inventory.map((i) => (
                  <option key={i._id} value={i._id}>{i.name} {i.sku ? `(${i.sku})` : ""}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>
          </div>
          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Discount Type</label>
              <div className="relative">
                <select className={inputCls + " appearance-none pr-8"} value={form.discountType} onChange={f("discountType")}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Discount Value</label>
              <input className={inputCls} type="number" min="0" step="0.01" placeholder={form.discountType === "percent" ? "e.g. 10" : "e.g. 5.00"} value={form.discountValue} onChange={f("discountValue")} required />
            </div>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date <span className="text-red-500">*</span></label>
              <input className={inputCls} type="date" value={form.startDate} onChange={f("startDate")} required />
            </div>
            <div>
              <label className={labelCls}>End Date <span className="text-red-500">*</span></label>
              <input className={inputCls} type="date" value={form.endDate} onChange={f("endDate")} required />
            </div>
          </div>
          {/* Quantity limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Quantity Required</label>
              <input className={inputCls} type="number" min="1" placeholder="e.g. 5" value={form.minQuantity} onChange={f("minQuantity")} />
            </div>
            <div>
              <label className={labelCls}>Max Quantity <span className="text-dark-300">(leave blank = no limit)</span></label>
              <input className={inputCls} type="number" min="1" placeholder="e.g. 20" value={form.maxQuantity} onChange={f("maxQuantity")} />
            </div>
          </div>
          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-primary-600"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            <span className="text-sm text-dark-700 dark:text-dark-300">Active</span>
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : (editing ? "Save Changes" : "Create Promotion")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "staff" | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [inventory, setInventory] = useState<InventoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Read role from cookie
  useEffect(() => {
    const raw = Cookies.get("user_info");
    if (!raw) { router.replace("/login"); return; }
    try {
      const { role: r } = JSON.parse(raw);
      if (r === "admin" || r === "staff") setRole(r);
      else router.replace("/dashboard");
    } catch { router.replace("/login"); }
  }, [router]);

  const load = async () => {
    try {
      setLoading(true);
      if (role === "admin") {
        const [promoRes, invRes] = await Promise.all([
          api.get<Promotion[]>("/promotions"),
          api.get<{ _id: string; name: string; sku: string }[]>("/inventory"),
        ]);
        setPromotions(promoRes.data || []);
        setInventory((invRes.data || []).map((i) => ({ _id: i._id, name: i.name, sku: i.sku })));
      } else {
        const promoRes = await api.get<Promotion[]>("/promotions");
        setPromotions(promoRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load promotions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (role) void load(); }, [role]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this promotion?")) return;
    setDeleting(id);
    try { await api.delete(`/promotions/${id}`); void load(); }
    catch (err) { console.error("Failed to delete", err); }
    finally { setDeleting(null); }
  };

  const active = useMemo(() => promotions.filter(isCurrentlyActive), [promotions]);
  const inactive = useMemo(() => promotions.filter((p) => !isCurrentlyActive(p)), [promotions]);

  if (loading || role === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // ── Staff view: read-only active promotions ──────────────────────────────
  if (role === "staff") {
    const now = new Date();
    const activePromos = promotions.filter(
      (p) => p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now,
    );
    return (
      <div className="space-y-4 p-2 md:p-4 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Current Promotions</h1>
          <p className="text-sm text-dark-400 mt-0.5">Promotions that are active right now.</p>
        </div>

        {activePromos.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm px-6 py-12 text-center">
            <Tag className="mx-auto mb-3 w-10 h-10 text-dark-300 dark:text-dark-600" />
            <p className="text-dark-500 dark:text-dark-400 font-medium">No active promotions at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activePromos.map((p) => (
              <div key={p._id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-700/40 p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-dark-900 dark:text-white text-base leading-tight">{p.name}</h2>
                    {p.inventoryItem && (
                      <p className="text-xs text-primary-500 font-medium mt-0.5">{p.inventoryItem.name}</p>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {p.discountType === "percent"
                      ? <><Percent className="w-3 h-3" />{p.discountValue}% off</>
                      : <><DollarSign className="w-3 h-3" />{p.discountValue.toFixed(2)} off</>}
                  </span>
                </div>

                {p.description && (
                  <p className="text-sm text-dark-700 dark:text-dark-300">{p.description}</p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-dark-400 dark:text-dark-500">
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>{fmt(p.startDate)} → {fmt(p.endDate)}</span>
                </div>

                {(p.minQuantity > 1 || p.maxQuantity !== null) && (
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    Qty required:{" "}
                    <span className="font-medium text-dark-700 dark:text-dark-300">
                      {p.minQuantity}{p.maxQuantity !== null ? ` – ${p.maxQuantity}` : "+"}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const PromoTable = ({ rows, title }: { rows: Promotion[]; title: string }) => (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-100 dark:border-dark-700 flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-dark-400" />
        <h2 className="font-semibold text-dark-900 dark:text-white text-sm">{title}</h2>
        <span className="ml-auto text-xs text-dark-400">{rows.length} {rows.length === 1 ? "promotion" : "promotions"}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-dark-400 text-center">No promotions here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-dark-50 dark:border-dark-700">
                <th className="px-4 py-2.5 font-medium text-dark-500">Name</th>
                <th className="px-4 py-2.5 font-medium text-dark-500">Item</th>
                <th className="px-4 py-2.5 font-medium text-dark-500">Discount</th>
                <th className="px-4 py-2.5 font-medium text-dark-500">Period</th>
                <th className="px-4 py-2.5 font-medium text-dark-500">Min Qty</th>
                <th className="px-4 py-2.5 font-medium text-dark-500">Max Qty</th>
                <th className="px-4 py-2.5 font-medium text-dark-500">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const live = isCurrentlyActive(p);
                return (
                  <tr key={p._id} className="border-b border-dark-50 dark:border-dark-700 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-700/50">
                    <td className="px-4 py-2.5 font-medium text-dark-900 dark:text-white">
                      {p.name}
                      {p.description && <p className="text-xs text-dark-400 font-normal truncate max-w-[160px]">{p.description}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-dark-600 dark:text-dark-300">{p.inventoryItem?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-dark-900 dark:text-white font-medium">
                      {p.discountType === "percent" ? `${p.discountValue}%` : `$${p.discountValue.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2.5 text-dark-500 text-xs whitespace-nowrap">
                      {fmt(p.startDate)} → {fmt(p.endDate)}
                    </td>
                    <td className="px-4 py-2.5 text-dark-600 dark:text-dark-300 text-center">{p.minQuantity}</td>
                    <td className="px-4 py-2.5 text-dark-600 dark:text-dark-300 text-center">{p.maxQuantity ?? "∞"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        live ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                             : "bg-dark-100 text-dark-500 dark:bg-dark-700 dark:text-dark-400"
                      }`}>{live ? "Active" : p.isActive ? "Scheduled" : "Inactive"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditing(p); setModalOpen(true); }} className="p-1.5 rounded hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-400 hover:text-dark-700 dark:hover:text-white transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p._id)} disabled={deleting === p._id} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-dark-400 hover:text-red-500 transition-colors">
                          {deleting === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 p-2 md:p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Promotions</h1>
          <p className="text-sm text-dark-400 mt-0.5">Set item discounts with date ranges and quantity rules.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Promotion
        </Button>
      </div>

      <PromoTable rows={active} title="Active Promotions" />
      <PromoTable rows={inactive} title="Inactive / Scheduled" />

      <PromotionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
        inventory={inventory}
      />
    </div>
  );
}
