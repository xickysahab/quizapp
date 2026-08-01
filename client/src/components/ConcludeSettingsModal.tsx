import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Palette, RefreshCw } from 'lucide-react';
import { SAHAJOMETER_PRESET } from '../constants/presets';

interface ConcludeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

const defaultColors = {
  bg: 'bg-slate-50',
  border: 'border-slate-200',
  text: 'text-slate-800',
  mutedText: 'text-slate-500',
  barBg: 'bg-slate-200',
  barFill: 'bg-slate-600',
  badge: 'bg-white text-slate-600 border-slate-200',
  alertBadge: 'bg-slate-600 text-white'
};

const defaultOptions = [
  { letter: 'A', text: 'Option A Text', alert: 'ALERT A', colors: defaultColors },
  { letter: 'B', text: 'Option B Text', alert: 'ALERT B', colors: defaultColors },
  { letter: 'C', text: 'Option C Text', alert: 'ALERT C', colors: defaultColors },
  { letter: 'D', text: 'Option D Text', alert: 'ALERT D', colors: defaultColors },
];

export default function ConcludeSettingsModal({ isOpen, onClose, onSave, initialConfig }: ConcludeSettingsModalProps) {
  const [options, setOptions] = useState<any[]>(defaultOptions);

  useEffect(() => {
    if (initialConfig && Array.isArray(initialConfig) && initialConfig.length > 0) {
      setOptions(initialConfig);
    }
  }, [initialConfig]);

  const loadSahajometer = () => {
    setOptions(SAHAJOMETER_PRESET);
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSave = () => {
    onSave(options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Palette className="w-6 h-6 text-indigo-500" />
                Customize Conclude Screen
              </h2>
              <p className="text-sm text-slate-500 mt-1">Configure the design and messages for the final results screen.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 overflow-y-auto flex-1">
            <div className="mb-8 flex justify-end">
              <button
                onClick={loadSahajometer}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-medium hover:bg-amber-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Load Sahajometer Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {options.map((opt, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-700">Option {opt.letter}</h3>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Result Text</label>
                    <textarea
                      value={opt.text}
                      onChange={(e) => handleChange(idx, 'text', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Alert Badge</label>
                    <input
                      type="text"
                      value={opt.alert}
                      onChange={(e) => handleChange(idx, 'alert', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Color customization is currently pre-configured via templates. Use the Sahajometer template to load the 4-color elegant theme.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
