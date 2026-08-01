import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Sparkles, ArrowRight, ShieldCheck, Zap, BarChart3, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Join: React.FC = () => {
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomCode.trim() || !name.trim()) {
      setError('Please provide both room code and your name');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/participants/join', {
        roomCode: roomCode.trim().toUpperCase(),
        name: name.trim(),
      });

      // Save participant session in localStorage
      localStorage.setItem('participantId', response.data.participant.id);
      localStorage.setItem('participantName', response.data.participant.name);
      localStorage.setItem('eventId', response.data.event.id);

      // Navigate to live quiz waiting room
      navigate(`/live/${roomCode.trim().toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to join room. Please verify the 6-character room code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#1C1917] flex flex-col font-sans relative selection:bg-[#E8DFD5]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-36 px-6 md:px-12 overflow-hidden bg-ambient-glow">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Hero Content Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-8 text-left"
          >
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5F0EB] border border-[#E8DFD5] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#8C6D46]" />
              <span className="text-xs font-semibold tracking-wider text-[#8C6D46] uppercase">
                Reimagining Audience Interactivity
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.08] tracking-tight text-[#1C1917]">
              Where live questions turn into <span className="italic font-normal text-[#8C6D46]">shared clarity</span>.
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-[#78716C] leading-relaxed max-w-xl font-normal">
              An elegant platform for real-time polls, live quizzes, and audience interaction. Designed with calm sophistication and zero friction.
            </p>

            {/* Quick Metrics & Feature Highlights */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-sm text-[#78716C]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8C6D46]" />
                <span>No app download required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8C6D46]" />
                <span>Instant WebSocket syncing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8C6D46]" />
                <span>Distraction-free interface</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Form Right — Floating Room Join Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div className="bg-[#FFFFFF] rounded-3xl p-8 md:p-10 shadow-lux-lg border border-[#E8DFD5] relative">
              <div className="text-center mb-8">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-[#8C6D46] uppercase">
                  Participant Portal
                </span>
                <h2 className="font-serif text-3xl font-bold text-[#1C1917] mt-1">
                  Join a Live Session
                </h2>
                <p className="text-sm text-[#78716C] mt-1">
                  Enter the 6-character room code provided by your host
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#FFF5F5] border border-[#FEB2B2] text-[#C53030] px-4 py-3 rounded-2xl text-xs font-medium text-center mb-6"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2 text-left">
                    Room Code
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 text-center text-3xl font-mono font-bold tracking-[0.25em] uppercase rounded-2xl border border-[#E8DFD5] bg-[#FAF8F6] text-[#1C1917] focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-[#A8A29E] placeholder:text-base"
                    placeholder="E.G. A1B2C3"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2 text-left">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-3.5 text-base rounded-2xl border border-[#E8DFD5] bg-[#FAF8F6] text-[#1C1917] focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all placeholder:text-[#A8A29E]"
                    placeholder="Enter your name or alias"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={25}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || roomCode.length < 6 || name.length < 2}
                  className="w-full bg-[#2D2A26] hover:bg-[#1C1917] text-[#FAF8F6] text-base font-medium py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.99] flex items-center justify-center gap-2 group mt-2"
                >
                  <span>{loading ? 'Connecting...' : 'Enter Live Quiz'}</span>
                  <ArrowRight className="w-4 h-4 text-[#8C6D46] group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              {/* Host Sign In Hint */}
              <div className="mt-8 pt-6 border-t border-[#E8DFD5]/60 text-center">
                <p className="text-xs text-[#78716C]">
                  Are you hosting a session?{' '}
                  <Link to="/login" className="font-semibold text-[#1C1917] underline hover:text-[#8C6D46] transition-colors">
                    Sign in to Host Dashboard
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-24 px-6 md:px-12 bg-[#FAF8F6] border-t border-[#E8DFD5]/50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8C6D46]">
              Designed for High Engagement
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-[#1C1917]">
              Every element crafted with intention.
            </h2>
            <p className="text-[#78716C] text-base leading-relaxed">
              Remove friction between speakers and participants with serene visual layouts and instant real-time synchronization.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FFFFFF] rounded-3xl p-8 border border-[#E8DFD5] shadow-lux space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0EB] flex items-center justify-center text-[#8C6D46]">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                Instant Syncing
              </h3>
              <p className="text-[#78716C] text-sm leading-relaxed">
                Powered by WebSockets for zero latency. Answers, timers, and leaderboard positions update live across hundreds of connected devices.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FFFFFF] rounded-3xl p-8 border border-[#E8DFD5] shadow-lux space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0EB] flex items-center justify-center text-[#8C6D46]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                Real-Time Analytics
              </h3>
              <p className="text-[#78716C] text-sm leading-relaxed">
                Observe live participant response breakdowns as they submit. Host control options allow you to reveal solutions or pause timer instantly.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FFFFFF] rounded-3xl p-8 border border-[#E8DFD5] shadow-lux space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0EB] flex items-center justify-center text-[#8C6D46]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                Minimalist Elegance
              </h3>
              <p className="text-[#78716C] text-sm leading-relaxed">
                A serene color scheme, clear typography, and soft micro-animations eliminate distraction so participants remain focused.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 bg-[#F5F0EB] border-t border-[#E8DFD5]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8C6D46]">
              Simple Three-Step Process
            </span>
            <h2 className="font-serif text-4xl font-semibold text-[#1C1917] mt-2">
              How Pulse Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#2D2A26] text-[#FAF8F6] font-serif text-2xl font-bold flex items-center justify-center shadow-md">
                1
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#1C1917]">Create & Schedule</h3>
              <p className="text-sm text-[#78716C] leading-relaxed max-w-xs">
                Build your quiz questions, set answer timers, and generate a unique 6-character room code in seconds.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#2D2A26] text-[#FAF8F6] font-serif text-2xl font-bold flex items-center justify-center shadow-md">
                2
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#1C1917]">Share Room Code</h3>
              <p className="text-sm text-[#78716C] leading-relaxed max-w-xs">
                Display the room PIN on screen. Audience members join instantly on mobile or desktop without downloads.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#2D2A26] text-[#FAF8F6] font-serif text-2xl font-bold flex items-center justify-center shadow-md">
                3
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#1C1917]">Host & Engage</h3>
              <p className="text-sm text-[#78716C] leading-relaxed max-w-xs">
                Advance questions live, display option distributions, and celebrate top participants with instant leaderboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 px-6 md:px-12 bg-[#2D2A26] text-[#FAF8F6] relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight text-[#F4ECE1]">
            Ready to elevate your next session?
          </h2>
          <p className="text-[#BFA890] text-base max-w-xl mx-auto font-light">
            Join thousands of presenters and educators creating memorable live experiences.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-2xl bg-[#8C6D46] hover:bg-[#9B7A50] text-[#FAF8F6] font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started for Free
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-[#FAF8F6] font-medium transition-all backdrop-blur-xs"
            >
              Sign In as Host
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Join;
