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
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col font-sans relative selection:bg-[#E0F2FE]">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 flex items-center justify-center bg-ambient-glow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full bg-[#FFFFFF] rounded-3xl p-8 md:p-10 shadow-lux-lg border border-[#E0F2FE] relative"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#F97316] flex items-center justify-center text-[#ECFEFF] mx-auto mb-4 shadow-sm">
              <UserPlus className="w-6 h-6 text-[#06B6D4]" />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#06B6D4] uppercase">
              Host Registration
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#0F172A] mt-1">
              Create Host Account
            </h2>
            <p className="text-sm text-[#475569] mt-1">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E0F2FE] bg-[#FFFFFF] text-[#0F172A] text-sm focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] outline-none transition-all"
                  placeholder="E.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E0F2FE] bg-[#FFFFFF] text-[#0F172A] text-sm focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] outline-none transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E0F2FE] bg-[#FFFFFF] text-[#0F172A] text-sm focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] outline-none transition-all"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-[#FFFFFF] font-medium py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Creating Account...' : 'Get Started Free'}</span>
              <ArrowRight className="w-4 h-4 text-[#06B6D4] group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#475569]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0F172A] underline hover:text-[#06B6D4] transition-colors">
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
