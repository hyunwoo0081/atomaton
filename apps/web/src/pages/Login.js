import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@atomaton/ui';
import { api } from '../utils/api';
export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', response.token);
            localStorage.setItem('is_developer', String(response.user.is_developer));
            if (response.user.is_developer) {
                navigate('/developer');
            }
            else {
                navigate('/');
            }
        }
        catch (err) {
            setError(err.message || 'Login failed');
        }
    };
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden", children: [_jsx("div", { className: "fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#8A3FFC] rounded-full mix-blend-screen filter blur-[150px] opacity-30 pointer-events-none z-0" }), _jsx("div", { className: "fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#E02DFF] rounded-full mix-blend-screen filter blur-[150px] opacity-30 pointer-events-none z-0" }), _jsxs(Card, { className: "max-w-md w-full space-y-8 z-10 relative", children: [_jsxs("div", { children: [_jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-white", children: "Sign in to Atomaton" }), _jsx("p", { className: "mt-2 text-center text-sm text-white/60", children: "Enter your credentials to access the dashboard" })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [_jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Email address", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "user@example.com" }), _jsx(Input, { label: "Password", type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), error && _jsx("div", { className: "text-[#FF2E63] text-sm text-center font-medium", children: error }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full flex justify-center", children: "Sign in" }) })] })] })] }));
};
