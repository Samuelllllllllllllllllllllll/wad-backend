// src/lib/course.js
// Shared validation + serialization helpers for course endpoints.

import { ObjectId } from "mongodb";
import {
  COURSE_STATUSES,
  COURSE_STATUS_OPEN,
  ROLE_TEACHER,
} from "./constant";

/**
 * Validates and normalizes a course payload.
 * Returns { value } or { error: "message" }.
 */
export function validateCourseInput(body, { partialStatusDefault = true } = {}) {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Course name is required" };

  const duration = Number(body.duration);
  if (!Number.isInteger(duration) || duration < 1) {
    return { error: "Duration (days) must be a whole number of at least 1" };
  }

  let topics = body.topics;
  if (typeof topics === "string") topics = topics.split(",");
  if (!Array.isArray(topics)) {
    return { error: "Topics must be a list of at least one topic" };
  }
  topics = topics
    .filter((t) => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean);
  if (topics.length === 0) {
    return { error: "At least one topic is required" };
  }

  const price = Number(body.price);
  if (body.price === "" || body.price === null || !Number.isFinite(price) || price < 0) {
    return { error: "Price must be a number of 0 or more" };
  }

  const maxStudent = Number(body.maxStudent);
  if (!Number.isInteger(maxStudent) || maxStudent < 1) {
    return { error: "Max Student must be a whole number of at least 1" };
  }

  let status = body.status;
  if (status === undefined || status === null || status === "") {
    if (!partialStatusDefault) return { error: "Status is required" };
    status = COURSE_STATUS_OPEN;
  }
  if (!COURSE_STATUSES.includes(status)) {
    return { error: `Status must be one of: ${COURSE_STATUSES.join(", ")}` };
  }

  return { value: { name, duration, topics, price, maxStudent, status } };
}

/**
 * Serializes a course document for a given viewer.
 * - Teachers who own the course receive the enrolled `students` list.
 * - Students never receive other students' data, only counts + their own flag.
 */
export function serializeCourse(course, viewer, enrolledStudents) {
  const students = course.students || [];
  const dto = {
    _id: course._id.toString(),
    name: course.name,
    duration: course.duration,
    topics: course.topics,
    price: course.price,
    maxStudent: course.maxStudent,
    status: course.status,
    teacherId: course.teacherId.toString(),
    teacherName: course.teacherName,
    enrolledCount: students.length,
    availableSeats: Math.max(course.maxStudent - students.length, 0),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };

  if (viewer.role === ROLE_TEACHER) {
    if (enrolledStudents) {
      dto.students = enrolledStudents.map((s) => ({
        _id: s._id.toString(),
        username: s.username,
        email: s.email,
      }));
    }
  } else {
    const me = new ObjectId(viewer.id);
    dto.isEnrolled = students.some((s) => s.equals(me));
  }
  return dto;
}
