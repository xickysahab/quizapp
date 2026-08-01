import React, { useState, useEffect } from 'react';
import { X, Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuestionFormProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setText(initialData.text);
      setOptions(initialData.options.length ? initialData.options : ['', '', '', '']);
      setCorrectOption(initialData.correctOption !== undefined ? initialData.correctOption : null);
      setTimeLimit(initialData.timeLimit || 0);
    }
  }, [initialData]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || options.some((opt) => !opt.trim())) {
      alert('Please fill in the question title and all four options.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ text, options, correctOption, timeLimit });
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to save question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-[#FAF8F6] rounded-3xl max-w-2xl w-full p-8 shadow-lux-lg border border-[#E8DFD5] relative my-8"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-5 mb-6 border-b border-[#E8DFD5]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6D46]">
              Question Builder
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#1C1917]">
              {initialData ? 'Edit Question' : 'Craft New Question'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-[#F5F0EB] hover:bg-[#EFE7DE] text-[#78716C] hover:text-[#1C1917] rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2">
              Question Title
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="E.g., What is the capital of France?"
                className="w-full px-5 py-3.5 rounded-2xl border border-[#E8DFD5] bg-[#FFFFFF] text-[#1C1917] text-base placeholder:text-[#A8A29E] focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] outline-none transition-all shadow-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                Answer Options
              </label>
              <span className="text-xs text-[#8C6D46] italic">
                Tap radio icon to mark the correct answer
              </span>
            </div>

            <div className="space-y-3">
              {options.map((opt, idx) => {
                const isSelected = correctOption === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-[#8C6D46] bg-[#F4ECE1] shadow-sm'
                        : 'border-[#E8DFD5] bg-[#FFFFFF] hover:border-[#D8CCC0]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectOption(isSelected ? null : idx)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#8C6D46] text-white shadow-sm'
                          : 'border-2 border-[#D8CCC0] hover:border-[#8C6D46] text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-transparent px-2 py-1 outline-none text-[#1C1917] font-medium placeholder:text-[#A8A29E]"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                    />
                    {isSelected && (
                      <span className="text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full bg-[#8C6D46]/10 text-[#8C6D46]">
                        Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Limit */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-2">
              <Clock className="w-3.5 h-3.5 text-[#8C6D46]" />
              <span>Time Limit</span>
            </label>
            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full px-5 py-3.5 rounded-2xl border border-[#E8DFD5] bg-[#FFFFFF] text-[#1C1917] font-medium outline-none focus:ring-2 focus:ring-[#8C6D46]/20 focus:border-[#8C6D46] transition-all shadow-sm"
            >
              <option value={0}>No timer — Manual host advance</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds (Recommended)</option>
              <option value={60}>60 seconds (1 minute)</option>
              <option value={120}>120 seconds (2 minutes)</option>
            </select>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex gap-4 border-t border-[#E8DFD5]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#F5F0EB] hover:bg-[#EFE7DE] text-[#44403C] font-medium py-3.5 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#2D2A26] hover:bg-[#1C1917] text-[#FAF8F6] font-medium py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default QuestionForm;
