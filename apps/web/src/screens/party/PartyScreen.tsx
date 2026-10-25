import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  formatInviteCode,
  PARTY_LIMITS,
  type PartyDto,
  type PartyHeroDto,
  type PartyNpcDto,
} from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useChatStore } from '../../store/useChatStore';
import { useNavStore } from '../../store/useNavStore';
import { useParty, usePartyStore } from '../../store/usePartyStore';
import { useSessionStore } from '../../store/useSessionStore';
import { ConfirmDialog } from '../../ui/Dialog';
import {
  IconClose,
  IconCombat,
  IconEdit,
  IconExit,
  IconHistory,
  IconCopy,
  IconInitiative,
  IconPrev,
  IconSettings,
  IconSync,
} from '../../ui/icons';
import { Button, IconButton, Panel, Tabs, cx } from '../../ui/primitives';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { ChatPanel } from './ChatPanel';
import { HeroPickDialog } from './HeroPickDialog';
import { InitiativeDialog } from './InitiativeDialog';
import { InitiativeStrip } from './InitiativeStrip';
import { LoreDialog } from './LoreDialog';
import { NpcDialog } from './NpcDialog';
import { PartyCover } from './PartyCover';
import { initiativeBonusOf } from './partyView';
import { StartCombatDialog } from './StartCombatDialog';
import { TableDecks } from './PartyDecks';
import { Companions, MyHero } from './PlayerSeat';
import { useTableCombat } from './useTableCombat';
import { SyncStatus } from '../../ui/SyncStatus';

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * A party's table, in the party's world: the cover and story on top, the heroes at the table, the
 * fight when one goes on. The master also keeps the invite code, the NPCs and the seats here.
 */
export const PartyScreen: React.FC<{ partyId: string; onOpenSettings: () => void }> = ({
  partyId,
  onOpenSettings,
}) => {
  const party = useParty(partyId);
  const gone = usePartyStore((s) => s.gone[partyId]);
  const failed = usePartyStore((s) => s.failed[partyId]);
  const closed = usePartyStore((s) => s.closed[partyId]);
  const refreshParty = usePartyStore((s) => s.refreshParty);
  const go = useNavStore((s) => s.go);
  useDocumentSetting(party?.setting ?? 'service');

  useEffect(() => {
    if (!gone && !closed) return;
    toast(gone ? 'Вы больше не за этим столом' : 'Сессия не идёт — стол откроется, когда мастер её начнёт', {
      id: `out-${partyId}`,
    });
    go({ screen: 'home' });
  }, [gone, closed, go, partyId]);

  if (!party) {
    return (
      <SettingScope setting="service" className="grid h-screen place-items-center bg-bg">
        {failed ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-ink-muted">Не удалось открыть партию — сервер недоступен.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => go({ screen: 'home' })}>
                На главную
              </Button>
              <Button variant="primary" onClick={() => void refreshParty(partyId)}>
                Повторить
              </Button>
            </div>
          </div>
        ) : (
          <span className="animate-pulse text-sm text-ink-faint">Собираем партию…</span>
        )}
      </SettingScope>
    );
  }
  return <Table party={party} onOpenSettings={onOpenSettings} onHome={() => go({ screen: 'home' })} />;
};

// ------------------------------------------------------------------------------------------------

type Overlay =
  | { kind: 'lore' }
  | { kind: 'leave' }
  | { kind: 'pick-hero' }
  | { kind: 'combat' }
  | { kind: 'npc'; npc?: PartyNpcDto }
  | { kind: 'remove-hero'; hero: PartyHeroDto }
  | { kind: 'kick'; userId: string; name: string }
  | { kind: 'new-code' }
  | { kind: 'end-combat' }
  | { kind: 'end-session' };

