import React from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import type { CombatantDto, CombatDto } from '@itd/schema';
import { assetUrl } from '../../data/api/client';
import { cx } from '../../ui/primitives';

const TOKEN = { lg: 68, sm: 50 } as const;

/**
 * The order of the fight as a row of portraits: highest initiative first, the one whose turn it is
 * raised and lit, those still to roll dimmed with a question mark. Hit points show under the
 * portraits the viewer may see.
 */
export const InitiativeStrip: React.FC<{
  combat: CombatDto;
  size?: keyof typeof TOKEN;
  /**
   * Clicking a portrait: the master sets anyone's roll at any time, a player their own while
   * initiative is rolled (or once, for a hero brought into a running fight). The server holds to it.
   */
  onPick?: (combatant: CombatantDto) => void;
  master?: boolean;
  className?: string;
}> = ({ combat, size = 'lg', onPick, master, className }) => {
  const side = TOKEN[size];
  const pickable = (combatant: CombatantDto) =>
    combatant.controlled && (master || combat.phase === 'initiative' || combatant.initiative === null);
  return (
    <LayoutGroup>
      <ol className={cx('ui-initiative flex min-w-0 items-start gap-3 overflow-x-auto px-1 pb-1 pt-3', className)} aria-label="Очерёдность хода">
        {combat.combatants.map((combatant, index) => (
          <Token
            key={combatant.id}
            combatant={combatant}
            place={index + 1}
            side={side}
            current={combatant.id === combat.currentCombatantId}
            onPick={onPick && (pickable(combatant) ? () => onPick(combatant) : undefined)}
          />
        ))}
      </ol>
    </LayoutGroup>
  );
};

const Token: React.FC<{
  combatant: CombatantDto;
  place: number;
  side: number;
  current: boolean;
  onPick?: () => void;
}> = ({ combatant, place, side, current, onPick }) => {
  const waiting = combatant.initiative === null;
  const vitals = combatant.vitals;
  const hpShare = vitals ? Math.max(0, Math.min(1, vitals.currentHP / Math.max(1, vitals.maxHP))) : null;
  const Body = onPick ? 'button' : 'div';
  return (
    <motion.li
      layout
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="relative shrink-0"
      style={{ width: side + 8 }}
      aria-current={current ? 'step' : undefined}
    >
      <Body
        type={onPick ? 'button' : undefined}
        onClick={onPick}
        title={onPick ? (waiting ? 'Бросить инициативу' : 'Изменить инициативу') : combatant.name}
        className={cx(
          'ui-initiative__token group flex w-full flex-col items-center gap-1.5 text-center',
          current && 'ui-initiative__token--current',
          waiting && 'ui-initiative__token--waiting',
          combatant.hostile && 'ui-initiative__token--hostile',
          combatant.kind === 'npc' && !combatant.hostile && 'ui-initiative__token--ally',
          // An NPC at 0 hit points is out: its turns are passed over.
          combatant.kind === 'npc' && vitals && vitals.currentHP <= 0 && 'opacity-35 grayscale',
        )}
      >
        <span className="ui-initiative__portrait relative block overflow-hidden" style={{ width: side, height: side }}>
          {combatant.portrait ? (
            <img src={assetUrl(combatant.portrait)} alt="" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: '50% 25%' }} />
          ) : (
            <span className="ui-display grid h-full w-full place-items-center bg-inset text-2xl text-frame/50">
              {combatant.name.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
          {hpShare !== null && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-bg-deep/80">
              <span className="block h-full bg-hp transition-[width] duration-500" style={{ width: `${hpShare * 100}%` }} />
            </span>
          )}
        </span>
        <span className={cx('block w-full truncate text-[11px] leading-tight', current ? 'text-ink' : 'text-ink-muted')}>{combatant.name}</span>
      </Body>
      <span className="ui-initiative__badge ui-numeric pointer-events-none absolute -left-1 -top-2 grid min-w-[1.6rem] place-items-center px-1 text-xs">
        {waiting ? '?' : combatant.initiative}
      </span>
      <span className="sr-only">{place}-й по очереди</span>
    </motion.li>
  );
};
