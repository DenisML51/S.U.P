import React from 'react';
import { HeartPulse, Shield, Sparkles, Swords, UserRound } from 'lucide-react';
import { ATTRIBUTES_LIST, Skill } from '../../../types';
import { useI18n } from '../../../i18n/I18nProvider';
import { getAttributeLabel } from '../../../i18n/domainLabels';

interface CharacterDossierProps {
  name: string;
  race: string;
  subrace: string;
  charClass: string;
  subclass: string;
  speed: number;
  attributes: Record<string, number>;
  skills: Skill[];
}

export const CharacterDossier: React.FC<CharacterDossierProps> = ({
  name,
  race,
  subrace,
  charClass,
  subclass,
  speed,
  attributes,
  skills,
}) => {
  const { t } = useI18n();

  const constitution = attributes.constitution || 10;
  const dexterity = attributes.dexterity || 10;
  const conMod = Math.floor((constitution - 10) / 2);
  const dexMod = Math.floor((dexterity - 10) / 2);
  const maxHP = 10 + conMod;
  const armorClass = 10 + dexMod;
  const proficientCount = skills.filter((skill) => skill.proficient).length;
  const expertiseCount = skills.filter((skill) => skill.expertise).length;

  return (
    <aside className="rounded-2xl border border-dark-border bg-gradient-to-b from-dark-card to-dark-bg p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
          <UserRound className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">{t('creation.dossier')}</div>
          <div className="text-sm font-semibold text-white">{name || t('creation.unnamedHero')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-dark-border bg-dark-bg/80 p-3">
          <div className="text-gray-400">{t('basicInfo.race')}</div>
          <div className="mt-1 font-semibold">{race || '—'}</div>
          {subrace ? <div className="text-[11px] text-gray-500 mt-1">{subrace}</div> : null}
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-bg/80 p-3">
          <div className="text-gray-400">{t('basicInfo.class')}</div>
          <div className="mt-1 font-semibold">{charClass || '—'}</div>
          {subclass ? <div className="text-[11px] text-gray-500 mt-1">{subclass}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-dark-border bg-dark-bg/80 p-2">
          <HeartPulse className="w-4 h-4 mx-auto text-rose-400" />
          <div className="text-[11px] text-gray-400 mt-1">HP</div>
          <div className="text-sm font-bold">{maxHP}</div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-bg/80 p-2">
          <Shield className="w-4 h-4 mx-auto text-sky-400" />
          <div className="text-[11px] text-gray-400 mt-1">AC</div>
          <div className="text-sm font-bold">{armorClass}</div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-bg/80 p-2">
          <Swords className="w-4 h-4 mx-auto text-violet-400" />
          <div className="text-[11px] text-gray-400 mt-1">{t('creation.speedLabel')}</div>
          <div className="text-sm font-bold">{speed}</div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t('creation.coreStats')}</div>
        <div className="space-y-1.5">
          {ATTRIBUTES_LIST.map((attribute) => (
            <div key={attribute.id} className="flex items-center justify-between rounded-lg bg-dark-bg/70 px-3 py-1.5 text-xs">
              <span className="text-gray-300">{getAttributeLabel(attribute.id, t)}</span>
              <span className="font-semibold">{attributes[attribute.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dark-border bg-dark-bg/60 p-3 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{t('creation.skillSummary')}</span>
        </div>
        <div className="mt-2 text-gray-400">
          {t('creation.proficienciesCount')}: <span className="text-white font-semibold">{proficientCount}</span>
        </div>
        <div className="text-gray-400">
          {t('creation.expertiseCount')}: <span className="text-white font-semibold">{expertiseCount}</span>
        </div>
      </div>
    </aside>
  );
};
