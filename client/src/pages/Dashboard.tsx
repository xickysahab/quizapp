import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Plus, Presentation, Users, Trash2, Copy, Check, Search, Radio, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
  id: string;
  title: string;
  roomCode: string;
  isLive: boolean;
  createdAt: string;
  _count: {
    questions: number;
    participants: number;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data.events);
    } catch (error) {
      console.error('Failed to fetch events', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    setCreating(true);
    try {
      await api.post('/events', { title: newEventTitle });
      setNewEventTitle('');
      fetchEvents();
    } catch (error) {
      console.error('Failed to create event', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event? All questions and participant data will be removed.')) return;
    try {
      await api.delete(`/events/${id}`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event', error);
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.roomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuestions = events.reduce((acc, curr) => acc + (curr._count?.questions || 0), 0);
  const totalParticipants = events.reduce((acc, curr) => acc + (curr._count?.participants || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#1C1917] flex flex-col font-sans relative selection:bg-[#E8DFD5]">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 pb-8 border-b border-[#E8DFD5]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6D46]">
              Host Cockpit
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-[#1C1917] mt-1">
              Welcome, {user?.name || 'Host'}
            </h1>
            <p className="text-[#78716C] text-sm mt-1">
              Manage your interactive quizzes, live polls, and audience sessions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFFFFF] border border-[#E8DFD5] text-xs font-medium text-[#44403C] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#8C6D46] animate-pulse"></span>
              <span>Host Status: Active</span>
            </span>
          </div>
        </div>

        {/* Metric Cards Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#FFFFFF] rounded-3xl p-6 border border-[#E8DFD5] shadow-lux space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Total Quiz Sessions
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-3xl font-bold text-[#1C1917]">{events.length}</span>
              <Presentation className="w-5 h-5 text-[#8C6D46]" />
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-3xl p-6 border border-[#E8DFD5] shadow-lux space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Questions Built
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-3xl font-bold text-[#1C1917]">{totalQuestions}</span>
              <Radio className="w-5 h-5 text-[#8C6D46]" />
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-3xl p-6 border border-[#E8DFD5] shadow-lux space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Total Engaged Audience
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-3xl font-bold text-[#1C1917]">{totalParticipants}</span>
              <Users className="w-5 h-5 text-[#8C6D46]" />
            </div>
          </div>
        </div>

        {/* Create Event Card Container */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 border border-[#E8DFD5] shadow-lux mb-14">
          <div className="mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6D46]">
              Quick Setup
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#1C1917]">
              Create New Live Event
            </h2>
          </div>

          <form onSubmit={handleCreateEvent} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="E.g., Design Systems Workshop Q&A"
                className="w-full px-5 py-3.5 rounded-2xl border border-[#E8DFD5] bg-[#FAF8F6] text-[#1C1917] text-base placeholder:text-[#A8A29E] focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newEventTitle.trim()}
              className="bg-[#2D2A26] hover:bg-[#1C1917] text-[#FAF8F6] px-8 py-3.5 rounded-2xl font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4 text-[#8C6D46]" />
              <span>{creating ? 'Creating...' : 'Create Event'}</span>
            </button>
          </form>
        </div>

        {/* Events Grid Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-3xl font-bold text-[#1C1917]">
              Your Quiz Collection
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Select an event to edit questions or broadcast live
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E8DFD5] bg-[#FFFFFF] text-xs text-[#1C1917] focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all"
            />
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-16 text-[#78716C] italic font-serif">
            Loading your interactive collection...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center bg-[#FFFFFF] rounded-3xl border border-[#E8DFD5] p-16 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#8C6D46] mx-auto">
              <Presentation className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#1C1917]">No events found</h3>
            <p className="text-sm text-[#78716C] max-w-sm mx-auto">
              {searchQuery ? 'No matching events for your search.' : 'Create your first event above to start interacting with your audience.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#FFFFFF] rounded-3xl border border-[#E8DFD5] p-7 shadow-lux hover:shadow-lux-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Status Pill & Room Code */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                        event.isLive ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-[#F5F0EB] text-[#78716C]'
                      }`}>
                        {event.isLive ? '🔴 Live Now' : 'Draft / Ready'}
                      </span>

                      <button
                        onClick={() => copyRoomCode(event.roomCode)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F6] border border-[#E8DFD5] text-xs font-mono font-bold text-[#1C1917] hover:border-[#8C6D46] transition-colors"
                        title="Click to copy room code"
                      >
                        <span>{event.roomCode}</span>
                        {copiedCode === event.roomCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#A8A29E]" />
                        )}
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-2xl font-bold text-[#1C1917] mb-4 line-clamp-2 group-hover:text-[#8C6D46] transition-colors">
                      {event.title}
                    </h3>

                    {/* Metadata Counters */}
                    <div className="flex items-center gap-5 text-xs text-[#78716C] mb-6 pt-3 border-t border-[#F5F0EB]">
                      <div className="flex items-center gap-1.5">
                        <Presentation className="w-3.5 h-3.5 text-[#8C6D46]" />
                        <span>{event._count?.questions || 0} Questions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#8C6D46]" />
                        <span>{event._count?.participants || 0} Joined</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="flex-1 bg-[#F5F0EB] hover:bg-[#2D2A26] text-[#1C1917] hover:text-[#FAF8F6] py-3 rounded-2xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 group/btn"
                    >
                      <span>Manage & Host</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#8C6D46] group-hover/btn:text-[#FAF8F6] transition-colors" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-3 rounded-2xl text-[#A8A29E] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
