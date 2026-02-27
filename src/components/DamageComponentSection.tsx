import React from 'react';
import { Sword, Trash2, Shield, AlertCircle, ShieldX } from 'lucide-react';
import { DamageComponent, DAMAGE_TYPES } from '../types';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../utils/damageUtils';
import { CustomSelect } from './CustomSelect';
import { useI18n } from '../i18n/I18nProvider';

interface DamageComponentSectionProps {
  components: DamageComponent[];
  onAddComponent: () => void;
  onUpdateComponent: (index: number, field: keyof DamageComponent, value: string) => void;
  onRemoveComponent: (index: number) => void;
  title?: string;
  color?: string;
}

export const DamageComponentSection: React.FC<DamageComponentSectionProps> = ({
  components,
  onAddComponent,
  onUpdateComponent,
  onRemoveComponent,
  title,
  color = "red"
}) => {
  const { t } = useI18n();
  const sectionTitle = title ?? t('damageSection.damageTitle');
  const colorClass = {
    red: "text-red-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    amber: "text-amber-400"
  }[color as 'red' | 'blue' | 'purple' | 'amber'] || "text-red-400";

  const bgClass = {
    red: "bg-red-500/5 border-red-500/20",
    blue: "bg-blue-500/5 border-blue-500/20",
    purple: "bg-purple-500/5 border-purple-500/20",
    amber: "bg-amber-500/5 border-amber-500/20"
  }[color as 'red' | 'blue' | 'purple' | 'amber'] || "bg-red-500/5 border-red-500/20";

  const damageOptions = [
    { value: '', label: t('common.noType'), icon: <div className="w-4 h-4 rounded-full border border-gray-600" /> },
    ...DAMAGE_TYPES.map(t => ({
      value: t,
      label: t,
      icon: <div style={{ color: DAMAGE_TYPE_COLORS[t] }}>{getDamageTypeIcon(t, 14)}</div>
    })),
    { value: 'custom', label: t('spellModal.customType'), icon: <AlertCircle size={14} className="text-gray-500" /> }
  ];

  return (
    <div className={`p-4 rounded-2xl border space-y-4 ${bgClass}`}>
      <div className={`flex items-center justify-between ${colorClass} mb-1`}>
        <div className="flex items-center gap-2">
          <Sword className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-wider">{sectionTitle}</span>
        </div>
        <button
          onClick={onAddComponent}
          className={`px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase hover:bg-white/10 transition-all ${colorClass}`}
        >
          {t('spellModal.addDamageType')}
        </button>
      </div>
      
      <div className="space-y-3">
        {components.map((comp, idx) => (
          <div key={idx} className="flex items-center gap-2 relative group/comp animate-in slide-in-from-right-2 duration-300">
            <div className="flex-1 flex items-center gap-2 bg-dark-bg/50 border border-dark-border rounded-xl p-1 pr-2">
              <CustomSelect
                value={DAMAGE_TYPES.includes(comp.type) ? comp.type : (comp.type ? 'custom' : '')}
                onChange={(v) => onUpdateComponent(idx, 'type', v === 'custom' ? '' : v)}
                options={damageOptions}
                minimal={true}
                className="w-10 flex-shrink-0"
              />
              
              <div className="flex-1 flex flex-col gap-1 py-1">
                <input
                  type="text"
                  value={comp.damage}
                  onChange={(e) => onUpdateComponent(idx, 'damage', e.target.value)}
                  placeholder="8d6"
                  className="w-full bg-transparent border-none px-1 text-lg font-black focus:outline-none transition-all"
                  style={{ color: DAMAGE_TYPE_COLORS[comp.type] || '#fff' }}
                />
                {(comp.type === '' || !DAMAGE_TYPES.includes(comp.type)) && (
                  <input
                    type="text"
                    value={comp.type}
                    onChange={(e) => onUpdateComponent(idx, 'type', e.target.value)}
                    placeholder={t('spellModal.enterCustomType')}
                    className="w-full bg-transparent border-none px-1 text-[9px] font-bold text-gray-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
            
            {components.length > (sectionTitle === t('damageSection.weaponTitle') ? 0 : 1) && (
              <button
                onClick={() => onRemoveComponent(idx)}
                className="p-2 text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {components.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-500 font-bold uppercase tracking-widest opacity-50">
            {t('damageSection.empty')}
          </div>
        )}
      </div>
    </div>
  );
};

