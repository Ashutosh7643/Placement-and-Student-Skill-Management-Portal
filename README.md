# Placement and Student Skill Management Portal

**University:** Dev Bhoomi Uttarakhand University, Dehradun  
**Project Type:** B.Tech CSE Minor Project  
**Users:** Student and Placement Cell Admin  

---

## 1. Project Overview

The **Placement and Student Skill Management Portal** is a full-stack web application designed for university students and the Training & Placement (T&P) Cell. It replaces scattered spreadsheets with a structured MongoDB-backed portal where:

- **Students** manage their academic profile (CGPA, branch, semester, backlogs), technical and soft skills, projects, and certifications, check real-time eligibility for placement drives, view transparent skill match scores and missing skill gaps, apply to eligible drives, and track application status updates.
- **Admins (T&P Cell)** manage student records, companies, and placement drives with explicit eligibility criteria and required skills, review applications, update selection statuses, and view real-time placement reports.

---

## 2. Features

### Student Features
- Account registration, login, logout, and password hashing (`bcryptjs`)
- Profile management (Roll Number, Department, Branch, Academic Year, Semester, CGPA, Backlogs, Contact links)
- Add, edit, and delete **Technical Skills** and **Soft Skills** with case-insensitive duplicate prevention
- Add, edit, and delete **Projects** and **Certifications**
- Search and filter **Placement Drives** by keyword, status, eligibility, and minimum package
- **Backend Eligibility Check** with exact pass/fail reasons (CGPA, backlogs, branch, deadline, drive status)
- **Rule-Based Skill Matching** (no AI/ML):
  $$\text{Match Percentage} = \left(\frac{\text{Number of Matched Required Skills}}{\text{Total Number of Required Skills}}\right) \times 100$$
  Case-insensitive comparison, duplicate-safe counting, empty-list handling, and clear **Skill Gaps** display
- Apply to eligible drives (with duplicate application prevention) and track application statuses (`Applied`, `Under Review`, `Shortlisted`, `Rejected`, `Selected`)

### Admin Features
- Separate **Admin Login** and **Admin Dashboard** backed by live MongoDB counts
- **Student Management:** Search/filter by name, roll number, branch, CGPA, and backlogs; inspect skills/projects/certifications; update academic records or account status
- **Company Management:** Add, edit, delete, and search recruiting companies
- **Placement Drive Management:** Create, edit, and delete placement drives with eligibility criteria and required skills
- **Application Management:** Filter applications by drive, branch, status, or student; update status and remarks
- **Basic Reports:** Branch-wise academic/placement summary (with CSV export), drive-wise performance, and required skill demand vs. student skill coverage

---

## 3. Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (responsive desktop, tablet, and mobile layouts)
- **Backend:** Node.js, Express.js (REST API architecture)
- **Database:** MongoDB with Mongoose ODM
- **Security & Validation:** `bcryptjs`, `express-session`, `express-validator`, `dotenv`
- **Development Tooling:** `nodemon`, Node built-in test runner assertions

---

## 4. Folder Structure

```text
Placement-Skill/
├── frontend/
│   ├── pages/           # HTML pages (Public, Student, Admin)
│   ├── css/             # Institutional stylesheet (styles.css)
│   ├── js/              # Page-specific client JavaScript + common.js
│   ├── images/          # University emblem SVG
│   └── assets/          # Static assets folder
├── backend/
│   ├── config/
│   │   └── database.js  # MongoDB connection setup
│   ├── models/          # Mongoose schemas (User, StudentProfile, Skill, Project, Certification, Company, PlacementDrive, Application)
│   ├── controllers/     # Request handlers (auth, student, drive, application, admin)
│   ├── routes/          # Express REST API routers
│   ├── middleware/      # Authentication, role guard, validation, error handler
│   ├── services/        # Eligibility engine & rule-based skill matching
│   ├── utils/           # ApiError & asyncHandler helpers
│   ├── tests/           # End-to-end automated test suite
│   ├── app.js           # Express app & static frontend configuration
│   ├── server.js        # Server entry point
│   └── package.json     # Backend dependencies and scripts
├── database/
│   ├── README.md        # Detailed MongoDB local & Atlas setup notes
│   └── seed.js          # Demo data seeder script
├── .env.example         # Environment variable template
├── .gitignore
├── package.json         # Root convenience scripts
└── README.md
```

---

## 5. Prerequisites

- **Node.js** (v18 or higher recommended; verified on v24.14.0)
- **npm** (comes with Node.js)
- **MongoDB** (either Local MongoDB Community Server on Windows OR a free MongoDB Atlas cluster)

---

## 6. Installation Steps (Windows PowerShell)

1. Open PowerShell in the project root (`Placement-Skill`):
   ```powershell
   cd C:\Users\ashut\Desktop\Placement-Skill
   ```
2. Install backend dependencies:
   ```powershell
   npm --prefix backend install
   ```

---

## 7. MongoDB Setup

### Option A: Local MongoDB on Windows (Preferred)
1. Download and install **MongoDB Community Server** from `https://www.mongodb.com/try/download/community`.
2. Keep **"Install MongoDB as a Service"** selected during installation.
3. Verify MongoDB is running on port `27017`:
   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
   ```
4. Use this connection string in `.env`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/dbuu_placement_portal
   ```

