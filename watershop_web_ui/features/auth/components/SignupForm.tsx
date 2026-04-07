"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { signupAction } from "../actions";

export function SignupForm() {
  const [state, action, isPending] = useActionState(signupAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-white dark:bg-white rounded-4xl p-10 shadow-2xl space-y-6">
      <div className="text-center">
        <div className="relative w-40 h-10 mx-auto mb-4">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" />
        </div>
        <h1 className="text-xl font-bold text-dark-900 dark:text-dark-900">Create New Account</h1>
      </div>

      <form action={action} className="space-y-4">
        {state?.message && (
            <p className="text-red-500 dark:text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-50/10 p-2 rounded-lg">
                {state.message}
            </p>
        )}
        {/* Name Fields (2 Columns) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs dark:text-dark-900">First Name</Label>
            <Input name="firstName" placeholder="First Name..." className="h-10 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400" />
            {state?.errors?.firstName && (
              <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.firstName}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs dark:text-dark-900">Last Name</Label>
            <Input name="lastName" placeholder="Last Name..." className="h-10 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400" />
            {state?.errors?.lastName && (
              <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs dark:text-dark-900">Mobile Number</Label>
            <Input name="mobile" placeholder="01xxxxxxxxx" className="h-10 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400" />
            {state?.errors?.mobile && (
              <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.mobile}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs dark:text-dark-900">Username</Label>
            <Input name="username" placeholder="Username..." className="h-10 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400" autoComplete="off" />
            {state?.errors?.username && (
              <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.username}</p>
            )}
          </div>
        </div>

        {/* Passwords */}
        <div className="space-y-1">
          <Label className="text-xs dark:text-dark-900">Password</Label>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              className="h-10 pr-8 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2.5 text-dark-400 dark:text-dark-400"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {state?.errors?.password && (
            <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.password}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs dark:text-dark-900">Confirm Password</Label>
          <Input name="confirmPassword" type="password" className="h-10 dark:border-dark-200 dark:bg-white dark:text-dark-900 dark:placeholder:text-dark-400" />
          {state?.errors?.confirmPassword && (
            <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.confirmPassword}</p>
          )}
        </div>

        {/* Role Selection */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-medium dark:text-dark-900">Select Role</Label>
          <RadioGroup defaultValue="staff" name="role" className="flex gap-4">
            <Label
              htmlFor="staff"
              className="flex items-center space-x-2 border border-dark-200 dark:border-dark-200 p-3 rounded-xl w-full hover:bg-dark-100 dark:hover:bg-dark-100 cursor-pointer dark:text-dark-900"
            >
              <RadioGroupItem value="staff" id="staff" className="dark:bg-white dark:border-dark-300" />
              <span className="font-normal">Staff</span>
            </Label>
            <Label
              htmlFor="admin"
              className="flex items-center space-x-2 border border-dark-200 dark:border-dark-200 p-3 rounded-xl w-full hover:bg-dark-100 dark:hover:bg-dark-100 cursor-pointer dark:text-dark-900"
            >
              <RadioGroupItem value="admin" id="admin" className="dark:bg-white dark:border-dark-300" />
              <span className="font-normal">Admin</span>
            </Label>
          </RadioGroup>
          {state?.errors?.role && <p className="text-red-500 dark:text-red-500 text-[10px]">{state.errors.role}</p>}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 dark:text-white mt-2"
        >
          {isPending ? <Loader2 className="animate-spin" /> : "Create Account"}
        </Button>
      </form>

      <div className="text-center text-sm text-dark-500 dark:text-dark-500 pb-2">
        Already have an account?{" "}
        <Link href="/login" className="text-primary-500 dark:text-primary-500 font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
