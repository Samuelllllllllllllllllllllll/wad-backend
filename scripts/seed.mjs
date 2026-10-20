// scripts/seed.mjs
// Seeds test users (3 Teachers + 3 Students) and a few sample courses.
// Safe to run repeatedly (upserts). Usage:
//   npm run seed          (reads MONGODB_URI / MONGODB_DB from .env.local)
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Put it in .env.local first.");
  process.exit(1);
}

export const TEST_PASSWORD = "Password123!";

const users = [
  { username: "teacher1", email: "teacher1@example.com", role: "Teacher" },
  { username: "teacher2", email: "teacher2@example.com", role: "Teacher" },
  { username: "teacher3", email: "teacher3@example.com", role: "Teacher" },
  { username: "student1", email: "student1@example.com", role: "Student" },
  { username: "student2", email: "student2@example.com", role: "Student" },
  { username: "student3", email: "student3@example.com", role: "Student" },
];

const courses = [
  { teacher: "teacher1", name: "Intro to Web Development", duration: 30, topics: ["HTML", "CSS", "JavaScript"], price: 1500, maxStudent: 30, status: "Open" },
  { teacher: "teacher1", name: "Advanced React", duration: 45, topics: ["Hooks", "Context", "Routing"], price: 2500, maxStudent: 2, status: "Open" },
  { teacher: "teacher1", name: "Legacy jQuery Workshop", duration: 10, topics: ["jQuery", "AJAX"], price: 500, maxStudent: 20, status: "Cancel" },
  { teacher: "teacher2", name: "Database Design with MongoDB", duration: 21, topics: ["Documents", "Indexes", "Aggregation"], price: 2000, maxStudent: 25, status: "Open" },
  { teacher: "teacher2", name: "Node.js Fundamentals", duration: 28, topics: ["Modules", "Express", "REST"], price: 1800, maxStudent: 20, status: "Close" },
  { teacher: "teacher3", name: "UX Design Basics", duration: 14, topics: ["Wireframes", "Prototyping", "Usability"], price: 1200, maxStudent: 15, status: "Open" },
];

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "online_course");
  const usersCol = db.collection("users");
  const coursesCol = db.collection("courses");

  await usersCol.createIndex({ email: 1 }, { unique: true });
  await usersCol.createIndex({ username: 1 }, { unique: true });
  await coursesCol.createIndex({ teacherId: 1 });
  await coursesCol.createIndex({ students: 1 });

  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  const ids = {};
  for (const u of users) {
    const r = await usersCol.findOneAndUpdate(
      { email: u.email },
      { $set: { ...u, password: hash }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    ids[u.username] = r._id;
  }

  for (const c of courses) {
    const { teacher, ...fields } = c;
    await coursesCol.updateOne(
      { name: c.name, teacherId: ids[teacher] },
      {
        $set: { ...fields, teacherId: ids[teacher], teacherName: teacher, updatedAt: new Date() },
        $setOnInsert: { students: [], createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  console.log(`Seeded ${users.length} users and ${courses.length} courses.`);
  console.log(`All test users share the password: ${TEST_PASSWORD}`);
} finally {
  await client.close();
}
