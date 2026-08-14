import React, { useMemo, useState } from 'react';
import { Check, Search, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { ATTRIBUTES_LIST, Skill } from '../../../types';
import { useI18n } from '../../../i18n/I18nProvider';
import { getAttributeLabel, getSkillLabel } from '../../../i18n/domainLabels';

interface ProficienciesStepProps {
  skills: Skill[];
  attributes: Record<string, number>;
  proficiencyBonus: number;
  recommendedSkills: string[];
  languagesAndProficiencies: string;
  setLanguagesAndProficiencies: (value: string) => void;
  toggleSkillProficiency: (skillId: string) => void;
  toggleSkillExpertise: (skillId: string) => void;
}

export const ProficienciesStep: React.FC<ProficienciesStepProps> = ({
  skills,
  attributes,
  proficiencyBonus,
  recommendedSkills,
  languagesAndProficiencies,
  setLanguagesAndProficiencies,
  toggleSkillProficiency,
  toggleSkillExpertise,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) => {
      const label = getSkillLabel(skill.id, skill.name, t).toLowerCase();
      return label.includes(normalized) || skill.attribute.toLowerCase().includes(normalized);
    });
  }, [query, skills, t]);

  return (
    <motion.section
      key="proficiencies"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      className="space-y-4"
    >
      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.03] to-transparent p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('creation.searchSkills')}
            className="w-full rounded-xl bg-black/50 px-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-gray-400">{t('creation.skillsLegend')}</div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-violet-500/[0.08] via-blue-500/[0.03] to-transparent p-4 max-h-[420px] overflow-y-auto space-y-3">
        {ATTRIBUTES_LIST.map((attribute) => {
          const group = filteredSkills.filter((skill) => skill.attribute === attribute.id);
          if (!group.length) return null;
          return (
            <div key={attribute.id} className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                {getAttributeLabel(attribute.id, t)}
              </div>
              {group.map((skill) => {
                const attrValue = attributes[skill.attribute] || 10;
                const baseMod = Math.floor((attrValue - 10) / 2);
                const finalMod = baseMod + (skill.proficient ? proficiencyBonus : 0) + (skill.expertise ? proficiencyBonus : 0);
                const isRecommended = recommendedSkills.includes(skill.id);
                return (
                  <div
                    key={skill.id}
                    className={`rounded-xl p-2.5 flex items-center justify-between gap-2 ${
                      isRecommended ? 'bg-amber-500/[0.12]' : 'bg-black/35'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSkillProficiency(skill.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          skill.proficient ? 'bg-blue-500 border-blue-500' : 'border-white/20'
                        }`}
                      >
                        {skill.proficient ? <Check className="w-4 h-4 text-white" /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSkillExpertise(skill.id)}
                        disabled={!skill.proficient}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          skill.expertise
                            ? 'bg-violet-500 border-violet-500 text-white'
                            : skill.proficient
                            ? 'border-white/20 text-gray-300'
                            : 'border-white/20 text-gray-600 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        E
                      </button>
                      <span className="text-sm">
                        {getSkillLabel(skill.id, skill.name, t)}
                        {isRecommended ? <Star className="inline w-3.5 h-3.5 text-amber-400 ml-1" /> : null}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-blue-300">{finalMod >= 0 ? `+${finalMod}` : finalMod}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.03] to-transparent p-4">
        <label className="text-sm font-semibold text-gray-300 block mb-2">{t('creation.proficienciesLanguages')}</label>
        <textarea
          rows={4}
          value={languagesAndProficiencies}
          onChange={(e) => setLanguagesAndProficiencies(e.target.value)}
          placeholder={t('creation.proficienciesPlaceholder')}
          className="w-full rounded-xl bg-black/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </motion.section>
  );
};
