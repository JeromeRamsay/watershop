"use client";

import { useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Loader2, ShieldCheck, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/lib/queries";

interface UserInfo {
  id?: string;
  name?: string;
  role?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const payload =
    typeof error === "object" && error !== null
      ? (error as {
          response?: { data?: { message?: string | string[] } };
          message?: string;
        })
      : undefined;

  const responseMessage = payload?.response?.data?.message;
  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return responseMessage.join(", ");
  }
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
};

export default function ProfilePage() {
  const userInfo = useMemo<UserInfo>(() => {
    try {
      return JSON.parse(Cookies.get("user_info") || "{}") as UserInfo;
    } catch {
      return {};
    }
  }, []);

  const changePasswordMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    try {
      const result = await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      setSuccessMessage(result?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Failed to update your password."),
      );
    }
  };

  const roleLabel = userInfo.role
    ? userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)
    : "Employee";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-dark-900 dark:text-white">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
          Update your account password for the Woodstocks Watershop employee app.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <Card className="border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-dark-900 dark:text-white">
              <UserCircle2 className="h-5 w-5 text-primary-500" />
              Account Summary
            </CardTitle>
            <CardDescription>
              Your signed-in employee account details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-dark-500 dark:text-dark-400">Name</p>
              <p className="font-medium text-dark-900 dark:text-white">
                {userInfo.name || "Unknown User"}
              </p>
            </div>
            <div>
              <p className="text-dark-500 dark:text-dark-400">Role</p>
              <p className="font-medium text-dark-900 dark:text-white">
                {roleLabel}
              </p>
            </div>
            <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-3 text-sm text-dark-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-dark-200">
              Password updates require your current password and will apply immediately to future logins.
            </div>
          </CardContent>
        </Card>

        <Card className="border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-dark-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Update Password
            </CardTitle>
            <CardDescription>
              Enter your current password and choose a new one with at least 6 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}
              {successMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  className="h-11"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
