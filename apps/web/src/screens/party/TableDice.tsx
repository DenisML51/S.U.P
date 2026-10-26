import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TableDie } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useTableRollStore, type ShownRoll } from '../../store/useTableRollStore';
import { RollingDie } from '../../ui/RollingDie';
import { cx } from '../../ui/primitives';

/** Between the landings of two dice of one throw, in ms. */
const STAGGER_MS = 120;

/** The edge of a die: as large as the place allows, smaller as the handful grows. */
const dieSize = (count: number, place: 'portrait' | 'screen') =>
  place === 'screen'
    ? count <= 2
      ? '13rem'
      : count <= 4
        ? '9.5rem'
        : count <= 8
          ? '7rem'
          : '5rem'
    : count <= 1
      ? '6.5rem'
      : count <= 2
        ? '4.75rem'
        : count <= 4
          ? '3.4rem'
          : count <= 9
            ? '2.4rem'
            : '1.7rem';

/** The dice of one throw, only the dice with their numbers, landing one after another. */
const Dice: React.FC<{ dice: TableDie[]; place: 'portrait' | 'screen' }> = ({ dice, place }) => {
  const size = dieSize(dice.length, place);
  return (
    <span
      className={cx(
        'flex flex-wrap items-center justify-center',
        place === 'screen' ? 'max-w-[min(56rem,90vw)] gap-x-8 gap-y-5' : 'max-w-full gap-1.5 p-2',
      )}
    >
      {dice.map((die, index) => (
        <RollingDie
          key={index}
          sides={die.sides}
          value={die.label ?? die.value}
          dropped={die.dropped}
          size={size}
          delay={index * STAGGER_MS}
          phase={index * 1.3 + die.sides * 0.1}
          tone={
            die.label
              ? undefined
              : die.value === die.sides && die.sides > 2
                ? 'success'
                : die.value === 1
                  ? 'danger'
                  : undefined
          }
        />
      ))}
    </span>
  );
};

/** The setting's own haze behind dice laid over a portrait: the whole card, so they never melt into the art. */
const CARD_HAZE = 'bg-[rgb(var(--c-bg-deep)/0.62)] backdrop-blur-[6px]';

/**
 * The haze behind the master's dice over a screen: a soft oval round the throw that fades out at its
 * edges, leaving the screen around it in sight.
 */
const ScreenHaze: React.FC = () => (
  <span
    aria-hidden
    className="absolute -inset-x-28 -inset-y-20 bg-[rgb(var(--c-bg-deep)/0.75)] backdrop-blur-[6px]"
    style={{
      maskImage: 'radial-gradient(closest-side, #000 45%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(closest-side, #000 45%, transparent 100%)',
    }}
  />
);

const Thrown: React.FC<{ roll: ShownRoll | undefined; place: 'portrait' | 'screen'; className?: string }> = ({
  roll,
  place,
  className,
}) => (
  <AnimatePresence>
    {roll && (
      <motion.span
        // A new throw replaces the last one and tumbles again.
        key={roll.id}
        className={cx(
          'pointer-events-none flex items-center justify-center text-frame-bright',
          place === 'portrait' && CARD_HAZE,
          className,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.18 } }}
        exit={{ opacity: 0, transition: { duration: 0.45 } }}
        aria-hidden
      >
        <span className="relative flex items-center justify-center">
          {place === 'screen' && <ScreenHaze />}
          <span className="relative">
            <Dice dice={roll.dice} place={place} />
          </span>
        </span>
      </motion.span>
    )}
  </AnimatePresence>
);

/** A hero's latest throw over its portrait, for a few seconds. */
export const HeroRoll: React.FC<{ partyId: string; heroId: string; className?: string }> = ({
  partyId,
  heroId,
  className,
}) => {
  const roll = useTableRollStore((s) => s.heroes[partyId]?.[heroId]);
  return <Thrown roll={roll} place="portrait" className={cx('absolute inset-0 z-10', className)} />;
};

/**
 * The master's own throw over the whole screen of whoever it was meant for, while they are at that
 * party's table: on the table itself, or in a hero while the table fights. Heroes' throws never
 * come here: they land on the squad's portraits, and in the fight's chat.
 */
export const TableRollOverlay: React.FC = () => {
  const place = useNavStore((s) => s.place);
  const partyId = place.screen === 'party' ? place.partyId : null;
  const roll = useTableRollStore((s) => (partyId ? s.centre[partyId] : undefined));
  const heroOpen = useCharacterStore((s) => s.character !== null);
  const fighting = usePartyStore((s) => (partyId ? !!s.parties[partyId]?.combat : false));
  const shown = roll && roll.kind === 'master' && (!heroOpen || fighting) ? roll : undefined;
  return <Thrown roll={shown} place="screen" className="fixed inset-0 z-[70]" />;
};
