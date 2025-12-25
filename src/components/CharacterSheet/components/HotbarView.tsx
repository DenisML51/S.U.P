import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Zap, 
  Shield, 
  Sword, 
  Sparkles, 
  Wand2, 
  Box, 
  Target, 
  Coins,
  Activity,
  User,
  Info,
  ChevronUp,
  Skull,
  Eye,
  Star,
  Brain,
  Gavel,
  Plus,
  Minus,
  X,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowUp,
  Wind,
  Circle,
  Triangle,
  Flame
} from 'lucide-react';
import { 
  Character, 
  Attack, 
  Ability, 
  Spell, 
  InventoryItem, 
  Resource,
  CLASSES,
  Resistance,
  EXPERIENCE_BY_LEVEL,
  ATTRIBUTES_LIST
} from '../../../types';
import { getLucideIcon } from '../../../utils/iconUtils';
import { MarkdownText } from '../../MarkdownText';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../../../utils/damageUtils';
import { CONDITIONS } from '../../../constants/conditions';

interface HotbarViewProps {
  character: Character;
  openAttackView: (attack: Attack) => void;
  openAbilityView: (ability: Ability) => void;
  openSpellView: (spell: Spell) => void;
  openItemView: (item: InventoryItem) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  updateCharacter: (character: Character) => void;
  getMaxSanity: () => number;
  getTotalMaxHP: () => number;
  xpProgress: number;
  canLevelUp: boolean;
  handleRollInitiative: () => any;
  setShowHealthModal: (show: boolean) => void;
  setShowSanityModal: (show: boolean) => void;
  setShowACModal: (show: boolean) => void;
  setShowExperienceModal: (show: boolean) => void;
  getModifier: (attr: string) => string;
}

