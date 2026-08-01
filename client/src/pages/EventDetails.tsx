import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft, Plus, Edit2, Trash2, Play, Clock, Download, CheckCircle, HelpCircle } from 'lucide-react';
import QuestionForm from '../components/QuestionForm';
import { motion, AnimatePresence } from 'framer-motion';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Failed to fetch event details', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (data: any) => {
    await api.post('/questions', { ...data, eventId: id });
    fetchEventDetails();
  };

  const handleEditQuestion = async (data: any) => {
    await api.put(`/questions/${editingQuestion.id}`, data);
    fetchEventDetails();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/questions/${questionId}`);
      fetchEventDetails();
    } catch (error) {
      console.error('Failed to delete question', error);
    }
  };

  const openAddModal = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const openEditModal = (q: any) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] text-[#1C1917] flex items-center justify-center font-serif text-lg italic">
        Loading event details...
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#1C1917] flex flex-col font-sans relative selection:bg-[#E8DFD5]">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#78716C] hover:text-[#1C1917] mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        {/* Event Header Banner Card */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 md:p-10 shadow-lux border border-[#E8DFD5] mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6D46]">
                Event Studio
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FAF8F6] border border-[#E8DFD5] text-xs font-mono font-bold text-[#1C1917]">
                PIN: {event.roomCode}
              </span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1C1917]">
              {event.title}
            </h1>
            <p className="text-sm text-[#78716C] leading-relaxed">
              Share the PIN code <span className="font-mono font-bold text-[#1C1917] bg-[#FAF8F6] px-2 py-0.5 rounded-md border border-[#E8DFD5]">{event.roomCode}</span> with your participants to join live.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
            <button
              onClick={() => navigate(`/host/live/${id}`)}
              className="bg-[#2D2A26] hover:bg-[#1C1917] text-[#FAF8F6] px-6 py-4 rounded-2xl font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 group"
            >
              <Play className="w-4 h-4 text-[#8C6D46] fill-[#8C6D46] group-hover:scale-110 transition-transform" />
              <span>Broadcast Live Quiz</span>
            </button>

            <button
              onClick={async () => {
                try {
                  const response = await api.get(`/analytics/events/${id}/export`, { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_Analytics.csv`);
                  document.body.appendChild(link);
                  link.click();
                  link.parentNode?.removeChild(link);
                } catch (error: any) {
                  console.error('Download error', error);
                  alert(error.response?.data?.message || 'Failed to download analytics report');
                }
              }}
              className="bg-[#F5F0EB] hover:bg-[#EFE7DE] text-[#44403C] px-6 py-3 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-[#E8DFD5]"
            >
              <Download className="w-3.5 h-3.5 text-[#8C6D46]" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* Questions Header & Add Button */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E8DFD5]">
          <div>
            <h2 className="font-serif text-3xl font-bold text-[#1C1917]">
              Questions & Polls ({event.questions.length})
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Draft questions to be presented sequentially during the live session
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="bg-[#8C6D46] hover:bg-[#9B7A50] text-[#FAF8F6] px-5 py-3 rounded-2xl font-medium text-sm transition-all shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>

        {/* Questions List */}
        {event.questions.length === 0 ? (
          <div className="text-center bg-[#FFFFFF] rounded-3xl border border-[#E8DFD5] p-16 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#8C6D46] mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">No questions added yet</h3>
            <p className="text-sm text-[#78716C] max-w-md mx-auto">
              Add your first multiple-choice question or poll prompt to start your quiz collection.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8C6D46] hover:underline pt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Question</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {event.questions.map((q: any, index: number) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="bg-[#FFFFFF] rounded-3xl border border-[#E8DFD5] p-7 shadow-lux flex flex-col md:flex-row gap-6 justify-between items-start"
                >
                  <div className="flex-1 space-y-4">
                    {/* Header: Question Number & Title */}
                    <div className="flex items-start gap-4">
                      <span className="w-8 h-8 rounded-full bg-[#2D2A26] text-[#FAF8F6] text-xs font-serif font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        Q{index + 1}
                      </span>
                      <div className="space-y-1">
                        <h3 className="font-serif text-2xl font-bold text-[#1C1917] leading-snug">
                          {q.text}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-[#78716C]">
                          <Clock className="w-3.5 h-3.5 text-[#8C6D46]" />
                          <span>{q.timeLimit > 0 ? `${q.timeLimit} seconds timer` : 'Manual advance (No timer)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isCorrect = q.correctOption === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`p-3.5 rounded-2xl border text-sm transition-all flex items-center gap-3 ${
                              isCorrect
                                ? 'bg-[#F4ECE1] border-[#8C6D46] text-[#1C1917] font-semibold shadow-xs'
                                : 'bg-[#FAF8F6] border-[#E8DFD5] text-[#44403C]'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                              isCorrect ? 'bg-[#8C6D46] text-white' : 'bg-[#E8DFD5] text-[#78716C]'
                            }`}>
                              {['A', 'B', 'C', 'D'][optIdx]}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && (
                              <CheckCircle className="w-4 h-4 text-[#8C6D46]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Question Controls */}
                  <div className="flex md:flex-col gap-2 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[#E8DFD5] md:pl-6 w-full md:w-auto justify-end">
                    <button
                      onClick={() => openEditModal(q)}
                      className="p-3 rounded-2xl bg-[#FAF8F6] hover:bg-[#F5F0EB] text-[#78716C] hover:text-[#1C1917] border border-[#E8DFD5] transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-3 rounded-2xl bg-[#FAF8F6] hover:bg-rose-50 text-[#78716C] hover:text-rose-600 border border-[#E8DFD5] hover:border-rose-200 transition-colors"
                      title="Delete Question"
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

      {isModalOpen && (
        <QuestionForm
          initialData={editingQuestion}
          onClose={() => setIsModalOpen(false)}
          onSubmit={editingQuestion ? handleEditQuestion : handleAddQuestion}
        />
      )}
    </div>
  );
};

export default EventDetails;
