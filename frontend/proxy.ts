import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Get the token from the cookies
  // We use "session_token" (HttpOnly) for server side checks if available,
  // or "auth_token_public" if that's what we set.
  // In actions.ts, we set both "session_token" (HttpOnly) and "auth_token_public".
  // Proxy can access HttpOnly cookies.
  const token = request.cookies.get("session_token")?.value;

  // Define paths that are protected
  const protectedPaths = ["/dashboard"];

  // Check if the current path is protected
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !token) {
    // If trying to access protected route without token, redirect to login
    const loginUrl = new URL("/login", request.url);
    // loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If we have a token and try to access auth pages, redirect to dashboard
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // To prevent the RSC Payload JSON cache issue on Digital Ocean:
  // Let the request pass through but ensure proxy correctly configures cache headers
  const response = NextResponse.next();

  // Set headers to explicitly prevent CDN (DigitalOcean App Platform) from caching flight payloads
  response.headers.set("x-middleware-cache", "no-cache");

  // If navigating to login page or dashboard directly, do not cache at all.
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0",
  );

  // Ensure we Vary by the RSC specific headers so that even if a CDN caches it,
  // it differentiates between an RSC request and a regular document request.
  response.headers.append(
    "Vary",
    "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url",
  );

  return response;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/login", "/signup"],
};