export const HotbarView: React.FC<HotbarViewProps> = ({
  character,
  openAttackView,
  openAbilityView,
  openSpellView,
  openItemView,
  updateResourceCount,
  updateCharacter,
  getMaxSanity,
  getTotalMaxHP,
  xpProgress,
  canLevelUp,
  handleRollInitiative,
  setShowHealthModal,
  setShowSanityModal,
  setShowACModal,
  setShowExperienceModal,
  getModifier
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'attacks' | 'abilities' | 'spells' | 'items'>('all');
  const [hoveredItem, setHoveredItem] = useState<any>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const hoverTimeoutRef = useRef<any>(null);

  const handleItemHover = (item: any, rect: DOMRect) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredItem(item);
    setHoveredRect(rect);
  };

  const handleItemUnhover = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      setHoveredRect(null);
    }, 150); // Small delay to allow moving mouse to tooltip
  };
  
  // Combat State
  const [isInCombat, setIsInCombat] = useState(false);
  const [initiative, setInitiative] = useState<number | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Initialize actions from character or defaults
  const actionLimits = character.actionLimits || { action: 1, bonus: 1, reaction: 1 };
  const spentActions = character.spentActions || { action: 0, bonus: 0, reaction: 0 };

  const toggleAction = (id: 'action' | 'bonus' | 'reaction', index: number) => {
    const currentSpent = spentActions[id];
    // If we click on a spent action, we might want to unspend it, or if we click on an unspent one, spend it.
    // Simpler logic: if index < spent, we are clicking a spent one. If index >= spent, an unspent one.
    let newSpent = currentSpent;
    if (index < currentSpent) {
      newSpent = index; // Unspend this and all after it
    } else {
      newSpent = index + 1; // Spend this and all before it
    }

    updateCharacter({
      ...character,
      spentActions: { ...spentActions, [id]: newSpent }
    });
  };

  const updateActionLimit = (id: 'action' | 'bonus' | 'reaction', limit: number) => {
    const newLimits = { ...actionLimits, [id]: Math.max(1, limit) };
    const newSpent = { ...spentActions, [id]: Math.min(spentActions[id], newLimits[id]) };
    
    updateCharacter({
      ...character,
      actionLimits: newLimits,
      spentActions: newSpent
    });
  };

  // Subclass Icon logic
  const charClass = useMemo(() => CLASSES.find(c => c.id === character.class), [character.class]);
  const subclass = useMemo(() => charClass?.subclasses.find(sc => sc.id === character.subclass), [charClass, character.subclass]);
  
  const subclassIcon = subclass?.icon ? `/icons/subclasses/${subclass.icon}` : null;

  // Action categories
  const actionGroups = useMemo(() => {
    const attacks = (character.attacks || []).map(a => ({ ...a, hotbarType: 'attack' }));
    const abilities = (character.abilities || []).map(a => ({ ...a, hotbarType: 'ability' }));
    const spells = (character.spells || []).filter(s => s.prepared).map(s => ({ ...s, hotbarType: 'spell' }));
    // Filter items to EXCLUDE weapons and armor (only keep type 'item')
    const items = (character.inventory || []).filter(i => i.type === 'item').map(i => ({ ...i, hotbarType: 'item' }));
    
    return { attacks, abilities, spells, items };
  }, [character]);

  const filteredActions = useMemo(() => {
    if (activeCategory === 'all') {
      return [...actionGroups.attacks, ...actionGroups.abilities, ...actionGroups.spells, ...actionGroups.items];
    }
    return actionGroups[activeCategory];
  }, [actionGroups, activeCategory]);

  const startCombat = () => {
    const res = handleRollInitiative();
    setInitiative(res.total);
    setIsInCombat(true);
  };

  const nextTurn = () => {
    updateCharacter({
      ...character,
      spentActions: { action: 0, bonus: 0, reaction: 0 }
    });
  };

  const endCombat = () => {
    setIsInCombat(false);
    setInitiative(null);
    nextTurn();
  };

  const renderTooltip = (hoveredData: any) => {
    if (!hoveredData || !hoveredRect) return null;

    // Get live data to ensure real-time updates (e.g. quantity)
    let item = hoveredData;
    if (hoveredData.hotbarType === 'item') {
      item = character.inventory.find(i => i.id === hoveredData.id) || hoveredData;
    } else if (hoveredData.hotbarType === 'spell') {
      item = character.spells.find(s => s.id === hoveredData.id) || hoveredData;
    } else if (hoveredData.hotbarType === 'ability') {
      item = character.abilities.find(a => a.id === hoveredData.id) || hoveredData;
    } else if (hoveredData.hotbarType === 'attack') {
      item = character.attacks.find(a => a.id === hoveredData.id) || hoveredData;
    }

    let title = item.name;
    let subtitle = '';
    let description = item.description || '';
    let effect = item.effect || '';
    let color = item.color || '#3b82f6';
    let details: { label: string; value: string; icon?: any }[] = [];

    const hotbarType = hoveredData.hotbarType;

    if (hotbarType === 'spell') {
      subtitle = item.school;
      details = [
        { label: 'Время', value: item.castingTime, icon: Zap },
        { label: 'Дистанция', value: item.range },
        { label: 'Длительность', value: item.duration },
      ];
    } else if (hotbarType === 'attack') {
      subtitle = item.weaponId ? 'Атака оружием' : 'Прием';
      details = [
        { label: 'Попадание', value: `${item.hitBonus >= 0 ? '+' : ''}${item.hitBonus}`, icon: Target },
        { label: 'Урон', value: item.damage, icon: Sword },
        { label: 'Тип', value: item.damageType, icon: Skull },
        { label: 'Характеристика', value: ATTRIBUTES_LIST.find(a => a.id === item.attribute)?.name || item.attribute || '—', icon: Brain },
      ];
      color = item.color || (item.weaponId ? '#ef4444' : '#a855f7');
    } else if (hotbarType === 'ability') {
      subtitle = 'Способность';
      if (item.resourceId) {
        const res = character.resources.find(r => r.id === item.resourceId);
        if (res) details.push({ label: 'Ресурс', value: `${item.resourceCost} ${res.name}`, icon: Sparkles });
      }
      color = item.color || '#a855f7';
    } else if (hotbarType === 'item') {
      subtitle = item.type === 'weapon' ? 'Оружие' : item.type === 'armor' ? 'Броня' : 'Предмет';
      if (item.damage) details.push({ label: 'Урон', value: `${item.damage} ${item.damageType}`, icon: Sword });
      if (item.baseAC) details.push({ label: 'КБ', value: item.baseAC.toString(), icon: Shield });
      if (item.quantity !== undefined) details.push({ label: 'Количество', value: item.quantity.toString(), icon: Box });
      color = '#94a3b8';
    }

    const tooltipX = hoveredRect.left + hoveredRect.width / 2;
    const tooltipY = hoveredRect.top - 8;

    return (
      <motion.div
        initial={{ opacity: 0, x: '-50%', y: '-95%', scale: 0.95 }}
        animate={{ opacity: 1, x: '-50%', y: '-100%', scale: 1 }}
        style={{ 
          left: tooltipX, 
          top: tooltipY,
        }}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        }}
        onMouseLeave={handleItemUnhover}
        className="fixed w-80 bg-dark-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[1010] p-5 pointer-events-auto"
      >
        <div 
          className="absolute inset-0 opacity-10 blur-xl -z-10"
          style={{ backgroundColor: color }}
        />
        
        {/* Arrow */}
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 border-b border-r border-white/10 bg-dark-bg/95 shadow-[2px_2px_5px_rgba(0,0,0,0.2)]"
        />
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-lg leading-tight break-words">{title}</span>
                  {hotbarType === 'spell' && (
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.15em] bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 w-fit whitespace-nowrap">
                      {item.level === 0 ? 'Заговор' : `${item.level} КРУГ`}
                    </span>
                  )}
                </div>
                {item.itemClass && (
                  <span className="text-[9px] font-black text-amber-500/90 uppercase tracking-[0.15em] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 w-fit">
                    {item.itemClass}
                  </span>
                )}
              </div>
              {item.actionType && (
                <span 
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0"
                  style={{
                    color: item.actionType === 'bonus' ? '#22c55e' : item.actionType === 'reaction' ? '#f97316' : '#3b82f6',
                    backgroundColor: `${item.actionType === 'bonus' ? '#22c55e' : item.actionType === 'reaction' ? '#f97316' : '#3b82f6'}10`,
                    borderColor: `${item.actionType === 'bonus' ? '#22c55e' : item.actionType === 'reaction' ? '#f97316' : '#3b82f6'}20`
                  }}
                >
                  {item.actionType === 'bonus' ? 'Бонус' : item.actionType === 'reaction' ? 'Реакция' : 'Осн.'}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-medium italic opacity-70">
              {subtitle}
            </span>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {details.length > 0 && (
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              {details.map((d, i) => (
                <div key={i} className="flex flex-col gap-1 overflow-hidden">
                  <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{d.label}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-200 font-bold break-words">
                    {d.icon && <d.icon size={12} className="text-blue-400 shrink-0" />}
                    <span className="break-words line-clamp-2">{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(description || effect) && (
            <div className="flex flex-col gap-3">
          {description && (
            <div className="text-xs text-gray-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar pr-1">
              <MarkdownText content={description} />
                </div>
              )}
              {effect && (
                <div className="text-xs text-blue-300/90 leading-relaxed bg-blue-400/5 border border-blue-400/10 rounded-lg p-2 italic max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  <MarkdownText content={effect} />
                </div>
              )}
            </div>
          )}

          {hotbarType === 'item' && item.quantity !== undefined && item.quantity > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newInventory = character.inventory.map(i => {
                  if (i.id === item.id) return { ...i, quantity: (i.quantity || 0) - 1 };
                  return i;
                });
                updateCharacter({ ...character, inventory: newInventory });
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 hover:border-blue-500/50 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-500/5 group/use mt-1"
            >
              <Box size={14} className="group-hover/use:scale-110 transition-transform" />
              ИСПОЛЬЗОВАТЬ
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const hpPercentage = (character.currentHP / getTotalMaxHP()) * 100;
  const sanityPercentage = (character.sanity / getMaxSanity()) * 100;

  return (
    <>
      {/* Top Combat Control Panel */}
      <div className="fixed top-[115px] left-0 right-0 z-[45] flex justify-center pointer-events-none px-8">
        <div className="max-w-[1600px] w-full flex justify-center pointer-events-auto">
          {!isInCombat ? (
            <button 
              onClick={startCombat}
              className="group/btn flex items-center gap-3 px-8 py-3 bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl hover:bg-blue-500/20 hover:border-blue-500/40 transition-all shadow-2xl shadow-blue-500/5"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover/btn:scale-110 transition-transform">
                <Sword size={18} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">НАЧАТЬ БОЙ • ИНИЦИАТИВА</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-dark-bg/80 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-2xl">
              <button 
                onClick={nextTurn}
                className="group/btn flex items-center gap-3 px-6 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all rounded-xl shadow-lg"
              >
                <ChevronUp size={18} className="text-amber-400 group-hover/btn:rotate-12 transition-transform" />
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">СЛЕДУЮЩИЙ ХОД</span>
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button 
                onClick={endCombat}
                className="px-4 py-2 text-gray-500 hover:text-red-400 text-[9px] font-black uppercase tracking-[0.2em] transition-colors rounded-xl hover:bg-red-500/5"
              >
                ВЫЙТИ ИЗ БОЯ
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 z-[40] flex flex-col items-center pointer-events-none px-4">
        
        {/* Main Hotbar System */}
        <div className="flex items-end gap-4 max-w-[95vw] pointer-events-auto">
          
          {/* Left Side: Sanity & Health Bars */}
          <div className="flex items-center justify-center w-7 h-48 mb-2">
            <div 
              className={`w-full h-full bg-dark-bg/95 border rounded-full overflow-hidden flex flex-col-reverse cursor-pointer shadow-2xl relative group transition-all duration-500 ${
                character.sanity <= 0 ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20'
              }`}
              onClick={() => setShowSanityModal(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${sanityPercentage}%` }}
                className={`w-full rounded-t-full relative transition-all duration-700 ${
                  character.sanity <= 0 
                    ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                    : 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                }`}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center rotate-90 whitespace-nowrap pointer-events-none">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-500 ${
                  character.sanity <= 0 ? 'text-red-400' : 'text-white/20 group-hover:text-white/50'
                }`}>SANITY</span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-3xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl z-[1001] translate-y-2 group-hover:translate-y-0 text-gray-200 border-t-white/20 min-w-[150px] text-center">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2 border-b border-purple-500/20 pb-2">РАССУДОК</div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-purple-400 text-lg">{character.sanity}</span>
                  <span className="text-gray-500 text-sm">/</span>
                  <span className="text-gray-100 text-lg">{getMaxSanity()}</span>
                </div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-2 border-t border-white/5">Нажми для управления</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center w-7 h-48 mb-2">
            <div 
              className={`w-full h-full bg-dark-bg/95 border rounded-full overflow-hidden flex flex-col-reverse cursor-pointer shadow-2xl relative group transition-all duration-500 ${
                character.currentHP === 0 ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20'
              }`}
              onClick={() => setShowHealthModal(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${hpPercentage}%` }}
                className={`w-full rounded-t-full relative transition-all duration-700 ${
                  character.currentHP === 0 ? 'bg-red-600' : 
                  hpPercentage < 25 ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 
                  'bg-gradient-to-t from-green-600 to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                }`}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center -rotate-90 whitespace-nowrap pointer-events-none">
                <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-500 ${
                  character.currentHP === 0 ? 'text-red-400' : 'text-white/20 group-hover:text-white/50'
                }`}>HEALTH</span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-3xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl z-[1001] translate-y-2 group-hover:translate-y-0 text-gray-200 border-t-white/20 min-w-[150px] text-center">
                <div className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] mb-2 border-b border-green-500/20 pb-2">ЗДОРОВЬЕ</div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-green-400 text-lg">{character.currentHP}</span>
                  <span className="text-gray-500 text-sm">/</span>
                  <span className="text-gray-100 text-lg">{getTotalMaxHP()}</span>
                </div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-2 border-t border-white/5">Нажми для управления</div>
              </div>
            </div>
          </div>

          {/* Portrait & Resistances */}
          <div className="flex flex-col items-center gap-3">
            {/* Resistances & Status Group (BG3 style above avatar) */}
            <div className="flex flex-wrap gap-1 mb-1 max-w-[140px] justify-center relative">
              <AnimatePresence mode="popLayout">
                {character.conditions?.map(condId => {
                  const cond = CONDITIONS.find(c => c.id === condId);
                  return (
                    <motion.div 
                      key={condId} 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="group/cond relative w-10 h-10 bg-orange-500/20 border border-orange-500/40 rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:bg-orange-500/30 transition-all"
                      onClick={() => {
                        const newConditions = character.conditions?.filter(c => c !== condId) || [];
                        updateCharacter({ ...character, conditions: newConditions });
                      }}
                    >
                      <Activity size={20} className="text-orange-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 p-5 rounded-3xl bg-dark-bg/95 border border-white/10 text-xs text-white/90 opacity-0 group-hover/cond:opacity-100 pointer-events-none transition-all z-[1001] shadow-2xl backdrop-blur-2xl translate-y-2 group-hover/cond:translate-y-0 border-t-white/20">
                        <div className="font-black text-orange-400 mb-3 border-b border-orange-500/20 pb-3 uppercase tracking-[0.2em] text-[11px] text-center">{cond?.name || condId}</div>
                        <div className="leading-relaxed text-gray-300 font-medium text-sm text-center">{cond?.description}</div>
                        <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-white/30 italic font-black text-center tracking-widest uppercase">НАЖМИТЕ, ЧТОБЫ УДАЛИТЬ</div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {character.resistances?.filter(r => r.level !== 'none').map(res => (
                <div 
                  key={res.id} 
                  className="group/res relative w-10 h-10 bg-dark-bg/80 border border-white/10 rounded-xl flex items-center justify-center shadow-lg transition-all hover:bg-white/5"
                  style={{ color: DAMAGE_TYPE_COLORS[res.type] || '#94a3b8' }}
                >
                  <div className="relative">
                  {getDamageTypeIcon(res.type, 20)}
                    {res.level === 'resistance' && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                        <ShieldCheck className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {res.level === 'vulnerability' && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                        <ShieldAlert className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {res.level === 'immunity' && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                        <ShieldX className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Resistance Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-dark-bg/95 border border-white/10 rounded-2xl text-[11px] whitespace-nowrap opacity-0 group-hover/res:opacity-100 transition-all pointer-events-none z-[1001] shadow-2xl text-gray-200 translate-y-2 group-hover/res:translate-y-0 backdrop-blur-2xl">
                    <div className="font-black border-b border-white/10 pb-1.5 mb-1.5 uppercase tracking-widest text-[9px]" style={{ color: DAMAGE_TYPE_COLORS[res.type] }}>{res.type}</div>
                    <div className="text-gray-400 font-bold">
                      {res.level === 'resistance' ? 'Сопротивление' : res.level === 'vulnerability' ? 'Уязвимость' : 'Иммунитет'}
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={() => setShowConditionPicker(!showConditionPicker)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  showConditionPicker 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
                title="Добавить состояние"
              >
                <Plus size={18} />
              </button>

              {/* Condition Picker Popover */}
              <AnimatePresence>
                {showConditionPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[1002] w-80"
                  >
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Состояния</span>
                      <button onClick={() => setShowConditionPicker(false)} className="text-gray-500 hover:text-white p-1">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {CONDITIONS.map(cond => {
                        const isActive = character.conditions?.includes(cond.id);
                        return (
                          <button
                            key={cond.id}
                            onClick={() => {
                              const current = character.conditions || [];
                              const next = isActive ? current.filter(id => id !== cond.id) : [...current, cond.id];
                              updateCharacter({ ...character, conditions: next });
                            }}
                            className={`text-left px-3 py-2 rounded-xl text-xs transition-all border ${
                              isActive 
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 font-bold' 
                                : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                            }`}
                          >
                            {cond.name}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-3 shadow-2xl relative group/avatar">
              <div className="absolute inset-0 rounded-[3rem] border border-white/5 pointer-events-none" />
              <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden border border-white/10 relative bg-dark-card shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent pointer-events-none" />
                {character.avatar ? (
                  <img src={character.avatar} alt={character.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={64} className="text-gray-700" />
                  </div>
                )}
                {/* Subclass Icon */}
                {subclassIcon && (
                  <div className="absolute bottom-2 right-2 w-12 h-12 bg-dark-bg/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl overflow-hidden group-hover/avatar:border-blue-500/30 transition-colors">
                    <img 
                      src={subclassIcon} 
                      alt={character.subclass} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Section: Hotbar Actions & XP Bar */}
          <div className="flex flex-col gap-3 flex-1 min-w-[800px] max-w-[1400px]">
            {/* Upper Section: Resources, Actions & Combat Stats */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-1 pointer-events-auto">
              
              {/* Action Trackers (BG3 style dots) */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl relative group/actions overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none rounded-[1.25rem]" />
                {[
                  { id: 'action' as const, icon: Circle, color: '#3b82f6', title: 'Основное действие' },
                  { id: 'bonus' as const, icon: Triangle, color: '#22c55e', title: 'Бонусное действие' },
                  { id: 'reaction' as const, icon: Zap, color: '#f97316', title: 'Реакция' }
                ].map(act => (
                  <div key={act.id} className="flex gap-1 relative group/act-group">
                    {Array.from({ length: actionLimits[act.id] }).map((_, i) => {
                      const isSpent = i < spentActions[act.id];
                      return (
                        <button
                          key={`${act.id}-${i}`}
                          onClick={() => toggleAction(act.id, i)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setEditingActionId(act.id);
                          }}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all relative group/act ${
                            isSpent 
                              ? 'bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                              : 'bg-dark-card border-white/10 hover:border-white/20'
                          }`}
                          style={{ 
                            borderColor: !isSpent ? `${act.color}60` : undefined,
                            color: !isSpent ? act.color : undefined
                          }}
                          title={`${act.title} ${i + 1}/${actionLimits[act.id]}`}
                        >
                          {!isSpent && (
                            <div 
                              className="absolute inset-0 rounded-full opacity-10 blur-sm group-hover/act:opacity-20 transition-opacity" 
                              style={{ backgroundColor: act.color }} 
                            />
                          )}
                          <act.icon 
                            size={14} 
                            className={`relative z-10 transition-transform ${isSpent ? 'opacity-50' : 'drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]'}`}
                          />
                          {isSpent && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-0.5 bg-red-500/50 rotate-45 absolute" />
                              <div className="w-full h-0.5 bg-red-500/50 -rotate-45 absolute" />
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Action Limit Popover */}
                    <AnimatePresence>
                      {editingActionId === act.id && (
                        <>
                          <div className="fixed inset-0 z-[1001]" onClick={() => setEditingActionId(null)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[1002] min-w-[180px]"
                          >
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center border-b border-white/5 pb-2">
                              {act.title}
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] text-gray-500 font-bold uppercase whitespace-nowrap">Кол-во за ход:</span>
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateActionLimit(act.id, actionLimits[act.id] - 1)}
                                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-sm font-bold text-white min-w-[1ch] text-center">{actionLimits[act.id]}</span>
                                <button 
                                  onClick={() => updateActionLimit(act.id, actionLimits[act.id] + 1)}
                                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Resources & Currency */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl relative">
                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none rounded-[1.25rem]" />
                {character.resources.filter(r => r.max > 0).map(res => (
                  <div 
                    key={res.id}
                    onClick={() => updateResourceCount(res.id, -1)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('open-character-modal', { detail: { type: 'resource', data: res } }));
                    }}
                    className={`relative group cursor-pointer w-10 h-10 bg-dark-card/30 border rounded-xl flex items-center justify-center transition-all ${
                      res.current === 0 ? 'border-red-500/50 bg-red-500/5' : 'border-white/5 hover:border-blue-500/30 hover:bg-white/5'
                    }`}
                  >
                    {getLucideIcon(res.iconName, { size: 18, className: res.current === 0 ? "text-red-400" : "text-blue-400" })}
                    <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-lg border border-dark-bg ${
                      res.current === 0 ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                      {res.current}
                    </span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 bg-dark-card border border-dark-border rounded-xl text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                      <div className="font-bold text-gray-200">{res.name}: {res.current}/{res.max}</div>
                      <div className="text-gray-400 mt-1.5 text-[11px]">ЛКМ: -1 • ПКМ: просмотр</div>
                    </div>
                  </div>
                ))}

                <div className="w-px h-6 bg-white/10 mx-1" />

                <div 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-character-modal', { detail: { type: 'currency' } }))}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/5 group/currency relative"
                >
                  <Coins size={16} className="text-yellow-500 group-hover/currency:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-gray-300">
                    {Math.floor(character.currency.gold + character.currency.silver/10 + character.currency.copper/100)}
                  </span>
                  
                  {/* Currency Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 bg-dark-card border border-dark-border rounded-xl text-sm whitespace-nowrap opacity-0 group-hover/currency:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                    <div className="font-bold text-gray-200">Валюта: {(character.currency.gold + character.currency.silver/10 + character.currency.copper/100).toFixed(2)} ЗМ</div>
                    <div className="text-gray-400 mt-1.5 text-[11px]">Клик: управление кошельком</div>
                  </div>
                </div>

                {character.inventory.filter(i => i.type === 'ammunition').length > 0 && (
                  <div 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-character-modal', { detail: { type: 'ammunition' } }))}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/5 group/ammo relative"
                  >
                    <Target size={16} className="text-orange-400 group-hover/ammo:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-300">
                      {character.inventory.filter(i => i.type === 'ammunition').reduce((sum, i) => sum + (i.quantity || 0), 0)}
                    </span>

                    {/* Ammo Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 bg-dark-card border border-dark-border rounded-xl text-sm whitespace-nowrap opacity-0 group-hover/ammo:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                      <div className="font-bold text-gray-200">Боеприпасы: {character.inventory.filter(i => i.type === 'ammunition').reduce((sum, i) => sum + (i.quantity || 0), 0)} шт</div>
                      <div className="text-gray-400 mt-1.5 text-[11px]">Нажми для управления</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Combat Stats (AC, Initiative, Prof) */}
              <div className="flex items-center gap-6 px-6 py-1.5 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                <div 
                  className="flex flex-col items-center justify-center h-10 cursor-pointer group/stat transition-all"
                  onClick={() => setShowACModal(true)}
                >
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">DEFENSE</span>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-blue-400 group-hover/stat:scale-110 transition-transform" />
                    <span className="text-sm font-black text-blue-100">{character.armorClass}</span>
                  </div>
                </div>
                
                <div className="w-px h-10 bg-white/10" />

                <div 
                  className="flex flex-col items-center justify-center h-10 cursor-pointer group/stat transition-all"
                  onClick={startCombat}
                >
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">INITIATIVE</span>
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-amber-400 group-hover/stat:scale-110 transition-transform" />
                    <span className="text-sm font-black text-amber-100">
                      {initiative !== null 
                        ? initiative 
                        : `${getModifier('dexterity')}${character.initiativeBonus ? ` + ${character.initiativeBonus}` : ''}`
                      }
                    </span>
                  </div>
                </div>

                <div className="w-px h-10 bg-white/10" />

                <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">PROFICIENCY</span>
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-purple-400 group-hover/stat:scale-110 transition-transform" />
                    <span className="text-sm font-black text-purple-100">+{character.proficiencyBonus}</span>
                  </div>
                </div>

                <div className="w-px h-10 bg-white/10" />

                <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">SPEED</span>
                  <div className="flex items-center gap-2">
                    <Wind size={14} className="text-green-400 group-hover/stat:scale-110 transition-transform" />
                    <span className="text-sm font-black text-green-100">{character.speed}фт</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row items-stretch justify-center gap-3 w-full relative group/hotbar">
              {[
                { id: 'attacks', label: 'Атаки', icon: Sword, data: actionGroups.attacks, color: '#ef4444' },
                { id: 'abilities', label: 'Умения', icon: Sparkles, data: actionGroups.abilities, color: '#a855f7' },
                { id: 'spells', label: 'Магия', icon: Wand2, data: actionGroups.spells, color: '#3b82f6' },
                { id: 'items', label: 'Вещи', icon: Box, data: actionGroups.items, color: '#94a3b8' },
              ].map((cat) => (
                <div 
                  key={cat.id} 
                  className="flex flex-col gap-0 flex-1 min-w-0 bg-dark-bg backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-2xl relative overflow-hidden group/cat-panel transition-all duration-500 hover:border-white/10"
                >
                  {/* Subtle color glow in background */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 blur-[40px] opacity-10 pointer-events-none transition-opacity duration-500 group-hover/cat-panel:opacity-20"
                    style={{ backgroundColor: cat.color }}
                  />
                  
                  <div className="flex items-center justify-between px-5 py-3 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="p-1.5 rounded-lg transition-transform duration-500 group-hover/cat-panel:scale-110"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        <cat.icon size={14} />
                      </div>
                      <span 
                        className="text-[10px] font-black uppercase tracking-[0.25em] transition-colors duration-500"
                        style={{ color: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </div>
                    <div 
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: cat.color, boxShadow: `0 0 10px ${cat.color}` }}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 p-4 min-h-[150px] max-h-[200px] overflow-y-auto custom-scrollbar content-start relative z-10 bg-black/40 rounded-t-[1.5rem] border-t border-white/5 shadow-inner transition-colors duration-500 group-hover/cat-panel:bg-black/50">
                    <AnimatePresence mode="popLayout">
                      {cat.data.length > 0 ? (
                        cat.data.map((action, idx) => (
                          <motion.div
                            key={action.id + idx}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => {
                              const a = action as any;
                              if (a.hotbarType === 'spell') openSpellView(a);
                              else if (a.hotbarType === 'attack') openAttackView(a);
                              else if (a.hotbarType === 'ability') openAbilityView(a);
                              else if (a.hotbarType === 'item') openItemView(a);
                            }}
                            onMouseEnter={(e) => handleItemHover(action, e.currentTarget.getBoundingClientRect())}
                            onMouseLeave={handleItemUnhover}
                            className="relative w-12 h-12 bg-dark-card/60 border border-white/5 rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 hover:bg-dark-card hover:border-white/20 active:scale-95 transition-all shadow-lg"
                            style={{ 
                              boxShadow: hoveredItem?.id === action.id ? `0 0 20px ${cat.color}20` : undefined
                            }}
                          >
                            {getLucideIcon(
                              (action as any).hotbarType === 'spell' ? ((action as any).iconName || 'Wand2') : 
                              (action as any).hotbarType === 'attack' ? ((action as any).iconName || ((action as any).weaponId ? 'Sword' : 'Zap')) :
                              (action as any).hotbarType === 'ability' ? ((action as any).iconName || 'Zap') :
                              ((action as any).type === 'weapon' ? 'Sword' : (action as any).type === 'armor' ? 'Shield' : 'Box'),
                              { size: 24, style: { color: (action as any).color || cat.color } }
                            )}
                            {(action as any).actionType && (
                              <div 
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-bg shadow-sm"
                                style={{ backgroundColor: (action as any).actionType === 'bonus' ? '#22c55e' : (action as any).actionType === 'reaction' ? '#f97316' : '#3b82f6' }}
                              />
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-20">
                          <cat.icon size={32} style={{ color: cat.color }} />
                          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>Пусто</span>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>

            {/* Functional Experience Bar below */}
            <div 
              className="flex items-center gap-4 px-2 group cursor-pointer h-8"
              onClick={() => setShowExperienceModal(true)}
            >
              <div className="flex-1 h-2 bg-dark-bg/95 border border-white/10 rounded-full overflow-hidden shadow-2xl relative group-hover:border-amber-500/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                  className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 relative transition-all group-hover:from-amber-600 group-hover:via-amber-400 group-hover:to-amber-200"
                >
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />
                  {/* XP Markers */}
                  {[20, 40, 60, 80].map(m => (
                    <div key={m} className="absolute top-0 bottom-0 w-px bg-black/20" style={{ left: `${m}%` }} />
                  ))}
                </motion.div>
              </div>

              <div className="flex items-center gap-3 shrink-0 bg-dark-bg/95 border border-white/10 rounded-2xl px-4 py-1.5 shadow-xl group-hover:border-amber-500/40 transition-all duration-300 relative">
                <div className="absolute inset-0 rounded-2xl bg-white/[0.02] pointer-events-none" />
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none mb-0.5">LEVEL</span>
                  <span className="text-xs font-black text-amber-400 leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">{character.level}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none mb-0.5">EXP</span>
                  <span className="text-xs font-black text-gray-200 leading-none">{character.experience}</span>
                </div>
                {canLevelUp && (
                  <>
                    <div className="w-px h-4 bg-white/10" />
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1],
                        filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="bg-green-500/20 border border-green-500/50 rounded-lg p-1 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                    >
                      <ArrowUp size={10} className="text-green-400" />
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Tooltip Portal Area */}
      <AnimatePresence>
        {hoveredItem && renderTooltip(hoveredItem)}
      </AnimatePresence>
    </>
  );
};
