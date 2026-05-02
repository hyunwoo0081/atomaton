import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { WorkflowEditor } from './pages/WorkflowEditor';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import { Layout } from './components/Layout';
const PrivateRoute = ({ children, fullWidth }) => {
    const token = localStorage.getItem('token');
    return token ? _jsx(Layout, { fullWidth: fullWidth, children: children }) : _jsx(Navigate, { to: "/login" });
};
const DeveloperRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const isDeveloper = localStorage.getItem('is_developer') === 'true';
    if (!token) {
        return _jsx(Navigate, { to: "/login" });
    }
    if (!isDeveloper) {
        return _jsx(Navigate, { to: "/" });
    }
    return _jsx(Layout, { children: children });
};
// Component to handle global events like logout
const AuthHandler = () => {
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
    return (_jsxs(Router, { children: [_jsx(AuthHandler, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/", element: _jsx(PrivateRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/workflow/:id", element: _jsx(PrivateRoute, { fullWidth: true, children: _jsx(WorkflowEditor, {}) }) }), _jsx(Route, { path: "/developer", element: _jsx(DeveloperRoute, { children: _jsx(DeveloperDashboard, {}) }) })] })] }));
}
export default App;