const Table: React.FC<{ party: PartyDto; onOpenSettings: () => void; onHome: () => void }> = ({
  party,
  onOpenSettings,
  onHome,
}) => {
  const userId = useSessionStore((s) => s.user?.id);
  const store = usePartyStore.getState();
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const startCreation = useNavStore((s) => s.startCreation);
  const go = useNavStore((s) => s.go);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const close = () => setOverlay(null);
  const combat = useTableCombat(party);
  const isMaster = combat.isMaster;

  const myHeroes = party.heroes.filter((hero) => hero.ownerId === userId);
  const canBring = myHeroes.length < (isMaster ? PARTY_LIMITS.masterHeroes : PARTY_LIMITS.playerHeroes);

  // A player who has just sat down is asked whom they bring.
  const askedForHero = useRef(false);
  useEffect(() => {
    if (askedForHero.current || isMaster || myHeroes.length > 0) return;
    askedForHero.current = true;
    setOverlay({ kind: 'pick-hero' });
  }, [isMaster, myHeroes.length]);

  // A hero begun for this table and left unfinished is picked up where it was.
  const createHero = () => {
    startCreation({ world: party.setting, partyId: party.id });
  };

  return (
    <SettingScope setting={party.setting} className="ui-morph relative h-screen overflow-clip bg-bg">
      {/* The table stands in its world: the setting's own backdrop, as on the hero's sheet, but without
          the screen-corner flourishes — the table's panels frame it already. */}
      <SettingBackdrop setting={party.setting} strength={0.7} frame={false} />

      <div className="relative z-10 flex h-full flex-col gap-5 px-14 pb-8 pt-7">
        <motion.header
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0, transition: { ...ENTER, delay: 0.05 } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
        >
          <Button variant="ghost" size="sm" icon={<IconPrev width={16} height={16} />} onClick={onHome}>
            Главная
          </Button>
          <span className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">
            {SETTING_INFO[party.setting].label} ·{' '}
            {isMaster ? 'вы мастер' : `мастер ${party.members[0]?.displayName ?? ''}`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SyncStatus className="mr-2" />
            {isMaster &&
              (party.sessionStartedAt ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2"
                  onClick={() => setOverlay({ kind: 'end-session' })}
                >
                  Завершить сессию
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="mr-2"
                  onClick={() => void store.startSession(party.id)}
                >
                  Начать сессию
                </Button>
              ))}
            {isMaster ? (
              <IconButton
                label="Настройки партии"
                onClick={() => go({ screen: 'party-form', partyId: party.id })}
              >
                <IconEdit width={20} height={20} />
              </IconButton>
            ) : (
              <IconButton label="Покинуть партию" onClick={() => setOverlay({ kind: 'leave' })}>
                <IconExit width={20} height={20} />
              </IconButton>
            )}
            <IconButton label="Настройки" onClick={onOpenSettings}>
              <IconSettings width={20} height={20} />
            </IconButton>
          </div>
        </motion.header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] gap-6">
          <motion.main
            className="flex min-h-0 min-w-0 flex-col gap-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { ...ENTER, delay: 0.1 } }}
            exit={{ opacity: 0, y: 14, transition: { duration: 0.2 } }}
          >
            <Banner
              party={party}
              compact={party.combat !== null}
              onOpen={() => setOverlay({ kind: 'lore' })}
              action={
                isMaster &&
                !party.combat &&
                (!party.sessionStartedAt ? (
                  <span className="ui-session-closed text-sm">
                    Сессия не идёт — игроки ждут, стол закрыт для них
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    icon={<IconCombat width={18} height={18} />}
                    onClick={() => setOverlay({ kind: 'combat' })}
                  >
                    Начать бой
                  </Button>
                ))
              }
            />
            <AnimatePresence initial={false}>
              {party.combat && (
                <motion.div
                  key="combat"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={ENTER}
                >
                  <CombatPanel
                    party={party}
                    combat={combat}
                    onAdd={() => setOverlay({ kind: 'combat' })}
                    onEnd={() => setOverlay({ kind: 'end-combat' })}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {isMaster ? (
              <TableDecks
                party={party}
                userId={userId}
                canBring={canBring}
                onBring={() => setOverlay({ kind: 'pick-hero' })}
                onPlay={(hero) => void loadCharacter(hero.characterId)}
                onRemoveHero={(hero) => setOverlay({ kind: 'remove-hero', hero })}
                onNpc={(npc) => setOverlay({ kind: 'npc', npc })}
              />
            ) : (
              <Companions party={party} userId={userId} />
            )}
          </motion.main>

          <motion.aside
            className="flex min-h-0 flex-col gap-5"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0, transition: { ...ENTER, delay: 0.16 } }}
            exit={{ opacity: 0, x: 16, transition: { duration: 0.2 } }}
          >
            {isMaster && party.inviteCode && (
              <InvitePanel code={party.inviteCode} onRenew={() => setOverlay({ kind: 'new-code' })} />
            )}
            <TalkPanel
              party={party}
              userId={userId}
              onKick={(member) => setOverlay({ kind: 'kick', ...member })}
            />
            {/* A player's own hero waits in the corner: the way into its sheet and its fight. */}
            {!isMaster && (
              <div className="flex h-[20rem] shrink-0 flex-col">
                <MyHero
                  hero={myHeroes[0]}
                  inCombat={party.combat !== null}
                  onOpen={(view) =>
                    myHeroes[0] &&
                    void loadCharacter(myHeroes[0].characterId, view === 'combat' ? 'hotbar' : 'tabs')
                  }
                  onBring={() => setOverlay({ kind: 'pick-hero' })}
                />
              </div>
            )}
          </motion.aside>
        </div>
      </div>

      {/* --- Windows -------------------------------------------------------------------------- */}
      <InitiativeDialog
        key={combat.rolling?.id ?? 'none'}
        partyId={party.id}
        setting={party.setting}
        combatant={combat.rolling}
        bonus={combat.rolling ? initiativeBonusOf(party, combat.rolling) : null}
        canRemove={isMaster}
        onClose={() => combat.roll(null)}
      />
      <HeroPickDialog
        open={overlay?.kind === 'pick-hero'}
        partyId={party.id}
        setting={party.setting}
        onClose={close}
        onCreate={createHero}
      />
      {overlay?.kind === 'combat' && <StartCombatDialog open party={party} onClose={close} />}
      {overlay?.kind === 'npc' && (
        <NpcDialog open partyId={party.id} setting={party.setting} npc={overlay.npc} onClose={close} />
      )}
      <LoreDialog
        open={overlay?.kind === 'lore'}
        party={party}
        onClose={close}
        onEdit={isMaster ? () => go({ screen: 'party-form', partyId: party.id }) : undefined}
      />
      <ConfirmDialog
        open={overlay?.kind === 'leave'}
        title="Покинуть партию?"
        message="Ваш герой уйдёт из-за стола вместе с вами. Вернуться можно по коду приглашения."
        confirmLabel="Покинуть"
        danger
        onCancel={close}
        onConfirm={() => userId && void store.removeMember(party.id, userId).then((left) => left && onHome())}
      />
      <ConfirmDialog
        open={overlay?.kind === 'remove-hero'}
        title="Убрать героя из партии?"
        message={
          overlay?.kind === 'remove-hero' && (
            <>
              <span className="text-ink">{overlay.hero.name}</span> покинет стол; лист героя останется у
              владельца.
            </>
          )
        }
        confirmLabel="Убрать"
        danger
        onCancel={close}
        onConfirm={() => {
          if (overlay?.kind === 'remove-hero') void store.removeHero(party.id, overlay.hero.id);
          close();
        }}
      />
      <ConfirmDialog
        open={overlay?.kind === 'kick'}
        title="Убрать игрока из-за стола?"
        message={
          overlay?.kind === 'kick' && (
            <>
              <span className="text-ink">{overlay.name}</span> и его герой покинут партию.
            </>
          )
        }
        confirmLabel="Убрать"
        danger
        onCancel={close}
        onConfirm={() => {
          if (overlay?.kind === 'kick') void store.removeMember(party.id, overlay.userId);
          close();
        }}
      />
      <ConfirmDialog
        open={overlay?.kind === 'new-code'}
        title="Новый код приглашения?"
        message="Старый код перестанет работать. Те, кто уже за столом, останутся."
        confirmLabel="Сменить код"
        onCancel={close}
        onConfirm={() => {
          void store.regenerateInvite(party.id);
          close();
        }}
      />
      <ConfirmDialog
        open={overlay?.kind === 'end-combat'}
        title="Завершить бой?"
        message="Очерёдность и броски инициативы сбросятся."
        confirmLabel="Завершить"
        onCancel={close}
        onConfirm={() => {
          void store.endCombat(party.id);
          close();
        }}
      />
      <ConfirmDialog
        open={overlay?.kind === 'end-session'}
        title="Завершить сессию?"
        message="Игроки выйдут из мира, бой закончится. НПС, их хиты, чат и летопись сохранятся; войти за стол можно будет, когда вы начнёте следующую сессию."
        confirmLabel="Завершить сессию"
        onCancel={close}
        onConfirm={() => {
          void store.endSession(party.id);
          close();
        }}
      />
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

/** The cover with the party's name and story; it folds down to a strip while a fight goes on. */
const Banner: React.FC<{
  party: PartyDto;
  compact: boolean;
  onOpen: () => void;
  action?: React.ReactNode;
}> = ({ party, compact, onOpen, action }) => (
  <Panel crest className="ui-party-banner group shrink-0 overflow-hidden p-0">
    <motion.div
      className="relative flex"
      initial={false}
      animate={{ height: compact ? 96 : 'min(32vh, 300px)' }}
      transition={ENTER}
    >
      <PartyCover
        assetId={party.coverAssetId}
        setting={party.setting}
        className="!absolute inset-0 !rounded-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-deep via-bg-deep/80 via-50% to-bg-deep/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/90 via-transparent via-60% to-transparent" />
      {/* The whole cover opens the chronicle; the text over it lets clicks through. */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 cursor-pointer"
        aria-label="Открыть летопись партии"
        title="Летопись"
      />
      <div className="pointer-events-none relative flex max-w-[44rem] flex-col justify-end gap-2 px-8 py-6">
        <h1
          className={cx(
            'ui-display ui-title leading-[1.05] text-ink transition-all',
            compact ? 'text-[2rem]' : 'text-[2.8rem]',
          )}
        >
          {party.name}
        </h1>
        {!compact && party.description && (
          <p className="line-clamp-3 whitespace-pre-line pr-2 text-[15px] leading-relaxed text-ink-muted">
            {party.description}
          </p>
        )}
        {!compact && (
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-frame-bright/70 transition-colors group-hover:text-frame-bright">
            <IconHistory width={14} height={14} />
            Летопись
          </span>
        )}
      </div>
      {action && <div className="absolute bottom-6 right-6">{action}</div>}
    </motion.div>
  </Panel>
);

/** The master's invite code: read out, copied, or replaced when it leaked. */
const InvitePanel: React.FC<{ code: string; onRenew: () => void }> = ({ code, onRenew }) => {
  const shown = formatInviteCode(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      toast.success('Код скопирован');
    } catch {
      toast.error('Не удалось скопировать — выделите код вручную');
    }
  };
  return (
    <Panel className="shrink-0 px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="ui-label !mb-0">Код приглашения</span>
        <div className="flex gap-0.5">
          <IconButton label="Скопировать код" size={30} onClick={() => void copy()}>
            <IconCopy width={16} height={16} />
          </IconButton>
          <IconButton label="Сменить код" size={30} onClick={onRenew}>
            <IconSync width={16} height={16} />
          </IconButton>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="ui-invite-code ui-numeric mt-1 block w-full select-all text-left text-[1.7rem] text-frame-bright"
        title="Скопировать"
      >
        {shown}
      </button>
      <p className="mt-1 text-xs text-ink-faint">Игроки вводят его на главной, в блоке «Партии»</p>
    </Panel>
  );
};

// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------

/** The fight: the order of turns, and what the viewer can do about it right now. */
const CombatPanel: React.FC<{
  party: PartyDto;
  combat: ReturnType<typeof useTableCombat>;
  onAdd: () => void;
  onEnd: () => void;
}> = ({ party, combat: seat, onAdd, onEnd }) => {
  const store = usePartyStore.getState();
  const fight = party.combat!;
  const waiting = fight.combatants.filter((c) => c.initiative === null);
  const npcsWaiting = waiting.some((c) => c.kind === 'npc');
  const rolling = fight.phase === 'initiative';

  return (
    <Panel className="px-6 pb-4 pt-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0">
          <div className="ui-display ui-title text-[1.35rem] leading-none text-frame-bright">
            {rolling ? 'Бросок инициативы' : `Раунд ${fight.round}`}
          </div>
          <div className="mt-1 truncate text-xs text-ink-muted">
            {rolling
              ? waiting.length > 0
                ? `Ждём бросков: ${waiting.map((c) => c.name).join(', ')}`
                : 'Все бросили — можно начинать'
              : seat.current
                ? `Ходит ${seat.current.name}`
                : 'Очередь пуста'}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {seat.isMaster && rolling && npcsWaiting && (
            <Button
              variant="secondary"
              size="sm"
              icon={<IconInitiative width={15} height={15} />}
              onClick={() => void store.rollNpcInitiative(party.id)}
            >
              Бросить за НПС
            </Button>
          )}
          {!seat.isMaster && seat.toRoll[0] && (
            <Button variant="primary" size="sm" onClick={() => seat.roll(seat.toRoll[0]!)}>
              Бросить инициативу
            </Button>
          )}
          {seat.isMaster && rolling && (
            <Button variant="primary" size="sm" onClick={() => void store.beginRounds(party.id)}>
              {waiting.length > 0 ? 'Начать без них' : 'Начать раунд'}
            </Button>
          )}
          {seat.canPassTurn && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => void store.nextTurn(party.id, fight.currentCombatantId)}
            >
              {seat.myTurn ? 'Завершить ход' : 'Следующий ход'}
            </Button>
          )}
          {seat.isMaster && (
            <>
              <Button variant="ghost" size="sm" onClick={onAdd}>
                Добавить
              </Button>
              <Button variant="ghost" size="sm" onClick={onEnd}>
                Завершить бой
              </Button>
            </>
          )}
        </div>
      </div>
      <InitiativeStrip combat={fight} onPick={seat.roll} className="mt-3 [justify-content:safe_center]" />
    </Panel>
  );
};

