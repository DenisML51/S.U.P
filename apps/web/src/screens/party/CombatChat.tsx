import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PartyDto, TableRollDto } from '@itd/schema';
import { useChatStore } from '../../store/useChatStore';
import { useTableRollStore } from '../../store/useTableRollStore';
import { DieGlyph, useHeldUntilLanded } from '../../ui/RollingDie';
import { IconClose, IconQuill } from '../../ui/icons';
import { IconButton, Panel, Tabs, cx } from '../../ui/primitives';
import { ChatPanel } from './ChatPanel';
import { DiceLog } from './DiceLog';
import { TABLE_DIE_STAGGER_MS } from './TableDice';

const PREVIEW = 3;

/** What a throw came to, told once its dice on the table are down. */
const RollText: React.FC<{ roll: TableRollDto }> = ({ roll }) => {
  const told = useHeldUntilLanded(roll.createdAt, roll.dice.length, TABLE_DIE_STAGGER_MS);
  return (
    <span className="truncate">
      {told ? roll.label || roll.dice.map((die) => die.label ?? die.value).join(' · ') : 'бросает…'}
    </span>
  );
};

/**
 * The table's talk over the combat screen, with the table's throws: in a fight the others' dice show
 * here (the squad's portraits are out of sight). Folded, it is just the last few lines of either,
 * quiet and out of the way; opened, the full chat with its input, or the dice log.
 */
export const CombatChat: React.FC<{ party: PartyDto; userId: string | undefined; className?: string }> = ({
  party,
  userId,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'chat' | 'dice'>('chat');
  const rolls = useTableRollStore((s) => s.logs[party.id]);
  const loadLog = useTableRollStore((s) => s.loadLog);
  useEffect(() => {
    void loadLog(party.id);
  }, [party.id, loadLog]);
  const load = useChatStore((s) => s.load);
  const items = useChatStore((s) => s.chats[party.id]?.items);
  const unread = useChatStore((s) => s.unread[party.id] ?? 0);
  useEffect(() => {
    void load(party.id);
  }, [party.id, load]);

  // The last lines of the talk and the throws together, in the order they came.
  const last = [
    ...(items ?? []).slice(-PREVIEW).map((message) => ({ at: message.createdAt, message, roll: null })),
    ...(rolls ?? []).slice(-PREVIEW).map((roll) => ({ at: roll.createdAt, message: null, roll })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-PREVIEW);
  const masterId = party.masterId;

  return (
    <div className={cx('pointer-events-auto', className)}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Panel className="relative flex h-[min(52vh,30rem)] flex-col px-4 pb-3 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <Tabs
                  label="Стол"
                  value={tab}
                  onChange={setTab}
                  items={[
                    { id: 'chat', label: 'Чат' },
                    { id: 'dice', label: 'Кубы' },
                  ]}
                />
                <IconButton label="Свернуть чат" size={28} onClick={() => setOpen(false)}>
                  <IconClose width={14} height={14} />
                </IconButton>
              </div>
              {tab === 'chat' ? (
                <ChatPanel party={party} userId={userId} />
              ) : (
                <DiceLog party={party} userId={userId} />
              )}
            </Panel>
          </motion.div>
        ) : (
          <motion.button
            key="folded"
            type="button"
            onClick={() => setOpen(true)}
            className="ui-combat-chat group block w-full text-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            title="Открыть чат стола"
          >
            <span className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink-faint transition-colors group-hover:text-frame-bright">
              <IconQuill width={13} height={13} />
              Чат стола
              {unread > 0 && <span className="ui-combat-chat__badge ui-numeric">{unread}</span>}
            </span>
            {last.length === 0 ? (
              <span className="block text-xs text-ink-faint">Пока тихо — нажмите, чтобы написать</span>
            ) : (
              <ol className="space-y-1">
                {last.map(({ message, roll }, index) =>
                  roll ? (
                    <li
                      key={roll.id}
                      className="flex items-center gap-1.5 truncate text-[13px] leading-snug text-ink-muted"
                      style={{ opacity: 0.5 + (0.5 * (index + 1)) / last.length }}
                    >
                      <DieGlyph
                        sides={roll.dice[0]?.sides ?? 20}
                        className="h-3.5 w-3.5 shrink-0 text-frame-bright"
                      />
                      <span
                        className={cx(
                          'font-semibold',
                          roll.kind === 'master' ? 'text-frame-bright' : 'text-ink',
                        )}
                      >
                        {roll.kind === 'master'
                          ? roll.authorId === userId
                            ? 'Вы'
                            : roll.authorName
                          : (roll.heroName ?? roll.authorName)}
                      </span>
                      <RollText roll={roll} />
                    </li>
                  ) : (
                    <li
                      key={message!.id}
                      className={cx(
                        'truncate text-[13px] leading-snug',
                        message!.recipientId ? 'text-accent' : 'text-ink-muted',
                      )}
                      style={{ opacity: 0.5 + (0.5 * (index + 1)) / last.length }}
                    >
                      <span
                        className={cx(
                          'font-semibold',
                          message!.authorId === masterId ? 'text-frame-bright' : 'text-ink',
                        )}
                      >
                        {message!.authorId === userId ? 'Вы' : message!.authorName}
                      </span>
                      {message!.recipientId && ' (лично)'}: {message!.body}
                    </li>
                  ),
                )}
              </ol>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
