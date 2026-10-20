//src/app/api/course/[course_id]/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import { ROLE_TEACHER, COURSE_STATUS_CANCEL } from "@/lib/constant";
import { serializeCourse, validateCourseInput } from "@/lib/course";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  readJson,
  successResponse,
  toObjectId,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// GET /api/course/:course_id
//  Teacher: own course only, including the enrolled students.
//  Student: any non-Cancel course (or a Cancel course they are enrolled in).
export async function GET(req, { params }) {
  const { user, error } = requireRole(req);
  if (error) return error;

  const { course_id } = await params;
  const courseId = toObjectId(course_id);
  if (!courseId) return errorResponse("Invalid course id", 400);

  try {
    const db = await getDb();
    const course = await db.collection("courses").findOne({ _id: courseId });
    if (!course) return errorResponse("Course not found", 404);

    if (user.role === ROLE_TEACHER) {
      if (course.teacherId.toString() !== user.id) {
        return errorResponse("Forbidden: this is not your course", 403);
      }
      const students = course.students?.length
        ? await db
            .collection("users")
            .find(
              { _id: { $in: course.students } },
              { projection: { username: 1, email: 1 } },
            )
            .toArray()
        : [];
      return successResponse(serializeCourse(course, user, students), 200);
    }

    const me = new ObjectId(user.id);
    const isEnrolled = (course.students || []).some((s) => s.equals(me));
    if (course.status === COURSE_STATUS_CANCEL && !isEnrolled) {
      return errorResponse("Course not found", 404);
    }
    return successResponse(serializeCourse(course, user), 200);
  } catch (err) {
    printExceptionLog("GET /api/course/[course_id]", err);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/course/:course_id - owning Teacher only
export async function PUT(req, { params }) {
  const { user, error } = requireRole(req, ROLE_TEACHER);
  if (error) return error;

  const { course_id } = await params;
  const courseId = toObjectId(course_id);
  if (!courseId) return errorResponse("Invalid course id", 400);

  try {
    const body = await readJson(req);
    const { value, error: validationError } = validateCourseInput(body, {
      partialStatusDefault: false,
    });
    if (validationError) return errorResponse(validationError, 400);

    const db = await getDb();
    const courses = db.collection("courses");
    const existing = await courses.findOne({ _id: courseId });
    if (!existing) return errorResponse("Course not found", 404);
    if (existing.teacherId.toString() !== user.id) {
      return errorResponse("Forbidden: this is not your course", 403);
    }

    const enrolled = (existing.students || []).length;
    if (value.maxStudent < enrolled) {
      return errorResponse(
        `Max Student cannot be lower than the ${enrolled} student(s) already enrolled`,
        409,
      );
    }

    // The index check keeps the rule true even if a student enrolls concurrently:
    // `students.<newMax>` not existing means at most newMax students are enrolled.
    const result = await courses.findOneAndUpdate(
      {
        _id: courseId,
        teacherId: new ObjectId(user.id),
        [`students.${value.maxStudent}`]: { $exists: false },
      },
      { $set: { ...value, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) {
      return errorResponse(
        "Max Student cannot be lower than the number of enrolled students",
        409,
      );
    }

    const students = result.students?.length
      ? await db
          .collection("users")
          .find(
            { _id: { $in: result.students } },
            { projection: { username: 1, email: 1 } },
          )
          .toArray()
      : [];
    return successResponse(serializeCourse(result, user, students), 200);
  } catch (err) {
    printExceptionLog("PUT /api/course/[course_id]", err);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/course/:course_id - owning Teacher only, and only with 0 students
export async function DELETE(req, { params }) {
  const { user, error } = requireRole(req, ROLE_TEACHER);
  if (error) return error;

  const { course_id } = await params;
  const courseId = toObjectId(course_id);
  if (!courseId) return errorResponse("Invalid course id", 400);

  try {
    const db = await getDb();
    const courses = db.collection("courses");

    // Ownership + "no students" are checked in the delete itself (atomic).
    const result = await courses.deleteOne({
      _id: courseId,
      teacherId: new ObjectId(user.id),
      "students.0": { $exists: false },
    });
    if (result.deletedCount === 1) {
      return successResponse({ message: "Course deleted" }, 200);
    }

    // Nothing deleted: work out why so the client gets a precise answer.
    const course = await courses.findOne({ _id: courseId });
    if (!course) return errorResponse("Course not found", 404);
    if (course.teacherId.toString() !== user.id) {
      return errorResponse("Forbidden: this is not your course", 403);
    }
    return errorResponse(
      "Cannot delete a course that already has enrolled students",
      409,
    );
  } catch (err) {
    printExceptionLog("DELETE /api/course/[course_id]", err);
    return errorResponse("Internal server error", 500);
  }
}
