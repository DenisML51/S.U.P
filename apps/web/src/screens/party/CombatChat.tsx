import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PartyDto } from '@itd/schema';
import { useChatStore } from '../../store/useChatStore';
import { IconClose, IconQuill } from '../../ui/icons';
import { IconButton, Panel, cx } from '../../ui/primitives';
import { ChatPanel } from './ChatPanel';

const PREVIEW = 3;

/**
 * The table's talk over the combat screen. Folded, it is just the last few lines, quiet and out of
 * the way; opened, it is the full chat with its input, so a player can speak without leaving the fight.
 */
export const CombatChat: React.FC<{ party: PartyDto; userId: string | undefined; className?: string }> = ({
  party,
  userId,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const load = useChatStore((s) => s.load);
  const items = useChatStore((s) => s.chats[party.id]?.items);
  const unread = useChatStore((s) => s.unread[party.id] ?? 0);
  useEffect(() => {
    void load(party.id);
  }, [party.id, load]);

  const last = (items ?? []).slice(-PREVIEW);
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
                <span className="ui-label !mb-0">Чат стола</span>
                <IconButton label="Свернуть чат" size={28} onClick={() => setOpen(false)}>
                  <IconClose width={14} height={14} />
                </IconButton>
              </div>
              <ChatPanel party={party} userId={userId} />
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
                {last.map((message, index) => (
                  <li
                    key={message.id}
                    className={cx('truncate text-[13px] leading-snug', message.recipientId ? 'text-accent' : 'text-ink-muted')}
                    style={{ opacity: 0.5 + (0.5 * (index + 1)) / last.length }}
                  >
                    <span className={cx('font-semibold', message.authorId === masterId ? 'text-frame-bright' : 'text-ink')}>
                      {message.authorId === userId ? 'Вы' : message.authorName}
                    </span>
                    {message.recipientId && ' (лично)'}: {message.body}
                  </li>
                ))}
              </ol>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
