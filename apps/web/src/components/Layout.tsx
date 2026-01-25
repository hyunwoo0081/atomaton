import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@atomaton/ui';

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDeveloper = localStorage.getItem('is_developer') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('is_developer');
    navigate('/login');
  };

  return (
    <div className="h-screen bg-[#0D0E12] flex flex-col overflow-hidden relative text-white">
      {/* Floating Spheres (Background Atmosphere) */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#8A3FFC] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E02DFF] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>

      <nav className="bg-white/5 backdrop-blur-md border-b border-white/10 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF]">
                  Atomaton
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    location.pathname === '/'
                      ? 'border-[#8A3FFC] text-white'
                      : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                  }`}
                >
                  Dashboard
                </Link>
                {isDeveloper && (
                  <Link
                    to="/developer"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      location.pathname === '/developer'
                        ? 'border-[#8A3FFC] text-white'
                        : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                    }`}
                  >
                    Developer
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <Button variant="secondary" onClick={handleLogout} className="text-sm !py-1 !px-4">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className={`flex-1 overflow-auto z-10 ${fullWidth ? '' : 'py-10'}`}>
        <div className={`${fullWidth ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};
