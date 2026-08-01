import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LogIn } from 'lucide-react';

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
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/participants/join', {
        roomCode: roomCode.trim().toUpperCase(),
        name: name.trim()
      });
      
      // Save participant session in localStorage
      localStorage.setItem('participantId', response.data.participant.id);
      localStorage.setItem('participantName', response.data.participant.name);
      localStorage.setItem('eventId', response.data.event.id);
      
      // Navigate to live quiz waiting room
      navigate(`/live/${roomCode.trim().toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join room. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-[#aa3bff]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-[#aa3bff]" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Join Quiz</h1>
          <p className="text-gray-500 text-lg">Enter the room code to participate</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <input
              type="text"
              required
              className="w-full px-5 py-4 text-center text-3xl font-bold tracking-[0.2em] uppercase rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 focus:ring-4 focus:ring-[#aa3bff]/20 focus:border-[#aa3bff] outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400"
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>
          
          <div>
            <input
              type="text"
              required
              className="w-full px-5 py-4 text-lg rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 focus:ring-4 focus:ring-[#aa3bff]/20 focus:border-[#aa3bff] outline-none transition-all placeholder:text-gray-400"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={loading || roomCode.length < 6 || name.length < 2}
            className="w-full bg-[#aa3bff] hover:bg-[#9024e6] text-white text-xl font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:scale-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#aa3bff]/30"
          >
            {loading ? 'Joining...' : 'Join Now'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Join;
