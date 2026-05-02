import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@atomaton/ui';
export const Layout = ({ children, fullWidth = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isDeveloper = localStorage.getItem('is_developer') === 'true';
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('is_developer');
        navigate('/login');
    };
    return (_jsxs("div", { className: "h-screen bg-[#0D0E12] flex flex-col overflow-hidden relative text-white", children: [_jsx("div", { className: "fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#8A3FFC] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0" }), _jsx("div", { className: "fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E02DFF] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0" }), _jsx("nav", { className: "bg-white/5 backdrop-blur-md border-b border-white/10 flex-shrink-0 z-10", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between h-16", children: [_jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0 flex items-center", children: _jsx(Link, { to: "/", className: "text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF]", children: "Atomaton" }) }), _jsxs("div", { className: "hidden sm:ml-6 sm:flex sm:space-x-8", children: [_jsx(Link, { to: "/", className: `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/'
                                                    ? 'border-[#8A3FFC] text-white'
                                                    : 'border-transparent text-white/60 hover:text-white hover:border-white/30'}`, children: "Dashboard" }), isDeveloper && (_jsx(Link, { to: "/developer", className: `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/developer'
                                                    ? 'border-[#8A3FFC] text-white'
                                                    : 'border-transparent text-white/60 hover:text-white hover:border-white/30'}`, children: "Developer" }))] })] }), _jsx("div", { className: "flex items-center", children: _jsx(Button, { variant: "secondary", onClick: handleLogout, className: "text-sm !py-1 !px-4", children: "Sign out" }) })] }) }) }), _jsx("main", { className: `flex-1 overflow-auto z-10 ${fullWidth ? '' : 'py-10'}`, children: _jsx("div", { className: `${fullWidth ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`, children: children }) })] }));
};
