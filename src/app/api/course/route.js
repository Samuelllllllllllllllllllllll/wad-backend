//src/app/api/course/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import { ROLE_TEACHER, COURSE_STATUS_CANCEL } from "@/lib/constant";
import { serializeCourse, validateCourseInput } from "@/lib/course";
import {
  errorResponse,
  escapeRegex,
  optionsResponse,
  printExceptionLog,
  readJson,
  successResponse,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

/**
 * GET /api/course
 *  Teacher: only the teacher's own courses.
 *  Student: every course except Cancel.
 *    ?search=text  -> partial match on course name OR teacher name
 *    ?enrolled=true -> only the courses the student is enrolled in
 */
export async function GET(req) {
  const { user, error } = requireRole(req);
  if (error) return error;

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const filter = {};

    if (user.role === ROLE_TEACHER) {
      filter.teacherId = new ObjectId(user.id);
    } else if (searchParams.get("enrolled") === "true") {
      filter.students = new ObjectId(user.id);
    } else {
      filter.status = { $ne: COURSE_STATUS_CANCEL };
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: regex }, { teacherName: regex }];
    }

    const courses = await db
      .collection("courses")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return successResponse(
      courses.map((c) => serializeCourse(c, user)),
      200,
    );
  } catch (err) {
    printExceptionLog("GET /api/course", err);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/course - Teachers only
export async function POST(req) {
  const { user, error } = requireRole(req, ROLE_TEACHER);
  if (error) return error;

  try {
    const body = await readJson(req);
    const { value, error: validationError } = validateCourseInput(body);
    if (validationError) return errorResponse(validationError, 400);

    const now = new Date();
    const course = {
      ...value,
      teacherId: new ObjectId(user.id),
      teacherName: user.username,
      students: [],
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection("courses").insertOne(course);

    return successResponse(
      serializeCourse({ ...course, _id: result.insertedId }, user, []),
      201,
    );
  } catch (err) {
    printExceptionLog("POST /api/course", err);
    return errorResponse("Internal server error", 500);
  }
}
