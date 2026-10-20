import jwt from "jsonwebtoken";
import {
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./constant";
import { errorResponse } from "./utils";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export function signJWT(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_MAX_AGE_SECONDS },
  );
}

export function verifyJWT(req) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.log(err);
    return null;
  }
}

// Cookie options. In production the frontend and backend live on different
// domains, so the cookie must be SameSite=None; Secure to be sent cross-site.
export function authCookieOptions(maxAge = TOKEN_MAX_AGE_SECONDS) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge,
  };
}

/**
 * Reads the authenticated user that proxy.js attached to the request.
 * Returns null if the request did not pass through the proxy.
 */
export function getAuthUser(req) {
  const id = req.headers.get(X_HEADER_USER_ID);
  const role = req.headers.get(X_HEADER_USER_ROLE);
  if (!id || !role) return null;
  return {
    id,
    role,
    email: req.headers.get(X_HEADER_USER_EMAIL),
    username: req.headers.get(X_HEADER_USER_NAME),
  };
}

/**
 * Authorization guard used inside every handler (the proxy only authenticates).
 * Returns { user } on success or { error: Response } to be returned directly.
 */
export function requireRole(req, role) {
  const user = getAuthUser(req);
  if (!user) return { error: errorResponse("Unauthorized Request", 401) };
  if (role && user.role !== role) {
    return { error: errorResponse(`Forbidden: ${role} role required`, 403) };
  }
  return { user };
}
