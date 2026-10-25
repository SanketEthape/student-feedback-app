# EduPulse — Student Feedback & Academic Comprehension Portal

EduPulse is an AI-powered student assessment and continuous comprehension tracking system for engineering institutions. It enables faculty to generate unit-wise assessment forms from syllabus topics, collects objective and descriptive student responses, and provides deep curriculum analytics for academic handover.

---

## 🔐 Administrative Access (Internal & Private)

The administration portal provides cross-faculty, institution-wide curriculum understanding analytics. It is hidden from the public landing and login UI to maintain standard faculty/student workflows.

### Admin Credentials
- **Portal Login URL**: `/login` (Sign in directly via the standard Faculty Login form)
- **Email**: `admin@edupulse.local`
- **Password**: `Admin@123`
- **Role**: `admin` (Strictly read-only access to institution analytics)

### Admin Capabilities
- **Level 1 (Subject Overview)**: Overall student comprehension across all departments and faculties.
- **Level 2 (Unit-Wise Breakdown)**: Module/unit-wise understanding percentages for any selected subject.
- **Level 3 (Topic Comprehension & Handover)**: Detailed topic difficulty analysis to help upcoming batch teachers know which topics require extra remedial lectures and which are well understood.
- **Classification Standard**:
  - `≥ 60%`: 🟢 **Easy to Understand**
  - `< 60%`: 🔴 **Challenging to Understand**
- **Teacher Handover Briefing**: One-click **Copy Handover Report** to share structured topic readiness reports with future instructors.
- **Privacy Assurance**: No individual student answers or private records are shown; all figures are aggregated statistics.
- **Zero AI Model Calls**: Admin routes compute metrics directly via MongoDB database aggregations without incurring API costs.

---

## 🏛️ Curriculum & Form Generation

To avoid spelling mismatches across faculty accounts (e.g., *"computer networks"* vs *"computer networks and os"*), form generation (`/create`) uses:
1. **Department Selection**: Computer Engineering, Information Technology, AI & Data Science, Electronics & Telecommunication, Mechanical Engineering, Civil Engineering, Electrical Engineering.
2. **Searchable Standardized Subject Dropdown**: Sourced from the standardized department curriculum list.
3. **Unit Selection**: Unit 1 through Unit 6 or custom unit title.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, React Router 7, Recharts
- **Backend**: Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcryptjs
- **Deployment**: Render (Web Service for Backend + Static Site for Frontend)

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### 2. Backend Setup
```bash
cd backend
npm install

# Seed the admin account in MongoDB
npm run seed:admin

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start development server
npm run dev
```

---

## ☁️ Production Deployment on Render

This project is configured for automated deployment via `render.yaml`:
- **Backend Service**: `student-feedback-backend` (Node.js runtime)
- **Frontend Service**: `student-feedback-frontend` (Static Site runtime)

Environment variables required in Render Dashboard:
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT authentication
- `ENCRYPTION_KEY`: 32-byte hex key for API key encryption
