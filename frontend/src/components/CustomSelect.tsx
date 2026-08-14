import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  minimal?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Выберите...',
  className = '',
  label,
  minimal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-dark-bg/50 backdrop-blur-md border border-dark-border rounded-xl flex items-center justify-between hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
          isOpen ? 'border-blue-500/50' : ''
        } ${minimal ? 'p-2' : 'px-4 py-2.5 text-sm'}`}
        title={minimal ? selectedOption?.label : undefined}
      >
        <div className={`flex items-center gap-2 overflow-hidden ${minimal ? 'justify-center w-full' : ''}`}>
          {selectedOption?.icon}
          {!minimal && (
            <span className={`truncate ${!selectedOption ? 'text-gray-500' : 'text-white'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
        </div>
        {!minimal && (
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-[1200] w-max min-w-full mt-1 bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl ${minimal ? 'left-1/2 -translate-x-1/2' : 'left-0'}`}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                    value === option.value
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {value === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

