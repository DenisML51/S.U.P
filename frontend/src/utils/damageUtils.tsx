import React from 'react';
import { Zap, Flame, Snowflake, Droplets, Brain, Skull, Sun, Target, Swords, Scissors, Gavel, Activity, Sword } from 'lucide-react';

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
  // EN aliases
  physical: '#94a3b8',
  piercing: '#cbd5e1',
  slashing: '#94a3b8',
  bludgeoning: '#64748b',
  fire: '#f87171',
  cold: '#60a5fa',
  lightning: '#fbbf24',
  poison: '#4ade80',
  acid: '#a3e635',
  psychic: '#c084fc',
  necrotic: '#4b5563',
  radiant: '#fef08a',
  force: '#818cf8',
};

export const getDamageTypeIcon = (type: string, size: number = 16) => {
  switch (type) {
    case 'Огонь': return <Flame size={size} />;
    case 'fire': return <Flame size={size} />;
    case 'Холод': return <Snowflake size={size} />;
    case 'cold': return <Snowflake size={size} />;
    case 'Электричество': return <Zap size={size} />;
    case 'lightning': return <Zap size={size} />;
    case 'Яд': return <Skull size={size} />;
    case 'poison': return <Skull size={size} />;
    case 'Кислота': return <Droplets size={size} />;
    case 'acid': return <Droplets size={size} />;
    case 'Психический': return <Brain size={size} />;
    case 'psychic': return <Brain size={size} />;
    case 'Некротический': return <Target size={size} />;
    case 'necrotic': return <Target size={size} />;
    case 'Лучистый': return <Sun size={size} />;
    case 'radiant': return <Sun size={size} />;
    case 'Силовой': return <Activity size={size} />;
    case 'force': return <Activity size={size} />;
    case 'Колющий': return <Target size={size} />;
    case 'piercing': return <Target size={size} />;
    case 'Рубящий': return <Sword size={size} className="rotate-45" />;
    case 'slashing': return <Sword size={size} className="rotate-45" />;
    case 'Дробящий': return <Gavel size={size} />;
    case 'bludgeoning': return <Gavel size={size} />;
    default: return <Swords size={size} />;
  }
};

