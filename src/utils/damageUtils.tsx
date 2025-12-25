import React from 'react';
import { Zap, Flame, Snowflake, Droplets, Brain, Skull, Sun, Target, Swords, Scissors, Gavel, Activity } from 'lucide-react';

export const DAMAGE_TYPE_COLORS: { [key: string]: string } = {
  'Физический': '#94a3b8',
  'Колющий': '#cbd5e1',
  'Рубящий': '#94a3b8',
  'Дробящий': '#64748b',
  'Огонь': '#f87171',
  'Холод': '#60a5fa',
  'Электричество': '#fbbf24',
  'Яд': '#4ade80',
  'Кислота': '#a3e635',
  'Психический': '#c084fc',
  'Некротический': '#4b5563',
  'Лучистый': '#fef08a',
  'Силовой': '#818cf8',
};

export const getDamageTypeIcon = (type: string, size: number = 16) => {
  switch (type) {
    case 'Огонь': return <Flame size={size} />;
    case 'Холод': return <Snowflake size={size} />;
    case 'Электричество': return <Zap size={size} />;
    case 'Яд': return <Skull size={size} />;
    case 'Кислота': return <Droplets size={size} />;
    case 'Психический': return <Brain size={size} />;
    case 'Некротический': return <Target size={size} />;
    case 'Лучистый': return <Sun size={size} />;
    case 'Силовой': return <Activity size={size} />;
    case 'Колющий': return <Target size={size} />;
    case 'Рубящий': return <Scissors size={size} />;
    case 'Дробящий': return <Gavel size={size} />;
    default: return <Swords size={size} />;
  }
};

