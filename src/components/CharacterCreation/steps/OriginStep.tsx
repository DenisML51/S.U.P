import React, { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n/I18nProvider';
import { PresetOption } from '../CharacterCreationLogic';

interface OriginStepProps {
  race: string;
  setRace: (value: string) => void;
  subrace: string;
  setSubrace: (value: string) => void;
  charClass: string;
  setCharClass: (value: string) => void;
  subclass: string;
  setSubclass: (value: string) => void;
  racePresets: PresetOption[];
  classPresets: PresetOption[];
}

const filterPresets = (items: PresetOption[], query: string, t: (key: string) => string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => {
    const label = t(item.labelKey);
    const description = t(item.descriptionKey);
    const tags = (item.tagKeys || []).map((tagKey) => t(tagKey));
    const inLabel = label.toLowerCase().includes(normalized);
    const inDescription = description.toLowerCase().includes(normalized);
    const inTags = tags.some((tag) => tag.toLowerCase().includes(normalized));
    return inLabel || inDescription || inTags;
  });
};

interface PresetPickerProps {
  title: string;
  activeValue: string;
  options: PresetOption[];
  onPick: (value: string) => void;
  customPlaceholder: string;
}

const PresetPicker: React.FC<PresetPickerProps> = ({ title, activeValue, options, onPick, customPlaceholder }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'preset' | 'custom'>(() => (activeValue ? 'preset' : 'custom'));

  const filtered = useMemo(() => filterPresets(options, query, t), [options, query, t]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.07] via-violet-500/[0.03] to-transparent p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        <div className="rounded-lg bg-black/30 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={`px-2 py-1 rounded ${mode === 'preset' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400'}`}
          >
            Preset
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`px-2 py-1 rounded ${mode === 'custom' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400'}`}
          >
            Custom
          </button>
        </div>
      </div>

      {mode === 'preset' ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('creation.searchPreset')}
              className="w-full rounded-xl bg-black/50 px-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {filtered.map((item) => {
              const label = t(item.labelKey);
              const description = t(item.descriptionKey);
              const isActive = activeValue.trim().toLowerCase() === label.trim().toLowerCase();
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(label)}
                  className={`rounded-xl p-3 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-500/20'
                      : 'bg-black/35 hover:bg-black/55'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-100">{label}</div>
                  <div className="text-xs text-gray-400 mt-1">{description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(item.tagKeys || []).map((tagKey) => (
                      <span
                        key={tagKey}
                        className="px-2 py-0.5 rounded-md bg-black/30 text-[10px] uppercase tracking-wide text-gray-400"
                      >
                        {t(tagKey)}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <input
          value={activeValue}
          onChange={(e) => onPick(e.target.value)}
          placeholder={customPlaceholder}
          className="w-full rounded-xl bg-black/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      )}
    </div>
  );
};

export const OriginStep: React.FC<OriginStepProps> = ({
  race,
  setRace,
  subrace,
  setSubrace,
  charClass,
  setCharClass,
  subclass,
  setSubclass,
  racePresets,
  classPresets,
}) => {
  const { t } = useI18n();

  return (
    <motion.section
      key="origin"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      className="space-y-4"
    >
      <div className="rounded-2xl bg-black/25 px-4 py-3 text-sm text-gray-300 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-300" />
        {t('creation.originHint')}
      </div>

      <PresetPicker
        title={t('basicInfo.race')}
        activeValue={race}
        options={racePresets}
        onPick={setRace}
        customPlaceholder={t('basicInfo.racePlaceholder')}
      />

      <input
        value={subrace}
        onChange={(e) => setSubrace(e.target.value)}
        placeholder={t('basicInfo.subracePlaceholder')}
        className="w-full rounded-xl bg-black/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      <PresetPicker
        title={t('basicInfo.class')}
        activeValue={charClass}
        options={classPresets}
        onPick={setCharClass}
        customPlaceholder={t('basicInfo.classPlaceholder')}
      />

      <input
        value={subclass}
        onChange={(e) => setSubclass(e.target.value)}
        placeholder={t('basicInfo.subclassPlaceholder')}
        className="w-full rounded-xl bg-black/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </motion.section>
  );
};
