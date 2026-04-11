import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateForm from './pages/CreateForm';
import FormAnalytics from './pages/FormAnalytics';
import StudentForm from './pages/StudentForm';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';

const Protected = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/f/:link" element={<StudentForm />} />
        <Route path="/*" element={
          <Protected>
            <Navbar />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create" element={<CreateForm />} />
                <Route path="/analytics/:id" element={<FormAnalytics />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </Protected>
        } />
      </Routes>
    </BrowserRouter>
  );
}