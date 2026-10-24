import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { INVITE_CODE_LENGTH, type InvitePreviewDto, type PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { usePartyStore } from '../../store/usePartyStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { IconCombat, IconCreate, IconNext, IconSettings } from '../../ui/icons';
import { Button, IconButton, Input, Panel, cx } from '../../ui/primitives';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf, type Theme } from '../../ui/theme/settings';
import { InviteDialog } from '../party/InviteDialog';
import { PartyCover } from '../party/PartyCover';
import { SyncBadge } from '../select/SyncBadge';
import { Wordmark } from '../select/Wordmark';

const ENTER = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;
const PANEL_HEIGHT = 'min(66vh, 620px)';

/** "k7mq2x" → "K7MQ-2X": typed codes take the shape they are printed in. */
const shapeCode = (raw: string) => {
  const bare = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, INVITE_CODE_LENGTH);
  return bare.length > 4 ? `${bare.slice(0, 4)}-${bare.slice(4)}` : bare;
};

/**
 * The first screen after signing in: one's own heroes, or the tables one sits at. The atmosphere
 * takes the world of whatever is under the cursor.
 */
export const HomeScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const [world, setWorld] = useState<Theme>('service');
  useDocumentSetting('service');

  const openParty = (partyId: string) => go({ screen: 'party', partyId });

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <SettingScope setting={world} className="ui-morph ui-atmosphere pointer-events-none absolute inset-0 isolate bg-bg">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 20%, rgb(var(--c-bg-deep) / 0.92) 75%)' }}
        />
        <SettingBackdrop setting={world} />
      </SettingScope>

      <div className="relative z-10 flex h-full flex-col">
        <motion.header
          className="flex items-center justify-between px-24 pt-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0, transition: { ...ENTER, delay: 0.1 } }}
          exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
        >
          <Wordmark />
          <div className="flex items-center gap-3">
            <SyncBadge />
            <IconButton label="Настройки" onClick={onOpenSettings}>
              <IconSettings width={22} height={22} />
            </IconButton>
          </div>
        </motion.header>

        <main className="flex min-h-0 flex-1 items-center justify-center px-24">
          <div className="grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-8" style={{ height: PANEL_HEIGHT }}>
            <motion.div
              className="min-h-0"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0, transition: { ...ENTER, delay: 0.15 } }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.25 } }}
            >
              <HeroesPanel onOpen={() => go({ screen: 'heroes' })} onWorld={setWorld} />
            </motion.div>
            <motion.div
              className="min-h-0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0, transition: { ...ENTER, delay: 0.22 } }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
            >
              <PartiesPanel onOpen={openParty} onFound={() => go({ screen: 'party-form' })} onWorld={setWorld} />
            </motion.div>
          </div>
        </main>
        <div className="h-24 shrink-0" aria-hidden />
      </div>

    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

