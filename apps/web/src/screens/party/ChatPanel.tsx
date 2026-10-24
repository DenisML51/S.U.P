import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PARTY_MESSAGES, type PartyDto, type PartyMessageDto } from '@itd/schema';
import { useChatStore } from '../../store/useChatStore';
import { Segmented, Select } from '../../ui/forms';
import { IconNext } from '../../ui/icons';
import { IconButton, cx } from '../../ui/primitives';

const EVERYONE = 'all';
const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

/**
 * Talk at the table. Everyone writes to everyone; the master also writes to one player privately
 * and a player can answer the master privately. Private lines are marked and seen by their two ends.
 */
export const ChatPanel: React.FC<{ party: PartyDto; userId: string | undefined }> = ({ party, userId }) => {
  const chat = useChatStore((s) => s.chats[party.id]);
  const load = useChatStore((s) => s.load);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const send = useChatStore((s) => s.send);
  const setReading = useChatStore((s) => s.setReading);
  const [text, setText] = useState('');
  const [to, setTo] = useState<string>(EVERYONE);
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const isMaster = party.role === 'master';

  useEffect(() => {
    void load(party.id);
    setReading(party.id);
    return () => setReading(null);
  }, [party.id, load, setReading]);

  // New lines scroll into view unless the reader has scrolled up to read older ones.
  const count = chat?.items.length ?? 0;
  useLayoutEffect(() => {
    const node = list.current;
    if (node && atBottom.current) node.scrollTop = node.scrollHeight;
  }, [count]);

  const names = new Map(party.members.map((member) => [member.userId, member.displayName]));
  const heroOf = (memberId: string) => party.heroes.find((hero) => hero.ownerId === memberId)?.name;
  const others = party.members.filter((member) => member.userId !== userId);
  const recipients = isMaster
    ? others.filter((member) => member.role === 'player')
    : others.filter((member) => member.role === 'master');
  // The chosen reader may have left the table.
  const recipient = to !== EVERYONE && recipients.some((member) => member.userId === to) ? to : EVERYONE;

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    atBottom.current = true;
    if (await send(party.id, body, recipient === EVERYONE ? null : recipient)) setText('');
    setSending(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={list}
        className="ui-scroll -mr-2 min-h-0 flex-1 overflow-y-auto pr-2"
        onScroll={(event) => {
          const node = event.currentTarget;
          atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24;
          if (node.scrollTop < 40) void loadOlder(party.id);
        }}
      >
        {count === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">
            {isMaster
              ? 'Скажите что-нибудь столу — или кому-то одному.'
              : 'Здесь говорит стол. Мастеру можно написать лично.'}
          </p>
        ) : (
          <ol className="space-y-2.5 py-1">
            <AnimatePresence initial={false}>
              {chat!.items.map((message) => (
                <Line
                  key={message.id}
                  message={message}
                  mine={message.authorId === userId}
                  fromMaster={message.authorId === party.masterId}
                  hero={heroOf(message.authorId)}
                  toName={
                    message.recipientId
                      ? message.recipientId === userId
                        ? 'вам'
                        : (names.get(message.recipientId) ?? message.recipientName)
                      : null
                  }
                />
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>

      {!party.sessionStartedAt ? (
        <p className="ui-chat__compose mt-3 pt-3 text-center text-xs text-ink-faint">
          Сессия не идёт — чат откроется со следующей
        </p>
      ) : (
        <div className="ui-chat__compose mt-3 space-y-2 pt-3">
          {recipients.length > 0 &&
            (isMaster ? (
              <Select
                value={recipient}
                onChange={setTo}
                className="!h-8 text-sm"
                options={[
                  { value: EVERYONE, label: 'Всему столу' },
                  ...recipients.map((member) => ({
                    value: member.userId,
                    label: `Лично: ${member.displayName}`,
                    hint: heroOf(member.userId),
                  })),
                ]}
              />
            ) : (
              <Segmented
                label="Кому"
                value={recipient === EVERYONE ? EVERYONE : 'master'}
                onChange={(value) => setTo(value === EVERYONE ? EVERYONE : party.masterId)}
                options={[
                  { value: EVERYONE, label: 'Всем' },
                  { value: 'master', label: 'Мастеру лично' },
                ]}
                className="w-full"
              />
            ))}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              rows={Math.min(4, Math.max(1, text.split('\n').length))}
              maxLength={PARTY_MESSAGES.length}
              placeholder={recipient === EVERYONE ? 'Сообщение столу…' : 'Личное сообщение…'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className={cx(
                'ui-input ui-scroll min-w-0 flex-1 resize-none !py-2 text-sm',
                recipient !== EVERYONE && 'ui-chat__input--private',
              )}
            />
            <IconButton
              label="Отправить (Enter)"
              onClick={() => void submit()}
              disabled={!text.trim() || sending}
            >
              <IconNext width={18} height={18} />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
};

const Line: React.FC<{
  message: PartyMessageDto;
  mine: boolean;
  fromMaster: boolean;
  hero: string | undefined;
  toName: string | null;
}> = ({ message, mine, fromMaster, hero, toName }) => (
  <motion.li
    layout="position"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={cx(
      'ui-chat__line px-3 py-2',
      toName && 'ui-chat__line--private',
      fromMaster && 'ui-chat__line--master',
    )}
  >
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className={cx('truncate font-semibold', fromMaster ? 'text-frame-bright' : 'text-ink')}>
        {mine ? 'Вы' : message.authorName}
        {!fromMaster && hero && <span className="font-normal text-ink-faint"> · {hero}</span>}
        {fromMaster && <span className="font-normal text-ink-faint"> · мастер</span>}
      </span>
      {toName && <span className="shrink-0 text-accent">лично → {toName}</span>}
      <span className="ml-auto shrink-0 text-ink-faint">{time.format(new Date(message.createdAt))}</span>
    </div>
    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-snug text-ink-muted">
      {message.body}
    </p>
  </motion.li>
);
