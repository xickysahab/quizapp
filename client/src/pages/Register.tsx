import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { UserPlus, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', { name, email, password });
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
              <UserPlus className="w-6 h-6 text-[#8C6D46]" />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#8C6D46] uppercase">
              Host Registration
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
              Create Host Account
            </h2>
            <p className="text-sm text-[#78716C] mt-1">
              Start creating interactive quizzes & live polls
            </p>
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

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#A8A29E] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E8DFD5] bg-[#FAF8F6] text-[#1C1917] text-sm focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all"
                  placeholder="E.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

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
                  placeholder="Create a strong password"
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
              <span>{loading ? 'Creating Account...' : 'Get Started Free'}</span>
              <ArrowRight className="w-4 h-4 text-[#8C6D46] group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#78716C]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#1C1917] underline hover:text-[#8C6D46] transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Register;
