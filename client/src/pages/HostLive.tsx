import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, ChevronRight, ChevronLeft, Users, BarChart3 } from 'lucide-react';
import { socket } from '../socket/socket';
import api from '../services/api';

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
      setParticipantCount(response.data.event._count.participants);
      
      // Connect to socket as host
      socket.connect();
      socket.emit('host:join', id);
      
      // Setup listeners
      socket.on('host:participantJoined', () => {
        setParticipantCount(prev => prev + 1);
      });
      
      socket.on('host:newResponse', () => {
        setResponsesCount(prev => prev + 1);
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
      setResponsesCount(0); // Reset responses for new question
      socket.emit('host:nextQuestion', id, event.questions[nextIndex]);
    }
  };

  const handlePrevQuestion = () => {
    if (!event || currentQuestionIndex <= 0) return;
    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    setResponsesCount(0); // Reset responses count view for now
    socket.emit('host:nextQuestion', id, event.questions[prevIndex]); 
  };

  const handleFinishAndViewSummary = async () => {
    if (!window.confirm('Are you sure you want to end the survey and view final results?')) return;
    
    // End the quiz for participants
    socket.emit('host:endQuiz', id);
    
    // Fetch collective summary
    try {
      const res = await api.get(`/analytics/events/${id}/summary`);
      setSummaryData(res.data);
      setShowFinalSummary(true);
    } catch (err) {
      console.error('Failed to load summary analytics', err);
      alert('Failed to load survey results.');
    }
  };

  const handleEndQuiz = () => {
    if (!showFinalSummary && !window.confirm('Are you sure you want to exit?')) return;
    if (!showFinalSummary) socket.emit('host:endQuiz', id);
    navigate(`/dashboard`);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  if (!event || event.questions.length === 0) return <div>No questions available for this event.</div>;

  const activeQuestion = currentQuestionIndex >= 0 ? event.questions[currentQuestionIndex] : null;
  const isFinished = currentQuestionIndex >= event.questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      
      {/* Header Bar */}
      <header className="bg-gray-800 p-4 px-8 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <div className="flex gap-4 text-sm text-gray-400 mt-1">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4"/> {participantCount} Joined</span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Join at Slido with Code</p>
          <p className="text-4xl font-black text-[#aa3bff] tracking-[0.2em]">{event.roomCode}</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 text-center w-full">
        <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
          
          {showFinalSummary && summaryData ? (
            <div className="w-full animate-in fade-in zoom-in duration-500 text-left">
              <div className="flex items-center gap-4 mb-10 justify-center">
                <BarChart3 className="w-10 h-10 text-[#aa3bff]" />
                <h2 className="text-5xl font-bold">Survey Results</h2>
              </div>
              <p className="text-center text-gray-400 text-xl mb-12">Collective results from {summaryData.totalParticipants} participants</p>
              
              <div className="space-y-16 max-w-3xl mx-auto">
                <div className="bg-gray-800 p-8 rounded-3xl border-2 border-gray-700 shadow-xl">
                  <h3 className="text-3xl font-bold mb-8 text-center text-[#aa3bff]">Overall Survey Results</h3>
                  <div className="flex flex-col gap-6">
                    {summaryData.collective.optionsText.map((opt: string, optIdx: number) => {
                      const percentage = summaryData.collective.percentages[optIdx];
                      const count = summaryData.collective.optionCounts[optIdx];
                      
                      return (
                        <div key={optIdx} className="relative bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden text-2xl font-medium text-left flex items-center h-20">
                          {/* Progress Bar Background */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out opacity-20 bg-[#aa3bff]"
                            style={{ width: `${percentage}%` }}
                          ></div>
                          
                          {/* Content */}
                          <div className="relative z-10 flex items-center w-full px-8 justify-between">
                            <div className="flex items-center">
                              <span className="w-12 h-12 rounded-full flex items-center justify-center mr-6 font-bold bg-gray-700 text-gray-300">
                                {['A', 'B', 'C', 'D'][optIdx]}
                              </span>
                              <span className="text-gray-200">{opt}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-3xl text-[#aa3bff] mr-4">
                                {percentage}%
                              </span>
                              <span className="text-sm text-gray-500 block -mt-1">{count} votes</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : currentQuestionIndex === -1 ? (
            <div className="animate-in fade-in zoom-in duration-500">
              <h2 className="text-5xl font-bold mb-8">Waiting for players to join...</h2>
              <button 
                onClick={handleNextQuestion}
                className="bg-green-500 hover:bg-green-600 text-white px-10 py-5 rounded-2xl font-bold text-2xl shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all hover:scale-105 flex items-center gap-3 mx-auto"
              >
                <Play className="w-8 h-8 fill-current" />
                Start Survey
              </button>
            </div>
          ) : (
            <div className="w-full animate-in fade-in slide-in-from-bottom-10 duration-500">
              <div className="flex justify-between items-end mb-8">
                <span className="text-2xl font-bold text-gray-500">Question {currentQuestionIndex + 1} of {event.questions.length}</span>
                <span className="text-2xl font-bold text-[#aa3bff]">{responsesCount} / {participantCount} Responses</span>
              </div>
              
              <h2 className="text-5xl font-bold mb-12 leading-tight">{activeQuestion.text}</h2>
              
              <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
                {activeQuestion.options.map((opt: string, idx: number) => {
                  return (
                    <div key={idx} className="relative bg-gray-800 border-2 border-gray-700 rounded-2xl overflow-hidden text-2xl font-medium text-left flex items-center h-20">
                      {/* Content */}
                      <div className="relative z-10 flex items-center w-full px-6 justify-between">
                        <div className="flex items-center">
                          <span className="w-12 h-12 rounded-full flex items-center justify-center mr-6 font-bold bg-gray-700 text-gray-400">
                            {['A', 'B', 'C', 'D'][idx]}
                          </span>
                          <span>{opt}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="bg-gray-800 p-6 flex justify-between items-center border-t border-gray-700">
        <button 
          onClick={handleEndQuiz}
          className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <Square className="w-5 h-5 fill-current" />
          {showFinalSummary ? 'Exit to Dashboard' : 'End Early'}
        </button>

        {!showFinalSummary && currentQuestionIndex !== -1 && (
          <div className="flex gap-4">
            <button 
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${currentQuestionIndex === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-white shadow-lg'}`}
            >
              <ChevronLeft className="w-5 h-5" />
              Prev
            </button>
            
            {isFinished ? (
              <button 
                onClick={handleFinishAndViewSummary}
                className="bg-[#aa3bff] hover:bg-[#9024e6] text-white px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg shadow-[#aa3bff]/30"
              >
                Finish & View Results
                <BarChart3 className="w-6 h-6 ml-2" />
              </button>
            ) : (
              <button 
                onClick={handleNextQuestion}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg"
              >
                Next
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </footer>

    </div>
  );
};

export default HostLive;
