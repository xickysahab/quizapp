import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, Award, ArrowLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import brandLogo from '../assets/sahaj-spirit.jpeg';
import { socket, connectSocket } from '../socket/socket';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const LiveQuiz: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [participantName, setParticipantName] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [joinToken, setJoinToken] = useState<string | null>(null);

  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [currentSelection, setCurrentSelection] = useState<number | null>(null);
  const [quizEnded, setQuizEnded] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const pName = localStorage.getItem('participantName');
    const pId = localStorage.getItem('participantId');
    const eId = localStorage.getItem('eventId');
    const pToken = localStorage.getItem('participantToken');

    if (!pName || !pId || !eId) {
      navigate('/');
      return;
    }

    setParticipantName(pName);
    setParticipantId(pId);
    setEventId(eId);
    setJoinToken(pToken);

    connectSocket();

    // Server-side room membership does not survive a dropped connection, so the
    // join has to be replayed on every (re)connect or this participant silently
    // stops receiving questions.
    const joinRoom = () => {
      socket.emit('participant:join', eId, pId, pToken ?? undefined);
    };
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    const onQuestionActive = ({
      question,
      selectedOption,
      startedAt,
    }: {
      question: any;
      selectedOption?: number | null;
      startedAt?: number | null;
    }) => {
      setCurrentSelection(selectedOption !== undefined && selectedOption !== null ? selectedOption : null);
      setActiveQuestion(question);
      setQuestionStartedAt(startedAt ?? Date.now());
      setTimeLeft(question?.timeLimit && question.timeLimit > 0 ? question.timeLimit : null);
    };

    const onQuizEnded = () => {
      setQuizEnded(true);
      setActiveQuestion(null);
    };

    const onRejected = ({ message }: { message?: string }) => {
      toast.error(message || 'This session is no longer valid. Please join again.');
      localStorage.removeItem('participantId');
      localStorage.removeItem('participantName');
      localStorage.removeItem('eventId');
      localStorage.removeItem('participantToken');
      navigate('/');
    };

    socket.on('participant:questionActive', onQuestionActive);
    socket.on('participant:quizEnded', onQuizEnded);
    socket.on('participant:rejected', onRejected);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('participant:questionActive', onQuestionActive);
      socket.off('participant:quizEnded', onQuizEnded);
      socket.off('participant:rejected', onRejected);
      socket.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    if (!activeQuestion?.timeLimit) {
      setTimeLeft(null);
      return;
    }
    const start = questionStartedAt ?? Date.now();
    const tick = () => {
      const remaining = Math.max(
        0,
        activeQuestion.timeLimit - Math.floor((Date.now() - start) / 1000)
      );
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [activeQuestion?.id, activeQuestion?.timeLimit, questionStartedAt]);

  const timeExpired = timeLeft === 0;

  const submitAnswer = async (index: number) => {
    if (!activeQuestion || timeExpired) return;

    setCurrentSelection(index);

    try {
      await api.post('/participants/response', {
        participantId,
        questionId: activeQuestion.id,
        selectedOption: index,
        joinToken: joinToken ?? undefined,
      });
      socket.emit('participant:submitAnswer', eventId, participantId, joinToken ?? undefined);
    } catch (error) {
      console.error('Failed to submit response', error);
      toast.error('Unable to save response. The question may have been closed by the host.');
    }
  };

  if (quizEnded) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col items-center justify-center p-6 font-sans relative selection:bg-[#E0F2FE] bg-ambient-glow">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-[#FFFFFF] rounded-3xl p-10 text-center shadow-lux-lg border border-[#E0F2FE] space-y-6"
        >
          <div className="w-16 h-16 rounded-full bg-[#ECFEFF] text-[#06B6D4] flex items-center justify-center mx-auto shadow-sm">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#06B6D4] uppercase">
              Session Concluded
            </span>
            <h1 className="font-serif text-4xl font-bold text-[#0F172A] mt-1">
              Quiz Completed!
            </h1>
            <p className="text-sm text-[#475569] mt-2">
              Thank you for participating, <span className="font-semibold text-[#0F172A]">{participantName}</span>. Your responses were recorded.
            </p>
          </div>

          <div className="pt-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-[#FFFFFF] font-medium text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-[#06B6D4]" />
              <span>Return to Home</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col items-center justify-center p-6 font-sans relative selection:bg-[#E0F2FE] bg-ambient-glow">
      {/* Participant Top Header */}
      <div className="fixed top-6 left-6 right-6 max-w-xl mx-auto flex items-center justify-between px-6 py-3 rounded-2xl bg-[#FFFFFF]/80 backdrop-blur-md border border-[#E0F2FE] shadow-lux z-20">
        <div className="flex items-center gap-2">
          <img src={brandLogo} alt="Sahaj Spirit Logo" className="w-5 h-5 rounded-md object-cover border border-[#E0F2FE]" />
          <span className="font-serif font-bold text-sm text-[#0F172A]">SAHAJOMETER</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#475569]">
            Player: <strong className="text-[#0F172A]">{participantName}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#F0F9FF] text-[#06B6D4] font-mono font-bold">
            {roomCode}
          </span>
        </div>
      </div>

      <main className="max-w-xl w-full pt-16">
        <AnimatePresence mode="wait">
          {!activeQuestion ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-[#FFFFFF] rounded-3xl p-10 text-center shadow-lux-lg border border-[#E0F2FE] space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-[#F0F9FF] text-[#06B6D4] flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-[#06B6D4] uppercase">
                  Connected & Ready
                </span>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0F172A]">
                  You're in, {participantName}!
                </h1>
                <p className="text-sm text-[#475569] max-w-sm mx-auto">
                  Waiting for the host to present the next question...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeQuestion.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-[#FFFFFF] rounded-3xl p-8 md:p-10 shadow-lux-lg border border-[#E0F2FE] space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-[#06B6D4] uppercase">
                    Active Question
                  </span>
                  <h2 className="font-serif text-3xl font-bold text-[#0F172A] mt-1 leading-snug">
                    {activeQuestion.text}
                  </h2>
                </div>
                {timeLeft !== null && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${
                    timeExpired
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-[#FFF7ED] border-[#FFEDD5] text-[#EA580C]'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeExpired ? 'Time up' : `${timeLeft}s`}</span>
                  </div>
                )}
              </div>

              {/* Options List */}
              <div className="space-y-3.5 pt-2">
                {activeQuestion.options.map((opt: string, idx: number) => {
                  const isSelected = currentSelection === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => submitAnswer(idx)}
                      disabled={timeExpired}
                      className={`w-full p-4.5 rounded-2xl text-left font-medium text-base transition-all flex items-center justify-between border ${
                        isSelected
                          ? 'bg-[#ECFEFF] border-[#06B6D4] text-[#0F172A] shadow-sm font-semibold'
                          : 'bg-[#FFFFFF] border-[#E0F2FE] text-[#334155] hover:border-[#D8CCC0] hover:bg-[#F0F9FF]'
                      } ${timeExpired ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-8 h-8 rounded-full text-xs font-serif font-bold flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-[#06B6D4] text-white' : 'bg-[#E0F2FE] text-[#475569]'
                          }`}
                        >
                          {['A', 'B', 'C', 'D'][idx]}
                        </span>
                        <span>{opt}</span>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#06B6D4]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {currentSelection !== null && !timeExpired && (
                <div className="pt-2 text-center">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#06B6D4] bg-[#ECFEFF] px-4 py-2 rounded-full border border-[#E0F2FE]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Response recorded — You may update until host advances</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default LiveQuiz;
