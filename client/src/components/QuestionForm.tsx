import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface QuestionFormProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setText(initialData.text);
      setOptions(initialData.options.length ? initialData.options : ['', '', '', '']);
      setCorrectOption(initialData.correctOption || 0);
      setTimeLimit(initialData.timeLimit || 30);
    }
  }, [initialData]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || options.some(opt => !opt.trim())) {
      alert('Please fill in the question and all options.');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1f2028] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initialData ? 'Edit Question' : 'Add New Question'}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Title</label>
            <input
              type="text"
              required
              placeholder="E.g., What is the capital of France?"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#16171d] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#aa3bff] outline-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Options (Select the correct one)</label>
            {options.map((opt, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all ${correctOption === idx ? 'border-[#aa3bff] bg-[#aa3bff]/5' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#16171d]'}`}>
                <input
                  type="radio"
                  name="correctOption"
                  checked={correctOption === idx}
                  onChange={() => setCorrectOption(idx)}
                  className="w-5 h-5 text-[#aa3bff] focus:ring-[#aa3bff] cursor-pointer ml-2"
                />
                <input
                  type="text"
                  required
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-transparent px-2 py-2 outline-none text-gray-900 dark:text-white"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Limit (Seconds)</label>
            <select 
              value={timeLimit} 
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#16171d] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#aa3bff] outline-none"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds (1 minute)</option>
              <option value={120}>120 seconds (2 minutes)</option>
            </select>
          </div>

          {/* Submit */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#aa3bff] hover:bg-[#9024e6] text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-[#aa3bff]/30"
            >
              {loading ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default QuestionForm;
