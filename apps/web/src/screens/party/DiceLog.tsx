import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PartyDto, TableDie, TableRollDto } from '@itd/schema';
import { useTableRollStore } from '../../store/useTableRollStore';
import { DieGlyph } from '../../ui/RollingDie';
import { cx } from '../../ui/primitives';
import { locale } from '../../i18n';

const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * The table's dice log: every throw the viewer may see, newest at the bottom. Players' throws are
 * everyone's; a master's throw meant for some players says for whom.
 */
export const DiceLog: React.FC<{ party: PartyDto; userId: string | undefined }> = ({ party, userId }) => {
  const log = useTableRollStore((s) => s.logs[party.id]);
  const loadLog = useTableRollStore((s) => s.loadLog);
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  useEffect(() => {
    void loadLog(party.id);
  }, [party.id, loadLog]);
  const count = log?.length ?? 0;
  useLayoutEffect(() => {
    const node = list.current;
    if (node && atBottom.current) node.scrollTop = node.scrollHeight;
  }, [count]);

  return (
    <div
      ref={list}
      className="ui-scroll -mr-2 min-h-0 flex-1 overflow-y-auto pr-2"
      onScroll={(event) => {
        const node = event.currentTarget;
        atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24;
      }}
    >
      {count === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">
          {log ? 'Кубы ещё не брошены. Броски героев и мастера появятся здесь.' : 'Загружаем броски…'}
        </p>
      ) : (
        <ol className="space-y-2.5 py-1">
          {log!.map((roll) => (
            <Entry key={roll.id} roll={roll} mine={roll.authorId === userId} />
          ))}
        </ol>
      )}
    </div>
  );
};

const Entry: React.FC<{ roll: TableRollDto; mine: boolean }> = ({ roll, mine }) => {
  const master = roll.kind === 'master';
  const who = master ? (mine ? 'Вы' : roll.authorName) : (roll.heroName ?? roll.authorName);
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cx(
        'ui-chat__line px-3 py-2',
        master && 'ui-chat__line--master',
        roll.audienceNames && 'ui-chat__line--private',
      )}
    >
      <div className="flex items-baseline gap-2 text-[11px]">
        <span className={cx('truncate font-semibold', master ? 'text-frame-bright' : 'text-ink')}>
          {who}
          {master && <span className="font-normal text-ink-faint"> · мастер</span>}
        </span>
        {roll.audienceNames && (
          <span className="min-w-0 truncate text-accent">
            {roll.audienceNames.length > 0 ? `→ ${roll.audienceNames.join(', ')}` : 'только мастеру'}
          </span>
        )}
        <span className="ml-auto shrink-0 text-ink-faint">{time.format(new Date(roll.createdAt))}</span>
      </div>
      {roll.label && <p className="mt-0.5 break-words text-sm leading-snug text-ink-muted">{roll.label}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {roll.dice.map((die, index) => (
          <LogDie key={index} die={die} />
        ))}
      </div>
    </motion.li>
  );
};

/** A die of the log: its solid, still, with the face it landed on beside it. */
const LogDie: React.FC<{ die: TableDie }> = ({ die }) => (
  <span
    className={cx('flex items-center gap-1 text-ink', die.dropped && 'opacity-40 line-through')}
    title={`d${die.sides}`}
  >
    <DieGlyph sides={die.sides} className="h-4 w-4 text-frame-bright" />
    <span className="ui-numeric text-xs">{die.label ?? die.value}</span>
  </span>
);
