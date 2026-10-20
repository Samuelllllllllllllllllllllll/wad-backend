# How to Test the App

Online Course Service — Next.js backend API + React (Vite) frontend + MongoDB.

## Student Information

- **Student Name:** _<fill in your name>_
- **Student ID:** _<fill in your ID>_

## Links

- **Backend repo:** _<url>_  · **Backend deployed:** _<https://...vercel.app>_
- **Frontend repo:** _<url>_  · **Frontend deployed:** _<https://...vercel.app>_
- **Screen recording:** _<url>_

## Test Credentials

All test users share the same password: **`Password123!`**
You can log in with either the email or the username.

| Role    | Username   | Email                  | Password       |
| ------- | ---------- | ---------------------- | -------------- |
| Teacher | `teacher1` | teacher1@example.com   | `Password123!` |
| Teacher | `teacher2` | teacher2@example.com   | `Password123!` |
| Teacher | `teacher3` | teacher3@example.com   | `Password123!` |
| Student | `student1` | student1@example.com   | `Password123!` |
| Student | `student2` | student2@example.com   | `Password123!` |
| Student | `student3` | student3@example.com   | `Password123!` |

Passwords are stored hashed (bcrypt). The users and a few sample courses (including
one `Close` and one `Cancel` course) are created by the seed script below.

## Prerequisites

- Node.js 20+ and npm
- A MongoDB database (MongoDB Atlas free tier or a local `mongod`)

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

1. `cd next-backend && npm install`
2. Copy `.env.example` to `.env.local` and fill it in:
   - `MONGODB_URI` – your MongoDB connection string
   - `MONGODB_DB` – database name (default `online_course`)
   - `JWT_SECRET` – any long random string
   - `FRONTEND_URL` – origin of the frontend, no trailing slash (local: `http://localhost:5173`)
3. `npm run seed` – creates the 3 teachers, 3 students and sample courses (safe to re-run)
4. `npm run dev` – API runs on <http://localhost:3000>

### 2. Frontend Setup (`react-frontend/`)

1. `cd react-frontend && npm install`
2. Copy `.env.example` to `.env.local`: `VITE_API_URL=http://localhost:3000`
3. `npm run dev` – open <http://localhost:5173>

### 3. Testing Walkthrough

**Authentication**
1. Open the app while logged out → you are redirected to the login page.
2. Log in with a wrong password → an error is shown. Log in with a valid user → you land on `/courses`.
3. Refresh the page → you stay logged in (httpOnly cookie). Click **Logout** → back to login.

**Teacher** (e.g. `teacher1`)
1. **My Courses** lists only this teacher's courses (name, duration, price, enrolled/max, status).
2. **Create Course** – fill name, duration, price, max student, status, and add several topics (type + Enter).
3. Click the eye icon to see course details **and the enrolled students**.
4. Edit a course (pencil icon). Max Student cannot be lowered below the current number of enrolled students.
5. Delete works only when nobody is enrolled (the button is disabled otherwise, and the API answers `409`).
6. Teachers cannot see/edit/delete other teachers' courses (API answers `403`).

**Student** (e.g. `student1`)
1. **All Courses** shows every course except `Cancel` ones (`Close` courses are visible but cannot be enrolled in).
2. Use the search box to filter by part of the **course name** or the **teacher name**.
3. Open **Details**, then **Enroll** on an `Open` course with free seats.
4. Enrolling twice in the same course is rejected; once seats reach *Max Student* the course shows **Full**.
   (Try `Advanced React`, which has only 2 seats: enroll with `student1` and `student2`, then `student3` is refused.)
5. **My Enrollments** lists the courses you are enrolled in.

**Rules enforced by the backend** (not just by hiding buttons)
| Rule | Response |
| ---- | -------- |
| No / invalid / forged login cookie on any protected API | `401` |
| Student calling a Teacher-only API (create / update / delete) | `403` |
| Teacher enrolling in a course | `403` |
| Teacher touching another teacher's course | `403` |
| Enroll in `Close` course / full course / already enrolled | `409` |
| Enroll in or view a `Cancel` course (as a student) | `404` |
| Delete a course that has students | `409` |

Enrollment (status + duplicate + seat limit) is checked and applied in **one atomic MongoDB update**,
so concurrent requests cannot exceed *Max Student* or enroll the same student twice.

## API Summary (`next-backend/`)

| Method | Path | Who | Purpose |
| ------ | ---- | --- | ------- |
| POST | `/api/auth/login` | public | Login (`identifier` = email or username, `password`); sets httpOnly cookie |
| POST | `/api/auth/logout` | public | Clears the cookie |
| GET | `/api/user` | any user | Current user (used to restore the session) |
| GET | `/api/user/:user_id` | self only | Own profile |
| GET | `/api/course` | any user | Teacher: own courses. Student: non-Cancel courses; `?search=` (course/teacher name), `?enrolled=true` |
| POST | `/api/course` | Teacher | Create course |
| GET | `/api/course/:id` | Teacher (owner) / Student | Details (+ enrolled students for the owning teacher) |
| PUT | `/api/course/:id` | Teacher (owner) | Update course |
| DELETE | `/api/course/:id` | Teacher (owner) | Delete course (only with no students) |
| POST | `/api/course/:id/enroll` | Student | Enroll |

Authentication is done in `src/proxy.js` (JWT from the cookie); roles/ownership/business rules are
re-checked inside each route handler.

## Deployment (Vercel)

Deploy the two folders as two separate Vercel projects (set **Root Directory** accordingly, or use two repos).

1. **Backend** (`next-backend`) – environment variables: `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`,
   `FRONTEND_URL` = the deployed frontend URL (e.g. `https://my-frontend.vercel.app`, **no trailing slash**).
   In MongoDB Atlas → Network Access allow `0.0.0.0/0` (Vercel uses dynamic IPs).
2. **Seed the production DB once** from your computer:
   put the production `MONGODB_URI` in `.env.local` and run `npm run seed`.
3. **Frontend** (`react-frontend`, framework preset *Vite*) – environment variable:
   `VITE_API_URL` = the deployed backend URL (no trailing slash). Redeploy after setting it
   (Vite bakes it in at build time). The app uses `HashRouter`, so no rewrite rules are needed.
4. In production the auth cookie is `Secure; HttpOnly; SameSite=None` so it works across the two
   Vercel domains. The browser must allow third-party cookies for the site (default in Chrome/Edge/Firefox;
   Safari and Chrome Incognito block them — use a normal window for grading).
