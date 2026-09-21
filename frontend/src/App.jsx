import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateForm from './pages/CreateForm';
import FormAnalytics from './pages/FormAnalytics';
import StudentForm from './pages/StudentForm';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentDashboard from './pages/StudentDashboard';

// Faculty protected route
const Protected = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

// Student protected route
const StudentProtected = ({ children }) => {
  return localStorage.getItem('studentToken') ? children : <Navigate to="/student/login" />;
};

const FacultyLayout = ({ children }) => (
  <Protected>
    <Navbar />
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {children}
    </div>
  </Protected>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />

        {/* Faculty Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Auth */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegister />} />

        {/* Student Dashboard (protected) */}
        <Route path="/student/dashboard" element={
          <StudentProtected>
            <StudentDashboard />
          </StudentProtected>
        } />

        {/* Student Form */}
        <Route path="/f/:link" element={<StudentForm />} />

        {/* Faculty Protected Routes */}
        <Route path="/dashboard" element={<FacultyLayout><Dashboard /></FacultyLayout>} />
        <Route path="/create" element={<FacultyLayout><CreateForm /></FacultyLayout>} />
        <Route path="/analytics/:id" element={<FacultyLayout><FormAnalytics /></FacultyLayout>} />
        <Route path="/settings" element={<FacultyLayout><Settings /></FacultyLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}