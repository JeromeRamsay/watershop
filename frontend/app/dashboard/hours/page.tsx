"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Clock, Loader2, CalendarDays, Users, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  name: string;
  role: "admin" | "staff";
}

interface HourEntry {
  _id: string;
  workDate: string;
  hours: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  user?: { _id: string; firstName: string; lastName: string; username: string };
}

interface SummaryRow {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  totalHours: number;
  daysWorked: number;
  entries: number;
}

interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  role?: string;
  isActive?: boolean;
}

type Period = "today" | "week" | "month" | "custom";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function periodRange(period: Period, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  if (period === "today") {
    const d = toISODate(now);
    return { from: d, to: d };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: toISODate(mon), to: toISODate(sun) };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toISODate(from), to: toISODate(to) };
  }
  return { from: customFrom, to: customTo };
}

function formatDuration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function calcDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMins = sh * 60 + sm;
  let endMins   = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.round(((endMins - startMins) / 60) * 100) / 100;
}

// ─── Time selector (30-min increments, 12-hour display) ─────────────────────

const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;
    TIME_OPTIONS.push({ value, label });
  }
}

function TimeSelect({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 pl-9 pr-8 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">{placeholder}</option>
        {TIME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HoursPage() {
  const [user, setUser]                 = useState<UserInfo | null>(null);
  const [entries, setEntries]           = useState<HourEntry[]>([]);
  const [summary, setSummary]           = useState<SummaryRow[]>([]);
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [period, setPeriod]             = useState<Period>("week");
  const [customFrom, setCustomFrom]     = useState(toISODate(new Date()));
  const [customTo, setCustomTo]         = useState(toISODate(new Date()));

  const [form, setForm] = useState({
    workDate:  toISODate(new Date()),
    startTime: "",
    endTime:   "",
    notes:     "",
  });

  // Preview duration
  const previewDuration = useMemo(
    () => calcDuration(form.startTime, form.endTime),
    [form.startTime, form.endTime],
  );

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async (targetUserId: string, role: string, p: Period, cFrom: string, cTo: string, silent = false) => {
    try {
      if (!silent) setLoading(true);

      let effectiveUserId = targetUserId;

      if (role === "admin") {
        const staffRes = await api.get<StaffMember[]>("/users/staff?includeInactive=true");
        let staffList: StaffMember[] = staffRes.data || [];
        if (staffList.length === 0) {
          const all = await api.get<StaffMember[]>("/users");
          staffList = (all.data || []).filter((m) => (m.role || "").toLowerCase() === "staff");
        }
        const active = staffList.filter((s) => !!s._id && s.isActive !== false);
        setStaff(active);
        if (!effectiveUserId || !active.some((m) => m._id === effectiveUserId)) {
          effectiveUserId = active[0]?._id || "";
          setSelectedUserId(effectiveUserId);
        }
      }

      const { from, to } = periodRange(p, cFrom, cTo);

      // Fetch entries (admin: filtered by period for all staff unless one selected)
      const entryParams = new URLSearchParams();
      if (role === "admin" && effectiveUserId) entryParams.set("userId", effectiveUserId);
      else if (role === "staff") entryParams.set("userId", targetUserId);
      entryParams.set("from", `${from}T00:00:00.000Z`);
      entryParams.set("to",   `${to}T23:59:59.999Z`);
      const entriesRes = await api.get<HourEntry[]>(`/employee-hours?${entryParams}`);
      setEntries(entriesRes.data || []);

      // Admin: fetch summary for period
      if (role === "admin") {
        const sumParams = new URLSearchParams();
        sumParams.set("from", `${from}T00:00:00.000Z`);
        sumParams.set("to",   `${to}T23:59:59.999Z`);
        const sumRes = await api.get<SummaryRow[]>(`/employee-hours/summary?${sumParams}`);
        setSummary(sumRes.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch hours", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const rawUser = Cookies.get("user_info");
    if (!rawUser) { setLoading(false); return; }
    try {
      const parsed = JSON.parse(rawUser) as UserInfo;
      const role = (parsed.role || "").toLowerCase() as UserInfo["role"];
      setUser({ ...parsed, role });
      const uid = role === "admin" ? "" : parsed.id;
      setSelectedUserId(uid);
      fetchData(uid, role, period, customFrom, customTo);
    } catch { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useDashboardRealtime(() => {
    if (!user) return;
    fetchData(user.role === "admin" ? selectedUserId : user.id, user.role, period, customFrom, customTo, true);
  });

  const refresh = useCallback(() => {
    if (!user) return;
    fetchData(user.role === "admin" ? selectedUserId : user.id, user.role, period, customFrom, customTo);
  }, [user, selectedUserId, period, customFrom, customTo, fetchData]);

  const changePeriod = (p: Period) => {
    setPeriod(p);
    if (!user) return;
    fetchData(user.role === "admin" ? selectedUserId : user.id, user.role, p, customFrom, customTo);
  };

  const changeUser = (id: string) => {
    setSelectedUserId(id);
    if (!user) return;
    fetchData(id, user.role, period, customFrom, customTo);
  };

  const applyCustom = () => refresh();

  // ── Submit ─────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!user) return;
    const targetUserId = user.role === "admin" ? selectedUserId : user.id;
    if (!targetUserId || !form.workDate || !form.startTime || !form.endTime) return;
    try {
      setSaving(true);
      await api.post("/employee-hours", {
        userId:    targetUserId,
        workDate:  new Date(form.workDate).toISOString(),
        startTime: form.startTime,
        endTime:   form.endTime,
        notes:     form.notes,
        createdBy: user.id,
      });
      setForm({ workDate: toISODate(new Date()), startTime: "", endTime: "", notes: "" });
      refresh();
    } catch (err) {
      console.error("Failed to submit hours", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Week total for staff view ──────────────────────────────────────────────

  const periodTotal = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.hours || 0), 0),
    [entries],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const canSubmit = form.workDate && form.startTime && form.endTime && (isAdmin ? !!selectedUserId : true);

  const periodLabels: Record<Period, string> = { today: "Today", week: "This Week", month: "This Month", custom: "Custom" };

  return (
    <div className="space-y-4 p-2 md:p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Employee Hours</h1>
      </div>

      {/* ── Period tabs (admin only) ─────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="w-4 h-4 text-dark-400" />
            <span className="text-sm font-medium text-dark-600 dark:text-dark-300">View period:</span>
            <div className="flex gap-1 flex-wrap">
              {(["today", "week", "month", "custom"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-primary-600 text-white"
                      : "bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-600"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 px-3 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm"
              />
              <span className="text-dark-400 text-sm">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 px-3 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm"
              />
              <Button size="sm" onClick={applyCustom}>Apply</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Log hours card */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5 lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-dark-900 dark:text-white">
            {isAdmin ? "Log Hours for Staff" : "Log My Hours"}
          </h2>

          {/* Staff selector (admin) */}
          {isAdmin && (
            <div className="relative">
              <select
                className="w-full h-11 pl-9 pr-4 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedUserId}
                onChange={(e) => changeUser(e.target.value)}
              >
                <option value="">Select employee…</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">Work Date</label>
            <input
              type="date"
              value={form.workDate}
              onChange={(e) => setForm((p) => ({ ...p, workDate: e.target.value }))}
              className="w-full h-11 px-3 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">Start Time</label>
              <TimeSelect value={form.startTime} onChange={(v) => setForm((p) => ({ ...p, startTime: v }))} placeholder="Select start…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">End Time</label>
              <TimeSelect value={form.endTime} onChange={(v) => setForm((p) => ({ ...p, endTime: v }))} placeholder="Select end…" />
            </div>
          </div>

          {/* Duration preview */}
          <div className={`rounded-lg px-4 py-3 flex items-center gap-2 text-sm transition-colors ${
            previewDuration !== null
              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700"
              : "bg-dark-50 dark:bg-dark-700 text-dark-400 border border-dark-200 dark:border-dark-600"
          }`}>
            <Clock className="w-4 h-4 shrink-0" />
            {previewDuration !== null
              ? <span>Duration: <strong>{formatDuration(previewDuration)}</strong></span>
              : <span>Select start and end time to see duration</span>
            }
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-dark-500 dark:text-dark-400 mb-1">Notes <span className="text-dark-300">(optional)</span></label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Covered lunch shift"
              className="w-full h-11 px-3 rounded-lg border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-dark-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <Button
            onClick={submit}
            disabled={saving || !canSubmit}
            className="w-full h-11"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Save Entry"}
          </Button>
        </div>

        {/* Period total card */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-dark-900 dark:text-white mb-1">
              {isAdmin ? `${periodLabels[period]} — All Staff` : periodLabels[period]}
            </h2>
            <p className="text-xs text-dark-400 mb-4">
              {(() => { const { from, to } = periodRange(period, customFrom, customTo); return from === to ? from : `${from} → ${to}`; })()}
            </p>
            <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              {formatDuration(periodTotal)}
            </p>
            <p className="text-xs text-dark-400 mt-1">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
          </div>
        </div>
      </div>

      {/* ── Admin summary table ──────────────────────────────────────────── */}
      {isAdmin && summary.length > 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 overflow-x-auto">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-dark-400" />
            Staff Summary — {periodLabels[period]}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-dark-100 dark:border-dark-700">
                <th className="py-2 pr-4 font-medium text-dark-500">Employee</th>
                <th className="py-2 pr-4 font-medium text-dark-500 text-right">Days</th>
                <th className="py-2 pr-4 font-medium text-dark-500 text-right">Entries</th>
                <th className="py-2 font-medium text-dark-500 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr
                  key={row.userId}
                  className={`border-b border-dark-50 dark:border-dark-700 last:border-0 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors ${
                    selectedUserId === row.userId ? "bg-primary-50 dark:bg-primary-900/20" : ""
                  }`}
                  onClick={() => changeUser(row.userId)}
                >
                  <td className="py-2 pr-4 font-medium text-dark-900 dark:text-white">
                    {row.firstName} {row.lastName}
                    <span className="ml-1 text-xs text-dark-400">@{row.username}</span>
                  </td>
                  <td className="py-2 pr-4 text-right text-dark-600 dark:text-dark-300">{row.daysWorked}</td>
                  <td className="py-2 pr-4 text-right text-dark-600 dark:text-dark-300">{row.entries}</td>
                  <td className="py-2 text-right font-semibold text-primary-600 dark:text-primary-400">
                    {formatDuration(row.totalHours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-dark-400 mt-2">Click a row to filter entries below.</p>
        </div>
      )}

      {/* ── Entries table ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 overflow-x-auto">
        <h2 className="font-semibold text-dark-900 dark:text-white mb-3">
          {isAdmin ? (selectedUserId ? `Entries — ${staff.find((s) => s._id === selectedUserId)?.firstName ?? "Staff"}` : "All Entries") : "My Entries"}
          <span className="ml-2 text-xs font-normal text-dark-400">({periodLabels[period]})</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-dark-100 dark:border-dark-700">
              {isAdmin && <th className="py-2 pr-4 font-medium text-dark-500">Employee</th>}
              <th className="py-2 pr-4 font-medium text-dark-500">Date</th>
              <th className="py-2 pr-4 font-medium text-dark-500">Start</th>
              <th className="py-2 pr-4 font-medium text-dark-500">End</th>
              <th className="py-2 pr-4 font-medium text-dark-500 text-right">Duration</th>
              <th className="py-2 font-medium text-dark-500">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const d = new Date(entry.workDate);
              const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              const fmt12 = (t?: string) => {
                if (!t) return "—";
                const [h, m] = t.split(":").map(Number);
                const p = h < 12 ? "AM" : "PM";
                const h12 = h % 12 === 0 ? 12 : h % 12;
                return `${h12}:${String(m).padStart(2, "0")} ${p}`;
              };
              return (
                <tr key={entry._id} className="border-b border-dark-50 dark:border-dark-700 last:border-0">
                  {isAdmin && (
                    <td className="py-2 pr-4 text-dark-900 dark:text-white">
                      {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "—"}
                    </td>
                  )}
                  <td className="py-2 pr-4 text-dark-600 dark:text-dark-300 whitespace-nowrap">{dateStr}</td>
                  <td className="py-2 pr-4 text-dark-600 dark:text-dark-300 whitespace-nowrap">{fmt12(entry.startTime)}</td>
                  <td className="py-2 pr-4 text-dark-600 dark:text-dark-300 whitespace-nowrap">{fmt12(entry.endTime)}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-dark-900 dark:text-white whitespace-nowrap">
                    {formatDuration(Number(entry.hours))}
                  </td>
                  <td className="py-2 text-dark-400">{entry.notes || "—"}</td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td className="py-4 text-dark-400 text-center" colSpan={isAdmin ? 6 : 5}>
                  No entries for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
