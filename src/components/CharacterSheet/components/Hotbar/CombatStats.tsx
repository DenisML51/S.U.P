import React from 'react';
import { Shield, Target, Wind, Brain, LoaderCircle } from 'lucide-react';
import { Character } from '../../../../types';
import { useI18n } from '../../../../i18n/I18nProvider';

interface CombatStatsProps {
  character: Character;
  isInCombat: boolean;
  isCombatReady: boolean;
  canStartSharedCombat: boolean;
  initiative: number | null;
  getModifier: (attr: string) => string;
  onACClick: () => void;
  onEnterCombatClick: () => void;
  onStartSharedCombatClick: () => void;
  onInitiativeRollClick: () => void;
}

export const CombatStats: React.FC<CombatStatsProps> = ({
  character,
  isInCombat,
  isCombatReady,
  canStartSharedCombat,
  initiative,
  getModifier,
  onACClick,
  onEnterCombatClick,
  onStartSharedCombatClick,
  onInitiativeRollClick
}) => {
  const { t } = useI18n();
  const spellDcName =
    !character.spellcastingDifficultyName ||
    character.spellcastingDifficultyName === 'СЛ ЗКЛ' ||
    character.spellcastingDifficultyName === 'SPELL DC'
      ? t('spellsTab.spellDcShort')
      : character.spellcastingDifficultyName;
  const initiativeValue =
    initiative !== null
      ? initiative
      : `${getModifier('dexterity')}${character.initiativeBonus ? ` + ${character.initiativeBonus}` : ''}`;
  const onInitiativeAction = () => {
    if (isInCombat) {
      onInitiativeRollClick();
      return;
    }
    if (canStartSharedCombat) {
      onStartSharedCombatClick();
      return;
    }
    if (isCombatReady) {
      return;
    }
    onEnterCombatClick();
  };
  return (
    <div className="flex items-center gap-6 px-6 py-1.5 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
      <div 
        className="flex flex-col items-center justify-center h-10 cursor-pointer group/stat transition-all"
        onClick={onACClick}
      >
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">{t('statsHeader.defense')}</span>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-blue-100">{character.armorClass}</span>
        </div>
      </div>
      
      <div className="w-px h-10 bg-white/10" />

      <button
        onClick={onInitiativeAction}
        disabled={isCombatReady && !canStartSharedCombat}
        className={`flex h-10 flex-col items-center justify-center transition-all ${
          isCombatReady && !canStartSharedCombat
            ? 'cursor-default opacity-70'
            : 'cursor-pointer hover:opacity-90'
        }`}
      >
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">{t('secondary.initiative')}</span>
        <span className={`text-sm font-black ${
          isInCombat ? 'text-amber-100' : canStartSharedCombat ? 'text-emerald-100' : 'text-amber-100'
        }`}>
          <span className="inline-flex items-center gap-1.5">
            {isCombatReady && !canStartSharedCombat && (
              <LoaderCircle size={12} className="animate-spin text-blue-300" />
            )}
            {initiativeValue}
          </span>
        </span>
      </button>

      <div className="w-px h-10 bg-white/10" />

      <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">{t('secondary.proficiency')}</span>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-purple-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-purple-100">+{character.proficiencyBonus}</span>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10" />

      <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">{t('secondary.speed')}</span>
        <div className="flex items-center gap-2">
          <Wind size={14} className="text-green-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-green-100">{character.speed}{t('secondary.feetShort')}</span>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10" />

      <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
        <span className="text-[7px] font-black text-purple-400/70 uppercase tracking-[0.2em] mb-0.5 whitespace-nowrap">
          {spellDcName}
        </span>
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-purple-100">{character.spellcastingDifficultyValue || 10}</span>
        </div>
      </div>
    </div>
  );
};

