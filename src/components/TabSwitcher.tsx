import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
}

interface TabSwitcherProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  color?: string;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ tabs, activeTab, onChange, color = 'blue' }) => {
  const activeColorClass = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }[color as 'blue' | 'purple' | 'amber' | 'red'] || 'text-blue-400';

  const bgColorClass = {
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    amber: 'bg-amber-500/10',
    red: 'bg-red-500/10',
  }[color as 'blue' | 'purple' | 'amber' | 'red'] || 'bg-blue-500/10';

  return (
    <div className="flex px-6 p-1 bg-dark-card/30 sticky top-0 z-10 backdrop-blur-md border-b border-dark-border gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all relative rounded-xl overflow-hidden ${
            activeTab === tab.id ? activeColorClass : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span className="relative z-10">{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div
              layoutId={`activeTab_${tabs.map(t => t.id).join('_')}`}
              className={`absolute inset-0 ${bgColorClass} border border-white/5 shadow-inner`}
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {activeTab === tab.id && (
            <motion.div 
              layoutId={`activeTabLine_${tabs.map(t => t.id).join('_')}`}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-current" 
            />
          )}
        </button>
      ))}
    </div>
  );
};

