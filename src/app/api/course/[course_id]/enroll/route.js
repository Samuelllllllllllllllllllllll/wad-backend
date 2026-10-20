//src/app/api/course/[course_id]/enroll/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import {
  COURSE_STATUS_CANCEL,
  COURSE_STATUS_OPEN,
  ROLE_STUDENT,
} from "@/lib/constant";
import { serializeCourse } from "@/lib/course";
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

// POST /api/course/:course_id/enroll - Students only
export async function POST(req, { params }) {
  const { user, error } = requireRole(req, ROLE_STUDENT);
  if (error) return error;

  const { course_id } = await params;
  const courseId = toObjectId(course_id);
  if (!courseId) return errorResponse("Invalid course id", 400);

  try {
    const db = await getDb();
    const courses = db.collection("courses");
    const me = new ObjectId(user.id);

    const course = await courses.findOne({ _id: courseId });
    if (!course) return errorResponse("Course not found", 404);

    // One atomic update checks every business rule and adds the student:
    //  - course is Open
    //  - the student is not already enrolled
    //  - seats remain: index (maxStudent - 1) of `students` does not exist,
    //    i.e. fewer than maxStudent students are enrolled
    // maxStudent is pinned in the filter so the seat check always uses the
    // value we just read. Being a single operation, concurrent requests cannot
    // oversell the course or enroll the same student twice.
    const updated = await courses.findOneAndUpdate(
      {
        _id: courseId,
        status: COURSE_STATUS_OPEN,
        maxStudent: course.maxStudent,
        students: { $ne: me },
        [`students.${course.maxStudent - 1}`]: { $exists: false },
      },
      { $push: { students: me }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (updated) {
      return successResponse(
        {
          message: "Enrolled successfully",
          course: serializeCourse(updated, user),
        },
        201,
      );
    }

    // Not enrolled: report the reason.
    const current = await courses.findOne({ _id: courseId });
    if (!current) return errorResponse("Course not found", 404);
    if ((current.students || []).some((s) => s.equals(me))) {
      return errorResponse("You are already enrolled in this course", 409);
    }
    if (current.status === COURSE_STATUS_CANCEL) {
      return errorResponse("Course not found", 404);
    }
    if (current.status !== COURSE_STATUS_OPEN) {
      return errorResponse("This course is closed for enrollment", 409);
    }
    return errorResponse("This course is full", 409);
  } catch (err) {
    printExceptionLog("POST /api/course/[course_id]/enroll", err);
    return errorResponse("Internal server error", 500);
  }
}
