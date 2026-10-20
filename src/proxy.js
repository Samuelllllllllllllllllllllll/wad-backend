import { NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";
import corsHeaders from "./lib/cors";
import {
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./lib/constant";

export function proxy(request) {
  // CORS preflight carries no cookie, so answer it before authenticating.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const user = verifyJWT(request);

  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized Request",
      },
      {
        status: 401,
        headers: corsHeaders,
      },
    );
  }

  // `set` overwrites anything a client may have sent with the same names,
  // so these headers can be trusted by the route handlers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(X_HEADER_USER_ID, user.id);
  requestHeaders.set(X_HEADER_USER_EMAIL, user.email);
  requestHeaders.set(X_HEADER_USER_NAME, user.username);
  requestHeaders.set(X_HEADER_USER_ROLE, user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Every protected API. /api/auth/login and /api/auth/logout stay public.
export const config = {
  matcher: ["/api/user/:path*", "/api/course/:path*"],
};
