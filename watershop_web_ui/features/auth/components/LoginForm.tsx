"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-white dark:bg-white rounded-4xl p-10 shadow-2xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative w-48 h-12 mx-auto">
          <Image src="/logo.png" alt="Water Shop Logo" fill className="object-contain" priority />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-900">Welcome to Water Shop POS</h1>
          <p className="text-dark-500 dark:text-dark-500 text-sm">Please sign in to your account</p>
        </div>
      </div>

      {/* Form */}
      <form action={action} className="space-y-6">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-dark-600 dark:text-dark-600 font-medium">
            Username
          </Label>
          <Input
            id="username"
            name="username"
            placeholder="Enter Username"
            className="h-12 border-dark-200 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400"
          />
          {state?.errors?.username && (
            <p className="text-red-500 dark:text-red-500 text-xs">{state.errors.username}</p>
          )}
        </div>
        {state?.message && (
            <p className="text-red-500 dark:text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-50/10 p-2 rounded-lg">
                {state.message}
            </p>
        )}

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-dark-600 dark:text-dark-600 font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              className="h-12 border-dark-200 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-dark-400 dark:text-dark-400 hover:text-dark-600 dark:hover:text-dark-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {state?.errors?.password && (
            <p className="text-red-500 dark:text-red-500 text-xs">{state.errors.password}</p>
          )}
        </div>

        {/* Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              name="remember"
              className="border-dark-300 dark:border-dark-300 dark:bg-white data-[state=checked]:bg-primary-500 dark:data-[state=checked]:bg-primary-500"
            />
            <Label htmlFor="remember" className="text-sm text-dark-600 dark:text-dark-600 cursor-pointer">
              Remember me
            </Label>
          </div>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary-500 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-600"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-12 text-base font-semibold bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20 dark:bg-primary-500 dark:hover:bg-primary-600 dark:text-white"
        >
          {isPending ? <Loader2 className="animate-spin" /> : "Sign In"}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center text-sm text-dark-500 dark:text-dark-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary-500 dark:text-primary-500 font-medium hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
