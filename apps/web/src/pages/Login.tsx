import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@atomaton/ui';
import { api } from '../utils/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    is_developer: boolean;
  };
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('is_developer', String(response.user.is_developer));
      
      if (response.user.is_developer) {
        navigate('/developer');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Atmosphere for Login Page */}
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#8A3FFC] rounded-full mix-blend-screen filter blur-[150px] opacity-30 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#E02DFF] rounded-full mix-blend-screen filter blur-[150px] opacity-30 pointer-events-none z-0"></div>

      <Card className="max-w-md w-full space-y-8 z-10 relative">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to Atomaton
          </h2>
          <p className="mt-2 text-center text-sm text-white/60">
            Enter your credentials to access the dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-[#FF2E63] text-sm text-center font-medium">{error}</div>}

          <div>
            <Button type="submit" className="w-full flex justify-center">
              Sign in
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
