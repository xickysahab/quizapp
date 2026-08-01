import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Plus, Edit2, Trash2, PlayCircle, Clock } from 'lucide-react';
import QuestionForm from '../components/QuestionForm';

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
      navigate('/dashboard'); // Go back if error
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
    if (!window.confirm('Delete this question?')) return;
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#16171d] text-gray-900 dark:text-gray-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white dark:bg-[#1f2028] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <span className="bg-[#aa3bff]/10 text-[#aa3bff] px-3 py-1 rounded-md text-sm font-bold tracking-widest">
                {event.roomCode}
              </span>
            </div>
            <p className="text-gray-500">Participants will join using this room code.</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate(`/host/live/${id}`)}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-500/30 transition-all flex items-center gap-3 w-full justify-center">
              <PlayCircle className="w-6 h-6" />
              Host Live Quiz
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
                  alert(error.response?.data?.message || 'Failed to download analytics');
                }
              }}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-8 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 w-full">
              Download CSV Report
            </button>
          </div>
        </div>

        {/* Questions Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Quiz Questions ({event.questions.length})</h2>
          <button 
            onClick={openAddModal}
            className="bg-[#aa3bff] hover:bg-[#9024e6] text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        </div>

        {event.questions.length === 0 ? (
          <div className="text-center bg-white dark:bg-[#1f2028] border border-gray-100 dark:border-gray-800 rounded-3xl p-16">
            <h3 className="text-xl font-semibold mb-2">No questions yet</h3>
            <p className="text-gray-500 mb-6">Add multiple-choice questions to start your quiz.</p>
            <button onClick={openAddModal} className="text-[#aa3bff] font-medium hover:underline">
              + Create first question
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {event.questions.map((q: any, index: number) => (
              <div key={q.id} className="bg-white dark:bg-[#1f2028] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold px-3 py-1 rounded-lg">Q{index + 1}</span>
                    <h3 className="text-xl font-semibold">{q.text}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {q.options.map((opt: string, optIdx: number) => (
                      <div key={optIdx} className={`p-3 rounded-xl border ${q.correctOption === optIdx ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50 text-green-800 dark:text-green-300 font-medium' : 'bg-gray-50 border-gray-100 dark:bg-[#16171d] dark:border-gray-800 text-gray-600 dark:text-gray-400'}`}>
                        <span className="font-bold mr-2 opacity-50">{['A', 'B', 'C', 'D'][optIdx]}.</span> {opt}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{q.timeLimit} seconds</span>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 justify-start border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6">
                  <button onClick={() => openEditModal(q)} className="p-3 bg-gray-50 dark:bg-[#16171d] text-gray-600 hover:text-[#aa3bff] hover:bg-[#aa3bff]/10 rounded-xl transition-colors" title="Edit">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-3 bg-gray-50 dark:bg-[#16171d] text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

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
