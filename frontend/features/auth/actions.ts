"use server";

import { loginSchema, signupSchema } from "./schemas";
import { cookies, headers } from "next/headers"; // We need this to store the session
import { redirect } from "next/navigation";
import { resolveServerApiUrl } from "@/lib/runtime-api-url";

// Define the shape of your Node.js Backend Response
type ApiResponse = {
  success: boolean;
  message?: string;
  token?: string; // The JWT from your backend
  user?: unknown;
  errors?: Record<string, string[]>;
};

export type AuthState = {
  message?: string;
  errors?: Record<string, string[]>;
} | null;

async function getApiUrl() {
  const requestHeaders = await headers();
  return resolveServerApiUrl(requestHeaders.get("host"));
}

export async function loginAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const data = Object.fromEntries(formData);

  // 1. Validate Input (Client Side Logic)
  const validated = loginSchema.safeParse(data);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  try {
    const apiUrl = await getApiUrl();

    // 2. Call your separate Node.js Backend
    const res = await fetch(`${apiUrl}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated.data),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await res.json();

    if (!res.ok) {
      return { message: result.message || "Invalid credentials" };
    }

    // 3. Store the Token securely in Next.js (HTTP Only Cookie)
    // This is safer than storing it in LocalStorage on the client
    if (result.access_token) {
      // Await the cookies() call
      const cookieStore = await cookies();
      
      // HttpOnly cookie for Next.js Middleware / Server Actions
      cookieStore.set("session_token", result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      // Public cookie for Client Axios requests (accessible by JS)
      cookieStore.set("auth_token_public", result.access_token, {
        httpOnly: false, // Make it accessible to client JS
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      // Store user info for client display
      if (result.user) {
        cookieStore.set("user_info", JSON.stringify(result.user), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });
      }
    }
  } catch (err) {
    return { message: "Failed to connect to the server. Please try again." };
  }

  // 4. Redirect on success
  redirect("/dashboard");
}

export async function signupAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const data = Object.fromEntries(formData);
  const validated = signupSchema.safeParse(data);

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  try {
    const apiUrl = await getApiUrl();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, mobile, ...signupPayload } = validated.data;

    // Call Node.js Backend for Signup
    const res = await fetch(`${apiUrl}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupPayload),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await res.json();

    if (!res.ok) {
      // If your backend returns validation errors, map them here
      return { message: result.message || "Signup failed" };
    }
  } catch (err) {
    return { message: "Failed to connect to the server." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  cookieStore.delete("auth_token_public");
  cookieStore.delete("user_info");
  
  redirect("/login");
}
