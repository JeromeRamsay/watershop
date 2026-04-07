"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";

interface UserInfo {
  id: string;
  name: string;
  role: "admin" | "staff";
}

interface HourEntry {
  _id: string;
  workDate: string;
  hours: number;
  notes?: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  role?: string;
  isActive?: boolean;
}

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function HoursPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [entries, setEntries] = useState<HourEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [formData, setFormData] = useState({
    workDate: new Date().toISOString().split("T")[0],
    hours: "",
    notes: "",
  });

  const weekTotal = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return entries
      .filter((entry) => {
        const date = new Date(entry.workDate);
        return date >= start && date < end;
      })
      .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  }, [entries]);

  const fetchData = useCallback(async (targetUserId: string, role: string, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      let effectiveUserId = targetUserId;

      if (role === "admin") {
        let staffList: StaffMember[] = [];
        const staffRes = await api.get<StaffMember[]>("/users/staff?includeInactive=true");
        staffList = staffRes.data || [];

        if (staffList.length === 0) {
          // Fallback for legacy data/API mismatch: infer staff from /users list.
          const allUsersRes = await api.get<StaffMember[]>("/users");
          staffList = (allUsersRes.data || []).filter(
            (member) => (member.role || "").toLowerCase() === "staff",
          );
        }

        const activeStaff = staffList.filter(
          (s) => !!s._id && s.isActive !== false,
        );
        setStaff(activeStaff);

        if (
          !effectiveUserId ||
          !activeStaff.some((member) => member._id === effectiveUserId)
        ) {
          effectiveUserId = activeStaff[0]?._id || "";
          setSelectedUserId(effectiveUserId);
        }
      }

      if (!effectiveUserId) {
        setEntries([]);
      } else {
        const entryPath = `/employee-hours?userId=${effectiveUserId}`;
        const entriesRes = await api.get<HourEntry[]>(entryPath);
        setEntries(entriesRes.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch hours data", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const rawUser = Cookies.get("user_info");
    if (!rawUser) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as UserInfo;
      const normalizedRole = (parsed.role || "").toLowerCase() as UserInfo["role"];
      setUser({ ...parsed, role: normalizedRole });
      const initialUserId = normalizedRole === "admin" ? "" : parsed.id;
      setSelectedUserId(initialUserId);
      fetchData(initialUserId, normalizedRole);
    } catch {
      setLoading(false);
    }
  }, [fetchData]);

  useDashboardRealtime(() => {
    if (!user) return;
    const targetUserId = user.role === "admin" ? selectedUserId : user.id;
    fetchData(targetUserId, user.role, true);
  });

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const targetUserId = user.role === "admin" ? selectedUserId : user.id;
      fetchData(targetUserId, user.role, true);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData, selectedUserId, user]);

  const submitHours = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const targetUserId = user.role === "admin" ? selectedUserId : user.id;
    if (!targetUserId || !formData.hours || !formData.workDate) return;

    try {
      setSaving(true);
      await api.post("/employee-hours", {
        userId: targetUserId,
        workDate: new Date(formData.workDate).toISOString(),
        hours: Number(formData.hours),
        notes: formData.notes,
        createdBy: user.id,
      });
      setFormData((prev) => ({ ...prev, hours: "", notes: "" }));
      fetchData(targetUserId, user.role);
    } catch (error) {
      console.error("Failed to submit hours", error);
    } finally {
      setSaving(false);
    }
  };

  const changeSelectedUser = (id: string) => {
    setSelectedUserId(id);
    if (user) {
      fetchData(id, user.role);
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
    <div className="space-y-6 p-2 md:p-4">
      <h1 className="text-2xl font-bold">Employee Hours</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">
            {user?.role === "admin" ? "Enter Hours for Staff" : "Submit Daily Hours"}
          </h2>
          <form onSubmit={submitHours} className="space-y-3">
            {user?.role === "admin" ? (
              <select
                className="w-full border rounded-md h-10 px-3 bg-transparent text-dark-900 dark:text-white"
                value={selectedUserId}
                onChange={(e) => changeSelectedUser(e.target.value)}
              >
                <option value="">Select staff</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>{`${s.firstName} ${s.lastName}`}</option>
                ))}
              </select>
            ) : null}
            {user?.role === "admin" && staff.length === 0 ? (
              <p className="text-xs text-red-500">
                No active staff accounts found. Create/activate staff from Employee Management.
              </p>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input type="date" value={formData.workDate} onChange={(e) => setFormData((p) => ({ ...p, workDate: e.target.value }))} />
              <Input type="number" step="0.25" min="0" max="24" placeholder="Hours worked" value={formData.hours} onChange={(e) => setFormData((p) => ({ ...p, hours: e.target.value }))} />
            </div>
            <Input placeholder="Notes (optional)" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} />
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Hours"}</Button>
          </form>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4">
          <h2 className="font-semibold mb-3">This Week</h2>
          <p className="text-3xl font-bold text-primary-600">{weekTotal.toFixed(2)}h</p>
          <p className="text-sm text-dark-500 mt-1">Based on current visible entries.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Recent Hour Entries</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              {user?.role === "admin" ? <th className="py-2">Employee</th> : null}
              <th className="py-2">Date</th>
              <th className="py-2">Hours</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id} className="border-b last:border-0">
                {user?.role === "admin" ? (
                  <td className="py-2">
                    {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "-"}
                  </td>
                ) : null}
                <td className="py-2">{new Date(entry.workDate).toLocaleDateString()}</td>
                <td className="py-2">{Number(entry.hours).toFixed(2)}</td>
                <td className="py-2">{entry.notes || "-"}</td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td className="py-3 text-dark-500" colSpan={user?.role === "admin" ? 4 : 3}>
                  No entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
