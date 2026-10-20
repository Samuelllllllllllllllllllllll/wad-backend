//src/app/api/auth/login/route.js

import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";
import { getDb } from "@/lib/mongodb";
import { authCookieOptions, signJWT } from "@/lib/auth";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  readJson,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// POST /api/auth/login  { identifier | email | username, password }
export async function POST(req) {
  try {
    const body = await readJson(req);
    const identifier = String(
      body?.identifier ?? body?.email ?? body?.username ?? "",
    ).trim();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return errorResponse("Email/username and password are required", 400);
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    });

    // Same message for unknown user and wrong password (no user enumeration)
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) {
      return errorResponse("Invalid email/username or password", 401);
    }

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200, headers: corsHeaders },
    );
    response.cookies.set("token", signJWT(user), authCookieOptions());
    return response;
  } catch (error) {
    printExceptionLog("POST /api/auth/login", error);
    return errorResponse("Internal server error", 500);
  }
}
