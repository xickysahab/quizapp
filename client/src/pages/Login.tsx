import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      // Fallback: If backend returns an error or is unreachable, allow hardcoded admin login
      if (email === 'admin@admin.com' && password === 'admin') {
        const fallbackUser = { id: 'admin-host-id', name: 'Admin Host', email: 'admin@admin.com' };
        const fallbackToken = 'admin_fallback_jwt_token';
        login(fallbackUser, fallbackToken);
        navigate('/dashboard');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#1C1917] flex flex-col font-sans relative selection:bg-[#E8DFD5]">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 flex items-center justify-center bg-ambient-glow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full bg-[#FFFFFF] rounded-3xl p-8 md:p-10 shadow-lux-lg border border-[#E8DFD5] relative"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#2D2A26] flex items-center justify-center text-[#F4ECE1] mx-auto mb-4 shadow-sm">
              <Sparkles className="w-6 h-6 text-[#8C6D46]" />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#8C6D46] uppercase">
              Host Portal
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
              Welcome Back
            </h2>
            <p className="text-sm text-[#78716C] mt-1">
              Sign in to manage live quizzes & audience polls
            </p>
          </div>

          {/* Admin Credentials Info Pill */}
          <div className="bg-[#F5F0EB] border border-[#E8DFD5] text-[#8C6D46] px-4 py-2.5 rounded-2xl text-xs text-center font-medium mb-6">
            Default Host Credentials pre-filled for instant demo access
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#FFF5F5] border border-[#FEB2B2] text-[#C53030] p-3.5 rounded-2xl text-xs font-medium text-center mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A8A29E] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E8DFD5] bg-[#FAF8F6] text-[#1C1917] text-sm focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A8A29E] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E8DFD5] bg-[#FAF8F6] text-[#1C1917] text-sm focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D2A26] hover:bg-[#1C1917] text-[#FAF8F6] font-medium py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In as Host'}</span>
              <ArrowRight className="w-4 h-4 text-[#8C6D46] group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#78716C]">
            Don't have a host account?{' '}
            <Link to="/register" className="font-semibold text-[#1C1917] underline hover:text-[#8C6D46] transition-colors">
              Create account
            </Link>
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;
