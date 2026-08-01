import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, ChevronRight, ChevronLeft, Users, BarChart3, Radio, Award, LogOut } from 'lucide-react';
import brandLogo from '../assets/Sahaj spirit.jpeg';
import { socket } from '../socket/socket';
import api from '../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const HostLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: 'conclude' | 'exit' | null}>({ isOpen: false, action: null });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [participantCount, setParticipantCount] = useState(0);
  const [responsesCount, setResponsesCount] = useState(0);

  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data.event);
      setParticipantCount(response.data.event._count?.participants || 0);

      // Connect socket
      socket.connect();
      socket.emit('host:join', id);

      // Setup socket listeners
      socket.on('host:participantJoined', () => {
        setParticipantCount((prev) => prev + 1);
      });

      socket.on('host:newResponse', () => {
        setResponsesCount((prev) => prev + 1);
      });
    } catch (error) {
      console.error('Failed to fetch event', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      socket.off('host:participantJoined');
      socket.off('host:newResponse');
      socket.disconnect();
    };
  }, []);

  const handleNextQuestion = () => {
    if (!event) return;
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < event.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setResponsesCount(0);
      socket.emit('host:nextQuestion', id, event.questions[nextIndex]);
    }
  };

  const handlePrevQuestion = () => {
    if (!event || currentQuestionIndex <= 0) return;
    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    setResponsesCount(0);
    socket.emit('host:nextQuestion', id, event.questions[prevIndex]);
  };

  const handleFinishAndViewSummary = async () => {
    setConfirmModal({ isOpen: true, action: 'conclude' });
  };

  const executeConclude = async () => {
    socket.emit('host:endQuiz', id);

    try {
      const res = await api.get(`/analytics/events/${id}/summary`);
      setSummaryData(res.data);
      setShowFinalSummary(true);
    } catch (err) {
      console.error('Failed to load summary analytics', err);
      toast.error('Failed to load results summary.');
    }
  };

  const handleEndQuiz = () => {
    if (!showFinalSummary) {
      setConfirmModal({ isOpen: true, action: 'exit' });
      return;
    }
    executeExit();
  };

  const executeExit = () => {
    if (!showFinalSummary) socket.emit('host:endQuiz', id);
    navigate(`/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex items-center justify-center font-serif text-lg italic">
        Initializing live broadcast stage...
      </div>
    );
  }

  if (!event || !event.questions || event.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="font-serif text-2xl">No questions configured for this event.</p>
        <button
          onClick={() => navigate(`/events/${id}`)}
          className="px-6 py-3 rounded-2xl bg-[#06B6D4] text-white font-medium shadow-md"
        >
          Add Questions First
        </button>
      </div>
    );
  }

  const activeQuestion = currentQuestionIndex >= 0 ? event.questions[currentQuestionIndex] : null;
  const isFinished = currentQuestionIndex >= event.questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#0F172A] font-sans relative selection:bg-[#E0F2FE]">
      {/* Header Bar */}
      <header className="bg-[#FFFFFF] px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-[#E0F2FE] shadow-sm">
        <div className="flex items-center gap-4">
          <img 
            src={brandLogo} 
            alt="Sahaj Spirit Logo" 
            className="w-9 h-9 rounded-xl object-cover border border-[#E0F2FE]"
          />
          <div>
            <h1 className="font-serif text-xl font-bold text-[#0F172A]">{event.title}</h1>
            <div className="flex items-center gap-3 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>{participantCount} Joined</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>Live Broadcast</span>
              </span>
            </div>
          </div>
        </div>

        {/* PIN Badge */}
        <div className="text-right flex items-center gap-4">
          <div className="bg-[#F0F9FF] px-5 py-2 rounded-2xl border border-[#E0F2FE] text-center">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#06B6D4] font-semibold block">
              Join Code
            </span>
            <span className="font-mono text-3xl font-bold tracking-[0.2em] text-[#0F172A]">
              {event.roomCode}
            </span>
          </div>
        </div>
      </header>

      {/* Stage Main View */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 text-center w-full flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          {showFinalSummary && summaryData ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-left space-y-8"
            >
              <div className="text-center space-y-2 mb-10">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#06B6D4]">
                  Live Session Summary
                </span>
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0F172A]">
                  Collective Results
                </h2>
                <p className="text-sm text-[#475569]">
                  Aggregated response statistics from {summaryData.totalParticipants} connected participants
                </p>
              </div>

              <div className="bg-[#FFFFFF] p-8 md:p-10 rounded-3xl border border-[#E0F2FE] shadow-lux-lg space-y-6">
                <h3 className="font-serif text-2xl font-bold text-[#0F172A] border-b border-[#E0F2FE] pb-4">
                  Your result of Sahaj Analysis.
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      optIndex: 0,
                      letter: 'A',
                      text: 'You need the learnings of Sahajta urgently.',
                      alert: 'RED ALERT',
                      colors: { bg: 'bg-[#EAB8B8]/30', border: 'border-[#EAB8B8]/50', text: 'text-[#4A3525]', alertBg: 'bg-[#D14949]', letterBg: 'bg-[#D14949]' }
                    },
                    {
                      optIndex: 3,
                      letter: 'D',
                      text: 'There are many inner complications. Sahajta is here to help you',
                      alert: 'ORANGE ALERT',
                      colors: { bg: 'bg-[#E3C69D]/30', border: 'border-[#E3C69D]/50', text: 'text-[#4A3525]', alertBg: 'bg-[#DD8931]', letterBg: 'bg-[#DD8931]' }
                    },
                    {
                      optIndex: 2,
                      letter: 'C',
                      text: 'There is some confusion, but you are moving closer to Sahajta.',
                      alert: 'YELLOW ALERT',
                      colors: { bg: 'bg-[#E3DC9D]/30', border: 'border-[#E3DC9D]/50', text: 'text-[#4A3525]', alertBg: 'bg-[#D9AC34]', letterBg: 'bg-[#D9AC34]' }
                    },
                    {
                      optIndex: 1,
                      letter: 'B',
                      text: 'You are able to being fully Sahaj.',
                      alert: 'GREEN ALERT',
                      colors: { bg: 'bg-[#A8D8D3]/30', border: 'border-[#A8D8D3]/50', text: 'text-[#4A3525]', alertBg: 'bg-[#55A39E]', letterBg: 'bg-[#55A39E]' }
                    }
                  ].map((card, idx) => {
                    const percentage = summaryData.collective?.percentages?.[card.optIndex] || 0;
                    const count = summaryData.collective?.optionCounts?.[card.optIndex] || 0;

                    return (
                      <div
                        key={idx}
                        className={`relative p-6 rounded-2xl border flex flex-col items-center text-center gap-6 shadow-sm h-full ${card.colors.bg} ${card.colors.border}`}
                      >
                        {/* Percentage Overlay */}
                        <div className="absolute top-4 right-5 text-right z-20">
                          <span className={`font-serif text-2xl font-bold ${card.colors.text}`}>
                            {percentage}%
                          </span>
                          <span className={`text-[10px] uppercase font-bold block ${card.colors.text} opacity-60 -mt-1`}>{count} votes</span>
                        </div>

                        {/* Top Badge: Mostly + Letter */}
                        <div className="flex flex-col items-center -space-y-3 relative z-10 pt-2">
                          <div className={`px-6 py-1.5 rounded-full border bg-white/70 backdrop-blur-sm shadow-sm font-serif text-sm font-semibold tracking-wide ${card.colors.text} ${card.colors.border}`}>
                            Mostly
                          </div>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-base font-bold shadow-md z-10 text-white ${card.colors.alertBg} border-2 border-white`}>
                            {card.letter}
                          </div>
                        </div>
                        
                        {/* Main Text Content */}
                        <div className="flex-1 flex items-center justify-center py-2">
                          <p className={`font-serif text-[1.1rem] md:text-xl italic font-medium leading-relaxed ${card.colors.text} px-2 drop-shadow-sm`}>
                            {card.text}
                          </p>
                        </div>

                        {/* Alert Badge */}
                        <div className={`px-5 py-2 rounded font-bold text-xs md:text-sm tracking-[0.15em] text-white shadow-md mt-auto ${card.colors.alertBg}`}>
                          {card.alert}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : currentQuestionIndex === -1 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#06B6D4]">
                  Lobby Stage
                </span>
                <h2 className="font-serif text-4xl md:text-6xl font-bold text-[#0F172A]">
                  Waiting for participants to join...
                </h2>
                <p className="text-base text-[#475569] max-w-lg mx-auto font-light">
                  Ask your audience to go to the landing page and enter room PIN{' '}
                  <span className="font-mono font-bold text-[#0F172A] bg-[#F0F9FF] px-2 py-0.5 rounded-md border border-[#E0F2FE]">
                    {event.roomCode}
                  </span>
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleNextQuestion}
                  className="px-10 py-5 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-[#FFFFFF] font-serif text-2xl font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current text-white" />
                  <span>Begin Quiz Broadcast</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 text-left"
            >
              {/* Question Index & Live Response Count */}
              <div className="flex items-center justify-between border-b border-[#E0F2FE] pb-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#06B6D4]">
                  Question {currentQuestionIndex + 1} of {event.questions.length}
                </span>

                <div className="flex items-center gap-2 bg-[#F0F9FF] px-4 py-2 rounded-full border border-[#E0F2FE] text-xs font-medium text-[#0F172A]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>
                    {responsesCount} / {participantCount} Submissions
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight">
                {activeQuestion.text}
              </h2>

              {/* Options Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {activeQuestion.options.map((opt: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#FFFFFF] border border-[#E0F2FE] rounded-2xl p-5 flex items-center gap-4 transition-all hover:border-[#06B6D4] hover:bg-[#F0F9FF] shadow-sm"
                  >
                    <span className="w-10 h-10 rounded-xl bg-[#ECFEFF] text-[#06B6D4] font-serif text-lg font-bold flex items-center justify-center border border-[#E0F2FE]">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span className="text-lg font-medium text-[#0F172A]">{opt}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Control Footer */}
      <footer className="bg-[#FFFFFF] px-8 py-5 flex justify-between items-center border-t border-[#E0F2FE] shadow-sm">
        <button
          onClick={handleEndQuiz}
          className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-all flex items-center gap-2 border border-rose-200"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>{showFinalSummary ? 'Exit Cockpit' : 'End Live Quiz'}</span>
        </button>

        {!showFinalSummary && currentQuestionIndex !== -1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-5 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F9FF] border border-[#E0F2FE] text-[#475569] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {isFinished ? (
              <button
                onClick={handleFinishAndViewSummary}
                className="px-7 py-3 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-[#FFFFFF] font-semibold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <span>Conclude & Show Results</span>
                <BarChart3 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-7 py-3 rounded-2xl bg-[#06B6D4] text-[#FFFFFF] hover:bg-[#0891B2] font-semibold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </footer>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.action === 'conclude' ? 'Conclude Quiz' : 'Exit Broadcast'}
        message={
          confirmModal.action === 'conclude'
            ? 'Are you sure you want to conclude the live quiz and display final analytics?'
            : 'Are you sure you want to exit the broadcast?'
        }
        icon={confirmModal.action === 'conclude' ? <Award className="w-7 h-7" /> : <LogOut className="w-7 h-7" />}
        onConfirm={() => {
          if (confirmModal.action === 'conclude') executeConclude();
          else if (confirmModal.action === 'exit') executeExit();
        }}
        onCancel={() => setConfirmModal({ isOpen: false, action: null })}
        isDestructive={confirmModal.action === 'exit'}
      />
    </div>
  );
};

export default HostLive;
