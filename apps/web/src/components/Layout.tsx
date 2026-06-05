import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@atomaton/ui'

interface LayoutProps {
  children: React.ReactNode
  fullWidth?: boolean
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  fullWidth = false,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isDeveloper = localStorage.getItem('is_developer') === 'true'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('is_developer')
    navigate('/login')
  }

  const linkClass = (path: string) => {
    const isActive = location.pathname === path
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-[#8A3FFC] text-white'
        : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
    }`
  }

  const mobileLinkClass = (path: string) => {
    const isActive = location.pathname === path
    return `block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
      isActive
        ? 'border-[#8A3FFC] text-white bg-white/5'
        : 'border-transparent text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20'
    }`
  }

  return (
    <div className="h-screen bg-[#0D0E12] flex flex-col overflow-hidden relative text-white">
      {/* Floating Spheres (Background Atmosphere) */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#8A3FFC] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E02DFF] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>

      <nav className="bg-white/5 backdrop-blur-md border-b border-white/10 flex-shrink-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  to="/"
                  className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF]"
                >
                  Atomaton
                </Link>
              </div>

              {/* Desktop Navigation Links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/" className={linkClass('/')}>
                  Dashboard
                </Link>
                {isDeveloper && (
                  <Link to="/developer" className={linkClass('/developer')}>
                    Developer
                  </Link>
                )}
                <Link to="/settings" className={linkClass('/settings')}>
                  Settings
                </Link>
              </div>

              {/* Mobile hamburger menu button */}
              <div className="flex items-center sm:hidden">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-white/60 hover:text-white hover:bg-white/5 focus:outline-none transition-colors"
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <svg
                      className="block h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="block h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop right section (Sign out button) */}
            <div className="hidden sm:flex sm:items-center">
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="text-sm !py-1 !px-4"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown panel */}
        {isMobileMenuOpen && (
          <div
            className="sm:hidden border-t border-white/5 bg-[#0D0E12]/95 backdrop-blur-lg"
            id="mobile-menu"
          >
            <div className="pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className={mobileLinkClass('/')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              {isDeveloper && (
                <Link
                  to="/developer"
                  className={mobileLinkClass('/developer')}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Developer
                </Link>
              )}
              <Link
                to="/settings"
                className={mobileLinkClass('/settings')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Settings
              </Link>
            </div>
            <div className="pt-4 pb-4 border-t border-white/5 px-4 flex items-center justify-between">
              <span className="text-sm text-white/40">Session</span>
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="text-xs !py-1 !px-4"
              >
                Sign out
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main
        className={`flex-1 ${fullWidth ? 'overflow-hidden' : 'overflow-auto py-10'} z-10`}
      >
        <div
          className={`${fullWidth ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
