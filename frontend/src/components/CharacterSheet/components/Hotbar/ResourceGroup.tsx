import React from 'react';
import { Coins, Target } from 'lucide-react';
import { Character } from '../../../../types';
import { getLucideIcon } from '../../../../utils/iconUtils';
import { useI18n } from '../../../../i18n/I18nProvider';

interface ResourceGroupProps {
  character: Character;
  updateResourceCount: (resourceId: string, delta: number) => void;
}

export const ResourceGroup: React.FC<ResourceGroupProps> = ({
  character,
  updateResourceCount
}) => {
  const { t } = useI18n();
  return (
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
            res.current === 0 ? 'border-red-500/50 bg-red-500/5' : 'hover:bg-white/5'
          }`}
          style={res.current !== 0 ? {
            borderColor: `${res.color || '#3b82f6'}30`
          } : {}}
        >
          {getLucideIcon(res.iconName, { 
            size: 18, 
            style: { color: res.current === 0 ? '#f87171' : (res.color || '#60a5fa') }
          })}
          <span 
            className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-lg border border-dark-bg transition-colors`}
            style={{ backgroundColor: res.current === 0 ? '#ef4444' : (res.color || '#3b82f6') }}
          >
            {res.current}
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 bg-dark-card border border-dark-border rounded-xl text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
            <div className="font-bold text-gray-200">{res.name}: {res.current}/{res.max}</div>
            <div className="text-gray-400 mt-1.5 text-[11px]">{t('resource.tooltipControls')}</div>
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
        
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 bg-dark-card border border-dark-border rounded-xl text-sm whitespace-nowrap opacity-0 group-hover/currency:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
          <div className="font-bold text-gray-200">{t('resource.currency')}: {(character.currency.gold + character.currency.silver/10 + character.currency.copper/100).toFixed(2)} {t('resource.goldShort')}</div>
          <div className="text-gray-400 mt-1.5 text-[11px]">{t('resource.currencyHint')}</div>
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

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-3 bg-dark-card border border-dark-border rounded-xl text-sm whitespace-nowrap opacity-0 group-hover/ammo:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
            <div className="font-bold text-gray-200">{t('resource.ammo')}: {character.inventory.filter(i => i.type === 'ammunition').reduce((sum, i) => sum + (i.quantity || 0), 0)} {t('resource.pcs')}</div>
            <div className="text-gray-400 mt-1.5 text-[11px]">{t('resource.ammoHint')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

