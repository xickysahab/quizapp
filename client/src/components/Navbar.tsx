import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LogOut, LayoutDashboard, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FAF8F6]/85 backdrop-blur-md border-b border-[#E8DFD5] py-3 shadow-lux'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#2D2A26] flex items-center justify-center text-[#F4ECE1] shadow-md group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5 text-[#8C6D46]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-semibold tracking-tight text-[#1C1917] group-hover:text-[#8C6D46] transition-colors">
              PULSE
            </span>
            <span className="text-[10px] tracking-[0.25em] text-[#78716C] uppercase font-medium -mt-1">
              Interactive Quiz
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#44403C]">
          <Link
            to="/"
            className={`transition-colors hover:text-[#1C1917] ${
              location.pathname === '/' ? 'text-[#1C1917] font-semibold' : 'text-[#78716C]'
            }`}
          >
            Join Quiz
          </Link>
          <a href="#features" className="transition-colors hover:text-[#1C1917] text-[#78716C]">
            Experience
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-[#1C1917] text-[#78716C]">
            Workflow
          </a>
        </nav>

        {/* Desktop Action CTAs */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5F0EB] text-[#1C1917] text-sm font-medium border border-[#E8DFD5] hover:bg-[#EFE7DE] transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-[#8C6D46]" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F0EB] transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-[#44403C] hover:text-[#1C1917] px-4 py-2 transition-colors"
              >
                Host Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D2A26] text-[#FAF8F6] text-sm font-medium hover:bg-[#1C1917] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 duration-200"
              >
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8C6D46]" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[#1C1917] hover:bg-[#F5F0EB] transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#FAF8F6] border-b border-[#E8DFD5] px-6 py-6"
          >
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-[#1C1917] py-2 border-b border-[#F5F0EB]"
              >
                Join Quiz
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-[#78716C] py-2 border-b border-[#F5F0EB]"
              >
                Experience
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-[#78716C] py-2 border-b border-[#F5F0EB]"
              >
                Workflow
              </a>

              {isAuthenticated ? (
                <div className="pt-2 flex flex-col gap-3">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2D2A26] text-[#FAF8F6] font-medium"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#8C6D46]" />
                    <span>Host Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="py-2 text-[#78716C] hover:text-[#1C1917] font-medium"
                  >
                    Log Out ({user?.name})
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex flex-col gap-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-[#F5F0EB] text-[#1C1917] font-medium border border-[#E8DFD5]"
                  >
                    Host Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-[#2D2A26] text-[#FAF8F6] font-medium"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
