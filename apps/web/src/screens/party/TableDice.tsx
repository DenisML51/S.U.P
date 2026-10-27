import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useTableRollStore, type CentreRoll, type ShownRoll } from '../../store/useTableRollStore';
import { CheckPanel } from '../../ui/CheckPanel';
import { SettingScope } from '../../ui/theme/SettingScope';
import { RollingDie } from '../../ui/RollingDie';
import { cx } from '../../ui/primitives';
import { OUTCOME_LABEL, checkOutcome, outcomeSucceeded } from '../../ui/checkOutcome';

/** Between the landings of two dice of one throw, in ms (the table's logs wait for them too). */
export const TABLE_DIE_STAGGER_MS = 120;

/** The edge of a die over a portrait: smaller as the handful grows. */
const dieSize = (count: number) =>
  count <= 1 ? '6.5rem' : count <= 2 ? '4.75rem' : count <= 4 ? '3.4rem' : count <= 9 ? '2.4rem' : '1.7rem';

/** The setting's own haze behind dice laid over a portrait: the whole card, so they never melt into the art. */
const CARD_HAZE = 'bg-[rgb(var(--c-bg-deep)/0.62)] backdrop-blur-[6px]';

/**
 * A hero's throw over its portrait: the dice only, with their numbers, landing one after another,
 * and the outcome under them once they are down when the throw had a target.
 */
const Thrown: React.FC<{ roll: ShownRoll; className?: string }> = ({ roll, className }) => {
  const [landed, setLanded] = useState(false);
  const outcome = roll.check ? checkOutcome(roll.check) : null;
  const size = dieSize(roll.dice.length);
  return (
    <motion.span
      className={cx('pointer-events-none flex flex-col items-center justify-center text-frame-bright', CARD_HAZE, className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.18 } }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      aria-hidden
    >
      <span className="flex max-w-full flex-wrap items-center justify-center gap-1.5 p-2">
        {roll.dice.map((die, index) => (
          <RollingDie
            key={index}
            sides={die.sides}
            value={die.label ?? die.value}
            dropped={die.dropped}
            size={size}
            delay={index * TABLE_DIE_STAGGER_MS}
            phase={index * 1.3 + die.sides * 0.1}
            tone={die.label ? undefined : die.value === die.sides && die.sides > 2 ? 'success' : die.value === 1 ? 'danger' : undefined}
            onLanded={index === roll.dice.length - 1 ? () => setLanded(true) : undefined}
          />
        ))}
      </span>
      {outcome && (
        <motion.span
          className={cx('ui-check-stamp ui-check-stamp--small', outcomeSucceeded(outcome) ? 'text-success' : 'text-danger')}
          initial={{ opacity: 0, scale: 1.3 }}
          animate={landed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.3 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}
        >
          {roll.check?.total} · {OUTCOME_LABEL[outcome]}
        </motion.span>
      )}
    </motion.span>
  );
};

/** A hero's latest throw over its portrait, for a few seconds; a new throw replaces it and tumbles again. */
export const HeroRoll: React.FC<{ partyId: string; heroId: string; className?: string }> = ({
  partyId,
  heroId,
  className,
}) => {
  const roll = useTableRollStore((s) => s.heroes[partyId]?.[heroId]);
  return (
    <AnimatePresence>
      {roll && <Thrown key={roll.id} roll={roll} className={cx('absolute inset-0 z-10', className)} />}
    </AnimatePresence>
  );
};

/** The words over a check on the screen: what it was, and who threw it how. */
const headingOf = (roll: CentreRoll) => {
  const formula = roll.check?.formula ?? roll.label.split(':')[0] ?? '';
  const title = roll.check?.title || (roll.heroName ? roll.heroName : formula || 'Бросок');
  const who = roll.kind === 'master' ? 'Бросок мастера' : (roll.heroName ?? '');
  const subtitle = [title === roll.heroName ? '' : who, formula].filter(Boolean).join(' · ');
  return { title, subtitle };
};

/**
 * The middle of the screen at a party's table: the master's own throw, over the screens of whoever
 * it was meant for while they are at that table (on the table itself, or in a hero while the table
 * fights) — and, for the master, a hero's throw answering the master's call. Heroes' other throws
 * never come here: they land on the squad's portraits, and in the fight's chat. Each comes as a check
 * plate in the table's own setting.
 */
export const TableRollOverlay: React.FC = () => {
  const place = useNavStore((s) => s.place);
  const partyId = place.screen === 'party' ? place.partyId : null;
  const roll = useTableRollStore((s) => (partyId ? s.centre[partyId] : undefined));
  const heroOpen = useCharacterStore((s) => s.character !== null);
  const fighting = usePartyStore((s) => (partyId ? !!s.parties[partyId]?.combat : false));
  const setting = usePartyStore((s) => (partyId ? s.parties[partyId]?.setting : undefined));
  const master = usePartyStore((s) => s.list?.some((party) => party.id === partyId && party.role === 'master'));
  const shown = roll && (roll.kind === 'master' ? !heroOpen || fighting : master) ? roll : undefined;
  return (
    <AnimatePresence>
      {shown && setting && (
        <motion.div
          key={shown.id}
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.45 } }}
          aria-hidden
        >
          <SettingScope setting={setting} className="contents">
            <CheckPanel {...headingOf(shown)} dice={shown.dice} check={shown.check} />
          </SettingScope>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
