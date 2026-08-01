import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Presentation, Users, Trash2 } from 'lucide-react';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [creating, setCreating] = useState(false);

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
      fetchEvents(); // Refresh list
    } catch (error) {
      console.error('Failed to create event', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      fetchEvents(); // Refresh list
    } catch (error) {
      console.error('Failed to delete event', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#16171d] text-gray-900 dark:text-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Hello, {user?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">Welcome to your host dashboard.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </header>

        {/* Create Event Box */}
        <div className="bg-white dark:bg-[#1f2028] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-12">
          <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="flex gap-4">
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="Enter event title (e.g. Friday Tech Quiz)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#16171d] focus:ring-2 focus:ring-[#aa3bff] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={creating || !newEventTitle.trim()}
              className="bg-[#aa3bff] hover:bg-[#9024e6] text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        </div>

        {/* Events List */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Events</h2>
          
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading your events...</div>
          ) : events.length === 0 ? (
            <div className="text-center bg-white dark:bg-[#1f2028] rounded-2xl border border-gray-100 dark:border-gray-800 p-12">
              <Presentation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No events yet</h3>
              <p className="text-gray-500">Create your first event to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white dark:bg-[#1f2028] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold line-clamp-1 flex-1 pr-2">{event.title}</h3>
                    <div className="bg-[#aa3bff]/10 text-[#aa3bff] px-3 py-1 rounded-md text-sm font-bold tracking-widest">
                      {event.roomCode}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <div className="flex items-center gap-1.5">
                      <Presentation className="w-4 h-4" />
                      <span>{event._count.questions} Qs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{event._count.participants} Joined</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                      Manage
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2.5 bg-gray-50 dark:bg-[#16171d] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-gray-100 dark:border-gray-800"
                      title="Delete Event"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
