//src/app/api/auth/logout/route.js

import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";
import { authCookieOptions } from "@/lib/auth";
import { optionsResponse } from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// POST /api/auth/logout - clears the auth cookie
export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out" },
    { status: 200, headers: corsHeaders },
  );
  response.cookies.set("token", "", authCookieOptions(0));
  return response;
}
