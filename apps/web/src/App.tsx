import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { WorkflowEditor } from './pages/WorkflowEditor';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import { Layout } from './components/Layout';

const PrivateRoute: React.FC<{ children: React.ReactNode; fullWidth?: boolean }> = ({ children, fullWidth }) => {
  const token = localStorage.getItem('token');
  return token ? <Layout fullWidth={fullWidth}>{children}</Layout> : <Navigate to="/login" />;
};

const DeveloperRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  const isDeveloper = localStorage.getItem('is_developer') === 'true';

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (!isDeveloper) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

// Component to handle global events like logout
const AuthHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('is_developer');
      alert('Session expired. Please login again.');
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [navigate]);

  return null;
};

function App() {
  return (
    <Router>
      <AuthHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/workflow/:id"
          element={
            <PrivateRoute fullWidth>
              <WorkflowEditor />
            </PrivateRoute>
          }
        />
        <Route
          path="/developer"
          element={
            <DeveloperRoute>
              <DeveloperDashboard />
            </DeveloperRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
