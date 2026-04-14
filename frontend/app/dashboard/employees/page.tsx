"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Loader2, Pencil, Trash2, UserX, UserCheck } from "lucide-react";
import api, { type WatershopApiRequestConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
import { getErrorMessage } from "@/lib/error-utils";

interface StaffUser {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: "admin" | "staff";
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
}

interface HourSummary {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  totalHours: number;
  entries: number;
  daysWorked: number;
}

const HANDLED_REQUEST_CONFIG: WatershopApiRequestConfig = {
  watershopHandledError: true,
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function EmployeesPage() {
  const [role, setRole] = useState("staff");
  const [currentUserId, setCurrentUserId] = useState("");
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [activity, setActivity] = useState<StaffUser[]>([]);
  const [summary, setSummary] = useState<HourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
  });

  const [editData, setEditData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
  });

  const [hoursData, setHoursData] = useState({
    userId: "",
    workDate: new Date().toISOString().split("T")[0],
    hours: "",
    notes: "",
  });

  const weekRange = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setErrorMessage("");
      }
      const [usersRes, activityRes, summaryRes] = await Promise.all([
        api.get<StaffUser[]>(
          "/users/staff?includeInactive=true",
          HANDLED_REQUEST_CONFIG,
        ),
        api.get<StaffUser[]>(
          "/users/login-activity?limit=20",
          HANDLED_REQUEST_CONFIG,
        ),
        api.get<HourSummary[]>(
          `/employee-hours/summary?from=${weekRange.from}&to=${weekRange.to}`,
          HANDLED_REQUEST_CONFIG,
        ),
      ]);

      setUsers(usersRes.data || []);
      setActivity((activityRes.data || []).filter((u) => u.role === "staff"));
      setSummary(summaryRes.data || []);
    } catch (error) {
      if (!silent) {
        setErrorMessage(
          getErrorMessage(error, "Failed loading employees page data."),
        );
        setSuccessMessage("");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [weekRange.from, weekRange.to]);

  useEffect(() => {
    const userInfo = Cookies.get("user_info");
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        setRole(parsed.role || "staff");
        setCurrentUserId(parsed.id || "");
      } catch {
        setRole("staff");
      }
    }
    fetchData();
  }, [fetchData]);

  useDashboardRealtime(() => {
    fetchData(true);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.password) {
      setErrorMessage("First name, last name, username, and password are required.");
      setSuccessMessage("");
      return;
    }

    if (formData.password.trim().length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      setSuccessMessage("");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      await api.post("/users/staff", {
        ...formData,
        role: "staff",
        isActive: true,
      }, HANDLED_REQUEST_CONFIG);
      setFormData({ firstName: "", lastName: "", username: "", password: "" });
      setSuccessMessage("Staff account created successfully.");
      fetchData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create user."));
      setSuccessMessage("");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editData.id) return;

    if (!editData.firstName || !editData.lastName || !editData.username) {
      setErrorMessage("First name, last name, and username are required.");
      setSuccessMessage("");
      return;
    }

    if (editData.password && editData.password.trim().length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      setSuccessMessage("");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      await api.patch(`/users/${editData.id}`, {
        firstName: editData.firstName,
        lastName: editData.lastName,
        username: editData.username,
        ...(editData.password ? { password: editData.password } : {}),
      }, HANDLED_REQUEST_CONFIG);
      setEditData({ id: "", firstName: "", lastName: "", username: "", password: "" });
      setSelectedUserId("");
      setSuccessMessage("Staff account updated successfully.");
      fetchData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to update staff account."));
      setSuccessMessage("");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: StaffUser) => {
    try {
      setSaving(true);
      setErrorMessage("");
      await api.patch(
        `/users/${user._id}/${user.isActive ? "deactivate" : "activate"}`,
        undefined,
        HANDLED_REQUEST_CONFIG,
      );
      setSuccessMessage(
        user.isActive
          ? "Staff account deactivated successfully."
          : "Staff account activated successfully.",
      );
      fetchData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to update account status."));
      setSuccessMessage("");
    } finally {
      setSaving(false);
    }
  };

  const archiveUser = async (user: StaffUser) => {
    const confirmed = window.confirm(
      `Permanently remove ${user.firstName} ${user.lastName} from Staff Accounts? Historical records will be kept and the account will no longer be able to log in.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      await api.patch(
        `/users/${user._id}/archive`,
        undefined,
        HANDLED_REQUEST_CONFIG,
      );
      if (selectedUserId === user._id) {
        setSelectedUserId("");
        setEditData({ id: "", firstName: "", lastName: "", username: "", password: "" });
      }
      setSuccessMessage("Staff account archived successfully.");
      fetchData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Failed to permanently delete staff account."),
      );
      setSuccessMessage("");
    } finally {
      setSaving(false);
    }
  };

  const submitHours = async (e: FormEvent) => {
    e.preventDefault();
    if (!hoursData.userId || !hoursData.workDate || !hoursData.hours) {
      setErrorMessage("Staff member, work date, and hours are required.");
      setSuccessMessage("");
      return;
    }

    const parsedHours = Number(hoursData.hours);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setErrorMessage("Hours must be greater than 0 and no more than 24.");
      setSuccessMessage("");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      await api.post("/employee-hours", {
        userId: hoursData.userId,
        workDate: new Date(hoursData.workDate).toISOString(),
        hours: parsedHours,
        notes: hoursData.notes,
        createdBy: currentUserId || undefined,
      }, HANDLED_REQUEST_CONFIG);
      setHoursData((prev) => ({ ...prev, hours: "", notes: "" }));
      setSuccessMessage("Staff hours saved successfully.");
      fetchData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to submit staff hours."));
      setSuccessMessage("");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="p-6 bg-white rounded-xl border border-dark-200">
        <h1 className="text-xl font-semibold">Employee Management</h1>
        <p className="mt-2 text-sm text-dark-500">Only admins can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <h1 className="text-2xl font-bold">Employee Management</h1>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={createUser} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold">Create Staff Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="First name" value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} />
            <Input placeholder="Last name" value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} />
            <Input placeholder="Username" value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} />
            <Input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <Button disabled={saving} type="submit">Create Account</Button>
        </form>

        <form onSubmit={submitHours} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold">Enter Hours for Staff</h2>
          <select
            className="w-full border rounded-md h-10 px-3 bg-transparent"
            value={hoursData.userId}
            onChange={(e) => setHoursData((p) => ({ ...p, userId: e.target.value }))}
          >
            <option value="">Select staff</option>
            {users.filter((u) => u.role === "staff").map((u) => (
              <option key={u._id} value={u._id}>{`${u.firstName} ${u.lastName}`}</option>
            ))}
          </select>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="date" value={hoursData.workDate} onChange={(e) => setHoursData((p) => ({ ...p, workDate: e.target.value }))} />
            <Input type="number" step="0.25" min="0" max="24" placeholder="Hours" value={hoursData.hours} onChange={(e) => setHoursData((p) => ({ ...p, hours: e.target.value }))} />
          </div>
          <Input placeholder="Notes (optional)" value={hoursData.notes} onChange={(e) => setHoursData((p) => ({ ...p, notes: e.target.value }))} />
          <Button disabled={saving} type="submit">Save Hours</Button>
        </form>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Staff Accounts</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Name</th>
              <th className="py-2">Username</th>
              <th className="py-2">Status</th>
              <th className="py-2">Created</th>
              <th className="py-2">Last login</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.filter((u) => u.role === "staff").map((user) => (
              <tr key={user._id} className="border-b last:border-0">
                <td className="py-2">{user.firstName} {user.lastName}</td>
                <td className="py-2">{user.username}</td>
                <td className="py-2">{user.isActive ? "Active" : "Inactive"}</td>
                <td className="py-2">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                <td className="py-2">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                <td className="py-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUserId(user._id);
                      setEditData({
                        id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        password: "",
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(user)}>
                    {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving || user._id === currentUserId}
                    onClick={() => archiveUser(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUserId ? (
        <form onSubmit={saveEdit} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold">Edit Staff Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={editData.firstName} onChange={(e) => setEditData((p) => ({ ...p, firstName: e.target.value }))} />
            <Input value={editData.lastName} onChange={(e) => setEditData((p) => ({ ...p, lastName: e.target.value }))} />
            <Input value={editData.username} onChange={(e) => setEditData((p) => ({ ...p, username: e.target.value }))} />
            <Input type="password" placeholder="New password (optional)" value={editData.password} onChange={(e) => setEditData((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button disabled={saving} type="submit">Save Changes</Button>
            <Button type="button" variant="outline" onClick={() => setSelectedUserId("")}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 overflow-x-auto">
          <h2 className="font-semibold mb-3">Staff Login & Account Activity</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Staff</th>
                <th className="py-2">Created</th>
                <th className="py-2">Last Login</th>
                <th className="py-2">Logins</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((item) => (
                <tr key={item._id} className="border-b last:border-0">
                  <td className="py-2">{item.firstName} {item.lastName}</td>
                  <td className="py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td>
                  <td className="py-2">{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td className="py-2">{item.loginCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 overflow-x-auto">
          <h2 className="font-semibold mb-3">This Week Hours by Staff</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Staff</th>
                <th className="py-2">Total Hours</th>
                <th className="py-2">Entries</th>
                <th className="py-2">Days Worked</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item) => (
                <tr key={item.userId} className="border-b last:border-0">
                  <td className="py-2">{item.firstName} {item.lastName}</td>
                  <td className="py-2">{Number(item.totalHours).toFixed(2)}</td>
                  <td className="py-2">{item.entries}</td>
                  <td className="py-2">{item.daysWorked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
