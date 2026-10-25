import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  COC_CONDITIONS,
  applyDamage,
  archetypeDef,
  changeMagic,
  cocCharacteristics,
  heal,
  occupationDef,
  setLuck,
} from '@itd/game-logic/coc';
import { maxSanityOf } from '@itd/game-logic';
import { CharacterArt } from '../../ui/CharacterArt';
import { Rail, RailButton, RailDivider } from '../../ui/Rail';
import { Button, cx } from '../../ui/primitives';
import { NumberField } from '../../ui/forms';
import {
  IconAttacks,
  IconAttributes,
  IconCharacter,
  IconCombat,
  IconDice,
  IconHistory,
  IconInventory,
  IconPrev,
  IconSanity,
  IconSettings,
} from '../../ui/icons';
import { useCoc } from './context';
import { InsanityVeil, madnessStage } from './InsanityVeil';
import { RollResult, Track } from './parts';
import { GearSection, InvestigatorSection, SanitySection, StorySection, WeaponsSection } from './sections';
import './coc.css';

export type CocSection = 'investigator' | 'weapons' | 'sanity' | 'gear' | 'story' | 'journal';

const SECTIONS: { id: CocSection; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'investigator', label: 'Сыщик', Icon: IconAttributes },
  { id: 'weapons', label: 'Оружие', Icon: IconAttacks },
  { id: 'sanity', label: 'Рассудок', Icon: IconSanity },
  { id: 'gear', label: 'Вещи', Icon: IconInventory },
  { id: 'story', label: 'История', Icon: IconCharacter },
  { id: 'journal', label: 'Журнал', Icon: IconHistory },
];

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/** Who the investigator is and what changes minute to minute: hit points, magic, sanity, luck. */
const InvestigatorColumn: React.FC<{ footer?: React.ReactNode }> = ({ footer }) => {
  const { character, update, roll } = useCoc();
  const coc = character.coc!;
  const build = character.build?.ruleset === 'coc7' ? character.build : undefined;
  const occupation = occupationDef(build?.occupation)?.name ?? character.class;
  const archetype = archetypeDef(build?.archetype)?.name;
  const [amount, setAmount] = useState(1);
  const maxMP = Math.floor(cocCharacteristics(character).pow / 5);
  const conditions = character.conditions.map((id) => COC_CONDITIONS.find((c) => c.id === id)).filter(Boolean);

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-r border-line/70 bg-surface/40">
      <div className="relative h-[210px] shrink-0 overflow-hidden">
        <CharacterArt source={character} kind="portrait" position="50% 12%" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <span className="absolute inset-x-5 bottom-3">
          <span className="ui-display block text-[1.7rem] leading-tight text-ink" role="heading" aria-level={1}>
            {character.name}
          </span>
          <span className="block truncate text-sm text-ink-muted">
            {[occupation, archetype, build && `${build.age} лет`].filter(Boolean).join(' · ')}
          </span>
        </span>
      </div>

      <div className="ui-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <Track label="Хиты" value={character.currentHP} max={character.maxHP} tone="hp" />
        <div className="flex items-center gap-2">
          <NumberField label="Сколько" value={amount} onChange={(v) => setAmount(Math.max(1, v ?? 1))} min={1} className="w-20" />
          <Button size="sm" variant="danger" onClick={() => update(applyDamage(amount), { message: `Урон ${amount}`, type: 'health' })}>
            Урон
          </Button>
          <Button size="sm" onClick={() => update(heal(amount), { message: `Лечение ${amount}`, type: 'health' })}>
            Лечение
          </Button>
        </div>
        <Track label="Магия" value={coc.magicPoints} max={maxMP} tone="accent" onChange={(d) => update(changeMagic(d))} />
        <Track label="Рассудок" value={character.sanity} max={maxSanityOf(character)} tone="sanity" />
        <Track label="Удача" value={coc.luck} max={99} tone="xp" onChange={(d) => update(setLuck(coc.luck + d))}>
          <Button size="row" variant="ghost" className="justify-self-start" onClick={() => roll({ label: 'Удача', value: coc.luck, kind: 'luck' })}>
            Бросок удачи
          </Button>
        </Track>

        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {conditions.map((c) => (
              <span key={c!.id} title={c!.description} className="border border-danger/50 bg-surface-2/70 px-2.5 py-1 text-xs text-danger" style={{ borderRadius: 'var(--radius)' }}>
                {c!.name}
              </span>
            ))}
          </div>
        )}
      </div>
      {footer && <div className="shrink-0 border-t border-line/70 px-4 py-2">{footer}</div>}
    </aside>
  );
};

/**
 * The investigator's sheet: rail, the investigator always in view, the chosen section. The same
 * view runs in the app and in the design showcase; what it changes goes through `useCoc`.
 */
export const CocSheetView: React.FC<{
  onBack?: () => void;
  onCombat?: () => void;
  onDice?: () => void;
  onSettings?: () => void;
  journal?: React.ReactNode;
  footer?: React.ReactNode;
  /** The showcase pins the result inside its frame instead of the window corner. */
  className?: string;
}> = ({ onBack, onCombat, onDice, onSettings, journal, footer, className }) => {
  const { character, last } = useCoc();
  const [section, setSection] = useState<CocSection>('investigator');
  const stage = madnessStage(character);

  return (
    <div className={cx('coc-sheet relative flex h-full', className)}>
      <motion.div className={cx('flex h-full w-full', stage >= 3 && 'coc-sway')} exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.25 } }}>
        <motion.div className="flex shrink-0" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={ENTER}>
          <Rail label="Разделы листа">
            <RailButton label="Герои" Icon={IconPrev} onClick={onBack ?? (() => undefined)} hint="К выбору героя" />
            <RailDivider />
            <div className="flex flex-1 flex-col">
              {SECTIONS.map(({ id, label, Icon }) => (
                <RailButton key={id} label={label} Icon={Icon} active={section === id} onClick={() => setSection(id)} />
              ))}
            </div>
            <RailButton label="Бой" Icon={IconCombat} onClick={onCombat ?? (() => undefined)} hint="Боевой режим" />
            <RailButton label="Кубики" Icon={IconDice} onClick={onDice ?? (() => undefined)} />
            <RailButton label="Опции" Icon={IconSettings} onClick={onSettings ?? (() => undefined)} hint="Настройки" />
          </Rail>
        </motion.div>
        <motion.div className="flex shrink-0" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...ENTER, delay: 0.06 }}>
          <InvestigatorColumn footer={footer} />
        </motion.div>
        <motion.main className="min-w-0 flex-1 px-10 py-8" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ENTER, delay: 0.14 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              className="ui-scroll ui-scroll--bare -m-4 h-[calc(100%+2rem)] overflow-y-auto p-4 pb-7"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {section === 'investigator' && <InvestigatorSection />}
              {section === 'weapons' && <WeaponsSection />}
              {section === 'sanity' && <SanitySection />}
              {section === 'gear' && <GearSection />}
              {section === 'story' && <StorySection />}
              {section === 'journal' && journal}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </motion.div>
      <InsanityVeil stage={stage} />
      {last && <RollResult key={last.serial} record={last} />}
    </div>
  );
};
