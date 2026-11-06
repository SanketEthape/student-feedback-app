# EduPulse — Student Feedback & Academic Comprehension Portal

EduPulse is an AI-powered student assessment and continuous comprehension tracking system for engineering institutions. It enables faculty to generate unit-wise assessment forms from syllabus topics, collects objective and descriptive student responses, evaluates descriptive conceptual explanations using Google Gemini AI, and provides deep curriculum analytics for academic handover.

---

## 🌐 Live Hosted Application (Cloud Deployment)

The project is hosted and accessible online:

- **Live Web Application (Frontend)**: [https://student-feedback-frontend.onrender.com](https://student-feedback-frontend.onrender.com)
- **Live API Service (Backend)**: [https://student-feedback-backend.onrender.com/api](https://student-feedback-backend.onrender.com/api)
- **API Health Check**: [https://student-feedback-backend.onrender.com/health](https://student-feedback-backend.onrender.com/health)

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

- **Frontend**: React 19, Vite, React Router 7, Recharts, Lucide Icons
- **Backend**: Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcryptjs
- **Artificial Intelligence**: Google Gemini API (`gemini-1.5-flash`) for automated semantic grading
- **Deployment**: Render (Web Service for Backend + Static Site for Frontend)

---

## 💻 Standalone Windows Desktop Application (`EduPulse.exe`)

For submission and offline demonstration on Windows computers without installing Node.js, npm, or any dependencies, a standalone desktop application package is provided:

- **Executable File**: `EduPulse-Windows-x64/EduPulse.exe` (~238 MB native binary)
- **Portable Release Zip**: `EduPulse-Windows-x64.zip` (~184 MB)

### How Faculty/Evaluators Run It:
1. Extract `EduPulse-Windows-x64.zip` (or open the `EduPulse-Windows-x64` folder).
2. Double-click **`EduPulse.exe`**.
3. The standalone desktop application opens directly in its own native window with the backend server and React frontend running automatically.

---

## ⚡ Quick-Run Terminal Launchers (Linux & Windows Scripts)

For evaluator review and submission testing, one-click executable launchers are provided:

- **Linux / macOS**: Execute `./start.sh` (or double-click to run in terminal)
  ```bash
  ./start.sh
  ```
- **Windows**: Double-click `start.bat`
  ```cmd
  start.bat
  ```

Both launchers will automatically start the Backend API (Port 5000), serve the Frontend (Port 5173), and open the application in your default browser.

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
- `GEMINI_API_KEY`: Google Gemini API key for question generation & descriptive answer grading
