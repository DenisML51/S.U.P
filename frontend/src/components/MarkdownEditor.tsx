import React, { useState, useRef, useEffect } from 'react';
import { MarkdownText } from './MarkdownText';
import { Edit2, Eye } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  minHeight?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  minHeight = '60px'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    if (isEditing) {
      adjustHeight();
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          onBlur={() => setIsEditing(false)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full bg-dark-bg border border-blue-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden ${className}`}
          style={{ minHeight }}
        />
        <button
          onClick={() => setIsEditing(false)}
          className="absolute top-2 right-2 p-1 bg-dark-card border border-dark-border rounded text-gray-400 hover:text-white transition-colors"
          title="Предпросмотр"
        >
          <Eye className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`relative group cursor-pointer w-full bg-dark-bg/50 border border-dark-border rounded-lg px-3 py-2 hover:border-blue-500/50 transition-all ${className}`}
      style={{ minHeight }}
    >
      {value ? (
        <MarkdownText content={value} />
      ) : (
        <span className="text-gray-500 text-sm italic">{placeholder}</span>
      )}
      <div className="absolute top-2 right-2 p-1 bg-dark-card border border-dark-border rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
        <Edit2 className="w-3 h-3" />
      </div>
    </div>
  );
};

