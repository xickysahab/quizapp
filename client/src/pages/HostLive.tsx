import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, ChevronRight, ChevronLeft, Users, BarChart3, Radio } from 'lucide-react';
import brandLogo from '../assets/Sahaj spirit.jpeg';
import { socket } from '../socket/socket';
import api from '../services/api';
import { motion } from 'framer-motion';

const HostLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    if (!window.confirm('Are you sure you want to conclude the live quiz and display final analytics?')) return;

    socket.emit('host:endQuiz', id);

    try {
      const res = await api.get(`/analytics/events/${id}/summary`);
      setSummaryData(res.data);
      setShowFinalSummary(true);
    } catch (err) {
      console.error('Failed to load summary analytics', err);
      alert('Failed to load results summary.');
    }
  };

  const handleEndQuiz = () => {
    if (!showFinalSummary && !window.confirm('Are you sure you want to exit the broadcast?')) return;
    if (!showFinalSummary) socket.emit('host:endQuiz', id);
    navigate(`/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EA580C] text-[#FFFFFF] flex items-center justify-center font-serif text-lg italic">
        Initializing live broadcast stage...
      </div>
    );
  }

  if (!event || !event.questions || event.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#EA580C] text-[#FFFFFF] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="font-serif text-2xl">No questions configured for this event.</p>
        <button
          onClick={() => navigate(`/events/${id}`)}
          className="px-6 py-3 rounded-2xl bg-[#06B6D4] text-white font-medium"
        >
          Add Questions First
        </button>
      </div>
    );
  }

  const activeQuestion = currentQuestionIndex >= 0 ? event.questions[currentQuestionIndex] : null;
  const isFinished = currentQuestionIndex >= event.questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#EA580C] text-[#FFFFFF] font-sans relative selection:bg-[#06B6D4]">
      {/* Header Bar */}
      <header className="bg-[#F97316] px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-4">
          <img 
            src={brandLogo} 
            alt="Sahaj Spirit Logo" 
            className="w-9 h-9 rounded-xl object-cover border border-white/20"
          />
          <div>
            <h1 className="font-serif text-xl font-bold text-[#ECFEFF]">{event.title}</h1>
            <div className="flex items-center gap-3 text-xs text-[#67E8F9]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>{participantCount} Joined</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Broadcast</span>
              </span>
            </div>
          </div>
        </div>

        {/* PIN Badge */}
        <div className="text-right flex items-center gap-4">
          <div className="bg-[#FFFFFF]/10 px-5 py-2 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#67E8F9] font-semibold block">
              Join Code
            </span>
            <span className="font-mono text-3xl font-bold tracking-[0.2em] text-[#ECFEFF]">
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
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#ECFEFF]">
                  Collective Results
                </h2>
                <p className="text-sm text-[#67E8F9]">
                  Aggregated response statistics from {summaryData.totalParticipants} connected participants
                </p>
              </div>

              <div className="bg-[#F97316] p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-6">
                <h3 className="font-serif text-2xl font-bold text-[#ECFEFF] border-b border-white/10 pb-4">
                  Response Distribution
                </h3>

                <div className="space-y-4">
                  {summaryData.collective?.optionsText?.map((opt: string, optIdx: number) => {
                    const percentage = summaryData.collective.percentages[optIdx] || 0;
                    const count = summaryData.collective.optionCounts[optIdx] || 0;

                    return (
                      <div
                        key={optIdx}
                        className="relative bg-[#EA580C] border border-white/10 rounded-2xl overflow-hidden p-4 flex items-center justify-between"
                      >
                        {/* Smooth Animated Bar Fill */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-[#06B6D4]/30 transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%` }}
                        ></div>

                        <div className="relative z-10 flex items-center gap-4">
                          <span className="w-9 h-9 rounded-xl bg-[#F97316] border border-white/10 text-[#ECFEFF] font-serif text-sm font-bold flex items-center justify-center">
                            {['A', 'B', 'C', 'D'][optIdx]}
                          </span>
                          <span className="text-base font-medium text-[#FFFFFF]">{opt}</span>
                        </div>

                        <div className="relative z-10 text-right">
                          <span className="font-serif text-2xl font-bold text-[#06B6D4]">
                            {percentage}%
                          </span>
                          <span className="text-xs text-[#67E8F9] block">{count} votes</span>
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
                <h2 className="font-serif text-4xl md:text-6xl font-bold text-[#ECFEFF]">
                  Waiting for participants to join...
                </h2>
                <p className="text-base text-[#67E8F9] max-w-lg mx-auto font-light">
                  Ask your audience to go to the landing page and enter room PIN{' '}
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                    {event.roomCode}
                  </span>
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleNextQuestion}
                  className="px-10 py-5 rounded-2xl bg-[#06B6D4] hover:bg-[#0891B2] text-[#FFFFFF] font-serif text-2xl font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-3"
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
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#06B6D4]">
                  Question {currentQuestionIndex + 1} of {event.questions.length}
                </span>

                <div className="flex items-center gap-2 bg-[#F97316] px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-[#ECFEFF]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>
                    {responsesCount} / {participantCount} Submissions
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#ECFEFF] leading-tight">
                {activeQuestion.text}
              </h2>

              {/* Options Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {activeQuestion.options.map((opt: string, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#F97316] border border-white/10 rounded-2xl p-5 flex items-center gap-4 transition-all hover:border-[#06B6D4]"
                  >
                    <span className="w-10 h-10 rounded-xl bg-[#EA580C] text-[#06B6D4] font-serif text-lg font-bold flex items-center justify-center border border-white/5">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span className="text-lg font-medium text-[#FFFFFF]">{opt}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Control Footer */}
      <footer className="bg-[#F97316] px-8 py-5 flex justify-between items-center border-t border-white/10">
        <button
          onClick={handleEndQuiz}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-[#67E8F9] hover:text-rose-400 text-xs font-semibold transition-all flex items-center gap-2 border border-white/10"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>{showFinalSummary ? 'Exit Cockpit' : 'End Live Quiz'}</span>
        </button>

        {!showFinalSummary && currentQuestionIndex !== -1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFFFFF] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {isFinished ? (
              <button
                onClick={handleFinishAndViewSummary}
                className="px-7 py-3 rounded-2xl bg-[#06B6D4] hover:bg-[#0891B2] text-[#FFFFFF] font-semibold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <span>Conclude & Show Results</span>
                <BarChart3 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-7 py-3 rounded-2xl bg-[#FFFFFF] text-[#0F172A] hover:bg-white font-semibold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </footer>
    </div>
  );
};

export default HostLive;
