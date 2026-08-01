import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, Award, ArrowLeft } from 'lucide-react';
import brandLogo from '../assets/Sahaj spirit.jpeg';
import { socket } from '../socket/socket';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const LiveQuiz: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [participantName, setParticipantName] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [currentSelection, setCurrentSelection] = useState<number | null>(null);
  const [quizEnded, setQuizEnded] = useState(false);

  useEffect(() => {
    const pName = localStorage.getItem('participantName');
    const pId = localStorage.getItem('participantId');
    const eId = localStorage.getItem('eventId');

    if (!pName || !pId || !eId) {
      navigate('/');
      return;
    }

    setParticipantName(pName);
    setParticipantId(pId);
    setEventId(eId);

    // Connect Socket
    socket.connect();
    socket.emit('participant:join', eId, pId);

    // Socket Listeners
    socket.on('participant:questionActive', ({ question, selectedOption }) => {
      setCurrentSelection(selectedOption !== undefined ? selectedOption : null);
      setActiveQuestion(question);
    });

    socket.on('participant:quizEnded', () => {
      setQuizEnded(true);
      setActiveQuestion(null);
    });

    return () => {
      socket.off('participant:questionActive');
      socket.off('participant:quizEnded');
      socket.disconnect();
    };
  }, [navigate]);

  const submitAnswer = async (index: number) => {
    if (!activeQuestion) return;

    setCurrentSelection(index);

    try {
      await api.post('/participants/response', {
        participantId,
        questionId: activeQuestion.id,
        selectedOption: index,
      });
      socket.emit('participant:submitAnswer', eventId);
    } catch (error) {
      console.error('Failed to submit response', error);
      alert('Unable to save response. The question may have been closed by the host.');
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
          <span className="font-serif font-bold text-sm text-[#0F172A]">PULSE</span>
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
              className="w-full max-w-5xl mx-auto"
            >
              {/* SAHAJOMETER CARD UI */}
              <div className="bg-[#E4F1EF] rounded-[2rem] p-4 md:p-8 pt-8 relative shadow-md border border-[#D0E3E1]">
                {/* SAHAJOMETER Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00BFA5] text-white px-8 py-2 font-sans font-bold tracking-widest text-sm uppercase rounded-sm shadow-sm">
                  SAHAJOMETER
                </div>

                {/* Top Question Container */}
                <div className="bg-[#F6F5F2] rounded-2xl border border-[#DEDCD6] p-5 md:p-8 mb-6 flex flex-col md:flex-row gap-6 items-center min-h-[200px]">
                  {/* Question Text */}
                  <div className={`flex-1 ${!activeQuestion.imageUrl ? 'text-center' : 'text-left'}`}>
                    <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#4E342E] leading-tight">
                      {activeQuestion.text}
                    </h2>
                  </div>
                  
                  {/* Image */}
                  {activeQuestion.imageUrl && (
                    <div className="w-full md:w-[40%] flex-shrink-0">
                      <img 
                        src={activeQuestion.imageUrl} 
                        alt="Question Reference" 
                        className="w-full h-auto rounded-xl object-cover shadow-sm border border-[#E5E5E5]"
                      />
                    </div>
                  )}
                </div>

                {/* Options 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeQuestion.options.map((opt: string, idx: number) => {
                    const isSelected = currentSelection === idx;
                    const colors = [
                      'bg-[#AEE2D9]', // A: Mint Green
                      'bg-[#BDCCD4]', // B: Steel Blue
                      'bg-[#F3D7B5]', // C: Light Peach
                      'bg-[#D3EEF4]'  // D: Light Cyan
                    ];
                    return (
                      <button
                        key={idx}
                        onClick={() => submitAnswer(idx)}
                        className={`${colors[idx]} rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 transition-transform hover:scale-[1.02] shadow-sm border-[3px] relative ${
                          isSelected ? 'border-[#0097A7] scale-[1.02] ring-4 ring-[#0097A7]/20' : 'border-transparent'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-full font-sans text-xs font-bold flex items-center justify-center shadow-sm ${
                          isSelected ? 'bg-[#0097A7] text-white' : 'bg-[#0097A7]/80 text-white'
                        }`}>
                          {['A', 'B', 'C', 'D'][idx]}
                        </span>
                        <span className="font-serif text-xl font-bold italic text-[#4E342E]">
                          {opt}
                        </span>
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-[#0097A7]">
                            <CheckCircle2 className="w-5 h-5 fill-current text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentSelection !== null && (
                  <div className="pt-6 text-center">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#00796B] bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-[#0097A7]/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Response recorded — You may update until host advances</span>
                    </span>
                  </div>
                )}
                
                {/* Footer Tag */}
                <div className="text-center mt-6 text-[#795548] font-sans text-xs italic opacity-80">
                  Follow @sahajspirit
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default LiveQuiz;
