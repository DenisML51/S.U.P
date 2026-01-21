import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Sword, 
  Box, 
  Target, 
  Skull, 
  Shield, 
  Brain,
  Sparkles
} from 'lucide-react';
import { Character, ATTRIBUTES_LIST, DAMAGE_TYPES } from '../../../../types';
import { MarkdownText } from '../../../MarkdownText';
import { DAMAGE_TYPE_COLORS } from '../../../../utils/damageUtils';

interface ActionTooltipProps {
  hoveredData: any;
  hoveredRect: DOMRect | null;
  character: Character;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  updateCharacter: (character: Character) => void;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
  hoveredData,
  hoveredRect,
  character,
  onMouseEnter,
  onMouseLeave,
  updateCharacter
}) => {
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

  const colorizeDamage = (damage: string, defaultType: string = '', components?: any[]) => {
    if (components && components.length > 0) {
      return (
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {components.map((comp, i) => (
            <span key={i} style={{ color: DAMAGE_TYPE_COLORS[comp.type] || '#ef4444' }}>
              {comp.damage}{comp.type && <span className="text-[7px] uppercase ml-0.5 opacity-60">{comp.type}</span>}
              {i < components.length - 1 && <span className="text-gray-500 ml-1">+</span>}
            </span>
          ))}
        </div>
      );
    }

    if (!damage) return null;
    
    // ... existing logic for simple string parsing if needed ...
    if (!DAMAGE_TYPES.some(t => damage.toLowerCase().includes(t.toLowerCase()))) {
      return (
        <span style={{ color: DAMAGE_TYPE_COLORS[defaultType] || '#ef4444' }}>
          {damage} {defaultType && <span className="text-[8px] uppercase ml-1 opacity-60">{defaultType}</span>}
        </span>
      );
    }

    const parts = damage.split(/(\s*\+\s*|\s+и\s+)/);
    return (
      <span>
        {parts.map((part, i) => {
          const foundType = DAMAGE_TYPES.find(t => part.toLowerCase().includes(t.toLowerCase()));
          if (foundType) {
            return (
              <span key={i} style={{ color: DAMAGE_TYPE_COLORS[foundType] }}>
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  if (hotbarType === 'spell') {
    subtitle = item.school;
    details = [
      { label: 'Время', value: item.castingTime, icon: Zap },
      { label: 'Дистанция', value: item.range },
      { label: 'Длительность', value: item.duration },
    ];
    if (item.damage || (item.damageComponents && item.damageComponents.length > 0)) {
      details.push({ 
        label: 'Урон', 
        value: item.damage, 
        icon: Sword,
        customRender: colorizeDamage(item.damage, item.damageType, item.damageComponents)
      });
    }
  } else if (hotbarType === 'attack') {
    subtitle = item.weaponId ? 'Атака оружием' : 'Прием';
    details = [
      { label: 'Попадание', value: `${item.hitBonus >= 0 ? '+' : ''}${item.hitBonus}`, icon: Target },
      { 
        label: 'Урон', 
        value: item.damage, 
        icon: Sword,
        customRender: colorizeDamage(item.damage, item.damageType, item.damageComponents)
      },
      { label: 'Тип', value: item.damageType, icon: Skull },
      { label: 'Характеристика', value: ATTRIBUTES_LIST.find(a => a.id === item.attribute)?.name || item.attribute || '—', icon: Brain },
    ];
    color = item.color || (item.weaponId ? '#ef4444' : '#a855f7');
  } else if (hotbarType === 'ability') {
    subtitle = 'Способность';
    if (item.damage || (item.damageComponents && item.damageComponents.length > 0)) {
      details.push({ 
        label: 'Урон', 
        value: item.damage, 
        icon: Sword,
        customRender: colorizeDamage(item.damage, item.damageType, item.damageComponents)
      });
    }
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
            {details.map((d: any, i) => (
              <div key={i} className="flex flex-col gap-1 overflow-hidden">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{d.label}</span>
                <div className="flex items-center gap-2 text-xs text-gray-200 font-bold break-words">
                  {d.icon && <d.icon size={12} className="text-blue-400 shrink-0" />}
                  <span className="break-words line-clamp-2">
                    {d.customRender || d.value}
                  </span>
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