/** One's own heroes: their cards fanned like a hand, the most recent in front. */
const HeroesPanel: React.FC<{ onOpen: () => void; onWorld: (world: Theme) => void }> = ({ onOpen, onWorld }) => {
  const heroes = useCharacterStore((s) => s.charactersList);
  const hand = heroes.slice(-5);
  const front = hand.at(-1);
  return (
    <Panel
      as="button"
      interactive
      onClick={onOpen}
      onMouseEnter={() => onWorld(front ? settingOf(front) : 'service')}
      onMouseLeave={() => onWorld('service')}
      className="group flex h-full w-full flex-col overflow-hidden p-0 text-left"
    >
      <div className="relative min-h-0 flex-1">
        {hand.map((hero, index) => {
          const offset = index - (hand.length - 1) / 2;
          return (
            <SettingScope
              key={hero.id}
              setting={settingOf(hero)}
              className="ui-home-card absolute left-1/2 top-[50%] aspect-[2/3] h-[70%] overflow-hidden"
              style={
                {
                  '--fan-x': `${offset * 26}%`,
                  '--fan-r': `${offset * 5}deg`,
                  '--fan-y': `${Math.abs(offset) * 3}%`,
                  zIndex: index,
                } as React.CSSProperties
              }
            >
              <CharacterArt source={hero} kind="full" className="h-full w-full" />
            </SettingScope>
          );
        })}
        {hand.length === 0 && (
          <span className="absolute inset-0 grid place-items-center text-ink-faint">
            <IconCreate width={48} height={48} />
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-deep/90 to-transparent" />
      </div>
      <div className="relative flex items-end justify-between gap-4 px-8 pb-7">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">Одиночная игра</div>
          <div className="ui-display mt-1 text-[2rem] leading-tight text-ink">Мои герои</div>
          <div className="mt-1 text-sm text-ink-muted">
            {heroes.length === 0 ? 'Создайте первого героя' : `${heroes.length} ${heroWord(heroes.length)} · листы, бой, кубики`}
          </div>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-frame/40 text-frame-bright transition-transform group-hover:translate-x-1">
          <IconNext width={20} height={20} />
        </span>
      </div>
    </Panel>
  );
};

const heroWord = (count: number) => {
  const tens = count % 100;
  const ones = count % 10;
  if (tens >= 11 && tens <= 14) return 'героев';
  if (ones === 1) return 'герой';
  if (ones >= 2 && ones <= 4) return 'героя';
  return 'героев';
};

// ------------------------------------------------------------------------------------------------

/** The tables one sits at, founding a new one, and taking a seat by an invite code. */
const PartiesPanel: React.FC<{
  onOpen: (partyId: string) => void;
  onFound: () => void;
  onWorld: (world: Theme) => void;
}> = ({ onOpen, onFound, onWorld }) => {
  const list = usePartyStore((s) => s.list);
  const preview = usePartyStore((s) => s.preview);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [invite, setInvite] = useState<{ code: string; preview: InvitePreviewDto } | null>(null);
  const complete = code.replace('-', '').length === INVITE_CODE_LENGTH;

  const check = async () => {
    if (!complete || checking) return;
    setChecking(true);
    const found = await preview(code);
    setChecking(false);
    if (found) setInvite({ code, preview: found });
  };

  return (
    <Panel className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-end justify-between gap-4 px-8 pt-7">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">Игра с мастером</div>
          <div className="ui-display mt-1 text-[2rem] leading-tight text-ink">Партии</div>
        </div>
        <Button variant="secondary" size="sm" icon={<IconCreate width={15} height={15} />} onClick={onFound}>
          Собрать партию
        </Button>
      </div>

      <div className="ui-scroll mt-5 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-8 pb-2" onMouseLeave={() => onWorld('service')}>
        {list?.map((party) => (
          <PartyRow key={party.id} party={party} onOpen={() => onOpen(party.id)} onHover={() => onWorld(party.setting)} />
        ))}
        {list?.length === 0 && (
          <div className="grid h-full place-items-center text-center">
            <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
              Соберите свою партию и станьте мастером — или войдите за чужой стол по коду, который даст мастер.
            </p>
          </div>
        )}
        {list === null && <div className="h-full animate-pulse rounded-[var(--radius)] bg-inset/40" />}
      </div>

      <form
        className="ui-home-join flex items-center gap-3 px-8 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          void check();
        }}
      >
        <label htmlFor="invite-code" className="shrink-0 text-sm text-ink-muted">
          Код приглашения
        </label>
        <Input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(shapeCode(e.target.value))}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="ui-invite-input min-w-0 flex-1 text-center"
        />
        <Button type="submit" variant="primary" size="sm" disabled={!complete || checking}>
          Войти
        </Button>
      </form>

      <InviteDialog
        invite={invite}
        onClose={() => setInvite(null)}
        onEntered={(partyId) => {
          setInvite(null);
          setCode('');
          onOpen(partyId);
        }}
      />
    </Panel>
  );
};

/** A table in the list, worn in its own world. */
const PartyRow: React.FC<{ party: PartyListItemDto; onOpen: () => void; onHover: () => void }> = ({ party, onOpen, onHover }) => (
  <SettingScope setting={party.setting}>
    <Panel
      as="button"
      interactive
      ornate={false}
      onClick={onOpen}
      onMouseEnter={onHover}
      onFocus={onHover}
      className="ui-morph flex w-full items-center gap-4 p-2.5 pr-5 text-left"
    >
      <PartyCover assetId={party.coverAssetId} setting={party.setting} className="aspect-video w-32 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-[0.2em] text-frame-bright/80">{SETTING_INFO[party.setting].label}</span>
        <span className="ui-display ui-title mt-0.5 block truncate text-[1.3rem] leading-tight text-ink">{party.name}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-muted">
          {party.role === 'master' ? 'Вы мастер' : `Мастер ${party.masterName}`} · за столом {party.memberCount}
        </span>
      </span>
      {party.inCombat && (
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-danger" title="Идёт бой">
          <IconCombat width={16} height={16} />
          Бой
        </span>
      )}
      <span className={cx('shrink-0 text-xs', party.role === 'master' ? 'text-frame-bright' : 'text-ink-faint')}>
        {party.role === 'master' ? 'Мастер' : 'Игрок'}
      </span>
    </Panel>
  </SettingScope>
);