// ------------------------------------------------------------------------------------------------

/** The table's talk and its seats, side by side on tabs. */
const TalkPanel: React.FC<{
  party: PartyDto;
  userId: string | undefined;
  onKick: (member: { userId: string; name: string }) => void;
}> = ({ party, userId, onKick }) => {
  const [tab, setTab] = useState<'chat' | 'seats'>('chat');
  const unread = useChatStore((s) => s.unread[party.id] ?? 0);
  return (
    <Panel className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-4">
      <Tabs
        label="Стол"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'chat', label: 'Чат', count: unread > 0 ? unread : undefined },
          { id: 'seats', label: 'За столом', count: party.members.length },
        ]}
      />
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        {tab === 'chat' ? (
          <ChatPanel party={party} userId={userId} />
        ) : (
          <Seats party={party} userId={userId} onKick={onKick} />
        )}
      </div>
    </Panel>
  );
};

/** Who sits at the table; the master can ask a player to leave. */
const Seats: React.FC<{
  party: PartyDto;
  userId: string | undefined;
  onKick: (member: { userId: string; name: string }) => void;
}> = ({ party, userId, onKick }) => {
  const isMaster = party.role === 'master';
  return (
    <div className="ui-scroll -mr-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
      {party.members.map((member) => (
        <div key={member.userId} className="ui-party-row group flex items-center gap-3 px-2 py-2">
          {/* A lit mark: this member has the app open right now. */}
          <span
            className={cx(
              'ui-display relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-inset',
              member.online ? 'text-frame-bright' : 'text-ink-faint',
            )}
            title={member.online ? 'В сети' : 'Не в сети'}
          >
            {member.displayName.charAt(0).toUpperCase()}
            <span
              aria-hidden
              className={cx(
                'absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-bg-deep',
                member.online ? 'bg-success shadow-[0_0_6px_rgb(var(--c-success)/0.8)]' : 'bg-ink-faint/50',
              )}
            />
          </span>
          <span className={cx('min-w-0 flex-1', !member.online && 'opacity-60')}>
            <span className="sr-only">{member.online ? 'В сети: ' : 'Не в сети: '}</span>
            <span className="block truncate text-sm text-ink">
              {member.displayName}
              {member.userId === userId && <span className="text-ink-faint"> · вы</span>}
            </span>
            <span className="block truncate text-xs text-ink-faint">
              {member.role === 'master'
                ? 'мастер'
                : party.heroes
                    .filter((hero) => hero.ownerId === member.userId)
                    .map((hero) => hero.name)
                    .join(', ') || 'без героя'}
            </span>
          </span>
          {isMaster && member.role !== 'master' && (
            <IconButton
              label="Убрать из-за стола"
              size={28}
              onClick={() => onKick({ userId: member.userId, name: member.displayName })}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <IconClose width={14} height={14} />
            </IconButton>
          )}
        </div>
      ))}
    </div>
  );
};
