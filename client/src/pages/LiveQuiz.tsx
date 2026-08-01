import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { socket } from '../socket/socket';
import api from '../services/api';

const LiveQuiz: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
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
    socket.on('participant:questionActive', ({ question, hasAnswered: alreadyAnswered }) => {
      setHasAnswered(alreadyAnswered || false);
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
    if (hasAnswered || !activeQuestion) return;
    try {
      await api.post('/participants/response', {
        participantId,
        questionId: activeQuestion.id,
        selectedOption: index
      });
      setHasAnswered(true);
      socket.emit('participant:submitAnswer', eventId);
    } catch (error) {
      console.error('Failed to submit', error);
      alert('Error submitting answer.');
    }
  };

  if (quizEnded) {
    return (
      <div className="min-h-screen bg-[#aa3bff] flex flex-col items-center justify-center p-4 text-white text-center">
        <h1 className="text-4xl font-bold mb-4">Quiz Ended!</h1>
        <p className="text-xl">Thanks for playing, {participantName}!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#aa3bff] flex flex-col items-center justify-center p-4 text-white text-center">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 shadow-2xl">
        <h2 className="text-2xl font-medium text-white/80 mb-2">Room Code: {roomCode}</h2>
        
        {!activeQuestion ? (
          <>
            <h1 className="text-4xl font-bold mb-10">Quiz Time!</h1>
            <div className="flex justify-center mb-8">
              <Loader2 className="w-16 h-16 animate-spin text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">You're in, {participantName}!</h3>
            <p className="text-white/80 text-lg">Waiting for the host to start the quiz...</p>
          </>
        ) : (
          <div className="text-left">
            <h3 className="text-2xl font-bold mb-6 text-white">{activeQuestion.text}</h3>
            <div className="space-y-3">
              {activeQuestion.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  disabled={hasAnswered}
                  className={`w-full p-4 rounded-xl text-lg font-medium transition-all ${
                    hasAnswered 
                      ? 'bg-white/20 text-white/50 cursor-not-allowed' 
                      : 'bg-white text-[#aa3bff] hover:bg-gray-100 shadow-lg'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {hasAnswered && (
              <p className="mt-6 text-center font-bold">Answer locked! Waiting for others...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveQuiz;
