import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/login", new URL(request.url).origin);
  const response = NextResponse.redirect(url);

  response.cookies.set("session_token", "", { httpOnly: true, maxAge: 0, path: "/" });
  response.cookies.set("auth_token_public", "", { httpOnly: false, maxAge: 0, path: "/" });
  response.cookies.set("user_info", "", { httpOnly: false, maxAge: 0, path: "/" });

  return response;
}
