//src/app/api/user/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// GET /api/user - the currently authenticated user (used to restore a session)
export async function GET(req) {
  const { user: auth, error } = requireRole(req);
  if (error) return error;

  try {
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(auth.id) }, { projection: { password: 0 } });
    if (!user) return errorResponse("User no longer exists", 401);

    return successResponse(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      200,
    );
  } catch (err) {
    printExceptionLog("GET /api/user", err);
    return errorResponse("Internal server error", 500);
  }
}