### Option B: MongoDB Atlas (Beginner-Friendly Cloud Setup if Local MongoDB is Unavailable)
If local MongoDB is not installed on your computer:
1. Create a free account at `https://www.mongodb.com/cloud/atlas`.
2. Click **Create** -> choose the free **M0** cluster -> click **Create Deployment**.
3. Under **Database Access**, create a database user (for example `portaluser` with a strong password).
4. Under **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere (`0.0.0.0/0`)** for development/demo testing.
5. Go to **Database -> Connect -> Drivers**, copy the connection string, and replace `<username>`, `<password>`, and `<cluster-url>` in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/dbuu_placement_portal?retryWrites=true&w=majority
   ```

> **Important:** If MongoDB is stopped or `MONGODB_URI` is invalid, the backend intentionally exits with a clear connection error rather than falling back to fake data.

---

## 8. Environment Variable Setup

Copy `.env.example` to `.env` in the project root:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and update values as needed:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/dbuu_placement_portal
SESSION_SECRET=replace_with_a_long_random_secret_string
```

To change the MongoDB connection string at any time, simply update `MONGODB_URI` in `.env` and restart the server.

---

## 9. How to Seed Demo Data

Run the seed script from the project root after configuring `.env`:

```powershell
node database/seed.js
```

Or using npm:
```powershell
npm run seed
```

---

## 10. Starting the Application & Opening Frontend

Start the server in normal mode:
```powershell
npm start
```

Or in development mode with auto-restart (`nodemon`):
```powershell
npm run dev
```

Once started, open your browser and visit:
- **Portal Home:** `http://localhost:3000`
- **Student Login:** `http://localhost:3000/pages/login.html`
- **Student Registration:** `http://localhost:3000/pages/register.html`
- **Admin Login:** `http://localhost:3000/pages/admin-login.html`
- **Backend API Base URL:** `http://localhost:3000/api`

---

## 11. Demo Account Credentials (from `database/seed.js`)

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| **Admin (T&P Cell)** | `admin@dbuu.ac.in` | `Admin@123` | Full admin access |
| **Student 1** | `aarav.sharma@student.dbuu.ac.in` | `Student@123` | CSE, CGPA 8.45, 0 backlogs |
| **Student 2** | `priya.rawat@student.dbuu.ac.in` | `Student@123` | CSE, CGPA 6.40, 1 backlog (demonstrates ineligible checks) |
| **Student 3** | `rohan.bisht@student.dbuu.ac.in` | `Student@123` | ECE, CGPA 7.80, 0 backlogs |

---

## 12. REST API Overview

All endpoints are Postman-compatible and use session cookies (`connect.sid`).

### Health & Authentication
- `GET /api/health` — Server and MongoDB connection status
- `POST /api/auth/register` — Register a new student and academic profile
- `POST /api/auth/login` — Login (`email`, `password`, optional `expectedRole`)
- `POST /api/auth/logout` — Destroy session and clear cookie
- `GET /api/auth/me` — Get current authenticated user & profile

### Student Endpoints (`role: student`)
- `GET /api/student/dashboard` — Dashboard metrics, recent applications, and evaluated open drives
- `GET /api/student/profile` | `PUT /api/student/profile` — View or update academic profile
- `GET /api/student/skills` | `POST /api/student/skills` | `PUT /api/student/skills/:id` | `DELETE /api/student/skills/:id`
- `GET /api/student/projects` | `POST /api/student/projects` | `PUT /api/student/projects/:id` | `DELETE /api/student/projects/:id`
- `GET /api/student/certifications` | `POST /api/student/certifications` | `PUT /api/student/certifications/:id` | `DELETE /api/student/certifications/:id`

### Drives & Applications
- `GET /api/drives` — Search/filter drives (returns eligibility & skill match for students)
- `GET /api/drives/:id` — Drive details with eligibility & skill match
- `GET /api/drives/:id/evaluate` — Explicit eligibility & skill match evaluation for logged-in student
- `POST /api/applications` — Apply to an eligible drive (`{ driveId }`)
- `GET /api/applications/my` — Student's application history

### Admin Endpoints (`role: admin`)
- `GET /api/admin/dashboard` — Live MongoDB counts and recent activity
- `GET /api/admin/students` | `GET /api/admin/students/:id` | `PUT /api/admin/students/:id`
- `GET /api/admin/companies` | `POST /api/admin/companies` | `PUT /api/admin/companies/:id` | `DELETE /api/admin/companies/:id`
- `GET /api/admin/drives` | `POST /api/admin/drives` | `PUT /api/admin/drives/:id` | `DELETE /api/admin/drives/:id`
- `GET /api/admin/applications` | `PUT /api/admin/applications/:id/status`
- `GET /api/admin/reports` — Branch summary, drive performance, and skill coverage report

---

## 13. Testing

Run the automated end-to-end test suite (uses `mongodb-memory-server` to test all APIs, validation, RBAC, eligibility, skill matching, duplicate prevention, and restart persistence):

```powershell
npm test
```

---

## 14. Known Limitations

- Uses server-side `express-session` default memory store in development (sessions reset if the Node process restarts, while all application records remain safely persisted in MongoDB).
- Email notifications and file/PDF resume uploads are not included in this minor-project scope.

---

## 15. Future Scope

The following enhancements are planned for future iterations and are intentionally outside the current minor project scope:
- AI-based job recommendations
- AI resume analysis and automated parsing
- Personalized learning recommendations based on skill gaps
- Advanced predictive placement analytics
