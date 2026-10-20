//src/app/api/user/[user_id]/route.js

import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
  toObjectId,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// GET /api/user/:user_id - users may only read their own profile
export async function GET(req, { params }) {
  const { user: auth, error } = requireRole(req);
  if (error) return error;

  const { user_id } = await params;
  const id = toObjectId(user_id);
  if (!id) return errorResponse("Invalid user id", 400);
  if (auth.id !== id.toString()) {
    return errorResponse("Forbidden: you can only view your own profile", 403);
  }

  try {
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: id }, { projection: { password: 0 } });
    if (!user) return errorResponse("User not found", 404);

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
    printExceptionLog("GET /api/user/[user_id]", err);
    return errorResponse("Internal server error", 500);
  }
}
