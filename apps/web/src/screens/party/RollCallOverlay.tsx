import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ATTRIBUTES_LIST,
  SKILLS_LIST,
  attributeModifier,
  rollD20,
  savingThrowModifier,
  skillModifier,
  type AttributeId,
} from '@itd/game-logic';
import type { Character, TableCheck, TableDie } from '@itd/schema';
import { calledHero, useRollCallStore, type PendingCall } from '../../store/useRollCallStore';
import { usePartyStore } from '../../store/usePartyStore';
import { announceRoll } from '../../store/useTableRollStore';
import { CheckPanel, type CheckPart } from '../../ui/CheckPanel';
import { Button, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';

/** An ability by the picture on its card. */
const ABILITY_ICON: Record<AttributeId, string> = {
  strength: 'muscle-up',
  dexterity: 'run',
  constitution: 'heart-plus',
  intelligence: 'brain',
  wisdom: 'owl',
  charisma: 'crown',
};

/** An ability's name as a check or a save names it: «проверка Ловкости», «спасбросок Ловкости». */
const ABILITY_GENITIVE: Record<AttributeId, string> = {
  strength: 'Силы',
  dexterity: 'Ловкости',
  constitution: 'Телосложения',
  intelligence: 'Интеллекта',
  wisdom: 'Мудрости',
  charisma: 'Харизмы',
};

const abilityName = (id: AttributeId) => ATTRIBUTES_LIST.find((a) => a.id === id)?.name ?? id;

/** Where a hero's bonus to the called throw comes from, card by card, and what the throw is called. */
export function callPlan(hero: Character | null, call: Pick<PendingCall, 'kind' | 'key' | 'title'>): {
  title: string;
  bonus: number;
  parts: CheckPart[];
} {
  const half = hero?.halfProficiency ? Math.floor(hero.proficiencyBonus / 2) : 0;
  if (!hero || call.kind === 'plain' || !call.key) return { title: call.title || 'Бросок к20', bonus: 0, parts: [] };
  if (call.kind === 'skill') {
    const def = SKILLS_LIST.find((s) => s.id === call.key);
    const skill = hero.skills.find((s) => s.id === call.key);
    if (!def || !skill) return { title: call.title || 'Бросок к20', bonus: 0, parts: [] };
    const parts: CheckPart[] = [
      { label: abilityName(skill.attribute as AttributeId), value: attributeModifier(hero, skill.attribute), icon: ABILITY_ICON[skill.attribute as AttributeId] ?? 'rolling-dices' },
    ];
    if (skill.proficient)
      parts.push({
        label: skill.expertise ? 'Экспертиза' : 'Владение навыком',
        value: hero.proficiencyBonus * (skill.expertise ? 2 : 1),
        icon: skill.expertise ? 'sparkles' : 'laurel-crown',
      });
    else if (half) parts.push({ label: 'Мастер на все руки', value: half, icon: 'sparkles' });
    if (skill.bonus) parts.push({ label: 'Особый бонус', value: skill.bonus, icon: 'magic-shield' });
    return { title: call.title || def.name, bonus: skillModifier(hero, call.key), parts };
  }
  const ability = call.key as AttributeId;
  if (!ABILITY_ICON[ability]) return { title: call.title || 'Бросок к20', bonus: 0, parts: [] };
  const parts: CheckPart[] = [{ label: abilityName(ability), value: attributeModifier(hero, ability), icon: ABILITY_ICON[ability] }];
  if (call.kind === 'save') {
    if (hero.savingThrowProficiencies.includes(ability))
      parts.push({ label: 'Владение спасброском', value: hero.proficiencyBonus, icon: 'laurel-crown' });
    const extra = hero.saveBonuses?.[ability] ?? 0;
    if (extra) parts.push({ label: 'Особый бонус', value: extra, icon: 'magic-shield' });
    return { title: call.title || `Спасбросок ${ABILITY_GENITIVE[ability]}`, bonus: savingThrowModifier(hero, ability), parts };
  }
  if (half) parts.push({ label: 'Мастер на все руки', value: half, icon: 'sparkles' });
  return { title: call.title || `Проверка ${ABILITY_GENITIVE[ability]}`, bonus: attributeModifier(hero, ability) + half, parts };
}

const signed = (n: number) => (n >= 0 ? `+ ${n}` : `− ${-n}`);

/** How long the plate stays once the player has thrown, so the outcome is seen. */
const AFTER_THROW_MS = 4200;

/**
 * The master's call on this player's hero: a plate in the table's setting with the hero's own
 * bonuses, the die waiting for a click. The throw goes to the table as the hero's (the squad sees it
 * on the portrait, the master in the middle of the screen).
 */
const CallPlate: React.FC<{ call: PendingCall }> = ({ call }) => {
  const dismiss = useRollCallStore((s) => s.dismiss);
  const setting = usePartyStore((s) => s.list?.find((party) => party.id === call.partyId)?.setting);
  const [hero, setHero] = useState<Character | null | undefined>(undefined);
  const [thrown, setThrown] = useState<{ dice: TableDie[]; check: TableCheck } | null>(null);

  useEffect(() => {
    let alive = true;
    void calledHero(call.characterId).then((found) => alive && setHero(found));
    return () => {
      alive = false;
    };
  }, [call.characterId]);

  useEffect(() => {
    if (!thrown) return;
    const timer = window.setTimeout(() => dismiss(call), AFTER_THROW_MS);
    return () => window.clearTimeout(timer);
  }, [thrown, call, dismiss]);

  if (hero === undefined || !setting) return null;
  const plan = callPlan(hero, call);
  const mode = call.mode;
  const formula = `1d20${plan.bonus ? ` ${signed(plan.bonus)}` : ''}`;
  const check: TableCheck = {
    title: plan.title,
    formula,
    bonus: plan.bonus,
    total: 0,
    ...(call.target !== null ? { target: call.target } : {}),
    callId: call.id,
  };

  const roll = () => {
    const d20 = rollD20(mode);
    // Of two equal dice the first one counts.
    const dice: TableDie[] = d20.dice.map((value, index) => ({ sides: 20, value, ...(index !== d20.dice.indexOf(d20.kept) ? { dropped: true } : {}) }));
    const done = { ...check, total: d20.kept + plan.bonus };
    setThrown({ dice, check: done });
    announceRoll(call.characterId, dice, `${plan.title}, ${formula}: ${done.total}`, done);
  };

  return (
    <SettingScope setting={setting} className="flex flex-col items-center gap-3">
      <CheckPanel
        title={plan.title}
        subtitle={`Мастер просит бросок · ${call.heroName}`}
        dice={thrown?.dice ?? []}
        check={thrown?.check ?? check}
        parts={plan.parts}
        onRoll={thrown ? undefined : roll}
        pair={mode === 'normal' ? undefined : mode}
      />
      {/* Hidden once thrown rather than taken away, so the plate does not move. */}
      <Button
        variant="ghost"
        size="sm"
        className={cx(thrown && 'invisible')}
        disabled={!!thrown}
        onClick={() => dismiss(call)}
      >
        Не сейчас
      </Button>
    </SettingScope>
  );
};

/** The first of the calls waiting for this player, over everything, wherever they are in the app. */
export const RollCallOverlay: React.FC = () => {
  const call = useRollCallStore((s) => s.calls[0]);
  return (
    <AnimatePresence>
      {call && (
        <motion.div
          key={`${call.id}:${call.heroId}`}
          className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-[rgb(var(--c-bg-deep)/0.72)] py-6 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          role="dialog"
          aria-label="Мастер просит бросок"
        >
          <CallPlate call={call} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
