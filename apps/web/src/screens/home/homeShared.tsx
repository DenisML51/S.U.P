import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { INVITE_CODE_LENGTH, type CharacterPreview, type InvitePreviewDto, type PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { usePartyStore } from '../../store/usePartyStore';
import { assetUrl } from '../../data/api/client';
import { fullArtSrc } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { SettingEmblem } from '../../ui/ornaments';
import { IconButton, Input, Meter, cx } from '../../ui/primitives';
import { IconSettings } from '../../ui/icons';
import { SyncBadge } from '../select/SyncBadge';
import { Wordmark } from '../select/Wordmark';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf, type Theme } from '../../ui/theme/settings';
import { ClosedTableDialog } from '../party/ClosedTableDialog';
import { InviteDialog } from '../party/InviteDialog';
import { readLastHero } from './lastHero';

export const HOME_EASE = [0.22, 1, 0.36, 1] as const;

/** Something on the home page that has a world of its own: one's hero or a table one sits at. */
export type HomeItem = { kind: 'hero'; hero: CharacterPreview } | { kind: 'party'; party: PartyListItemDto };

export const itemKey = (item: HomeItem) => (item.kind === 'hero' ? `hero:${item.hero.id}` : `party:${item.party.id}`);
export const itemWorld = (item: HomeItem | undefined): Theme =>
  !item ? 'service' : item.kind === 'hero' ? settingOf(item.hero) : item.party.setting;

/** One's heroes and tables, and the item the page opens on: the hero last played, else the first thing there is. */
export const useHomeItems = () => {
  const heroes = useCharacterStore((s) => s.charactersList);
  const parties = usePartyStore((s) => s.list);
  return useMemo(() => {
    const heroItems: HomeItem[] = heroes.map((hero) => ({ kind: 'hero', hero }));
    const partyItems: HomeItem[] = (parties ?? []).map((party) => ({ kind: 'party', party }));
    const last = readLastHero();
    const lastHero = heroes.find((hero) => hero.id === last) ?? heroes.at(-1);
    return { heroes, parties, heroItems, partyItems, lastHero };
  }, [heroes, parties]);
};

// ------------------------------------------------------------------------------------------------

/** Opening a table from home: a player's closed table offers to take the hero back instead. */
export const usePartyEntry = () => {
  const go = useNavStore((s) => s.go);
  const [waiting, setWaiting] = useState<PartyListItemDto | null>(null);
  const [invite, setInvite] = useState<{ code: string; preview: InvitePreviewDto } | null>(null);
  const openTable = (partyId: string) => go({ screen: 'party', partyId });

  const enter = (party: PartyListItemDto) =>
    party.role === 'player' && !party.inSession ? setWaiting(party) : openTable(party.id);

  const dialogs = (
    <>
      <ClosedTableDialog party={waiting} onClose={() => setWaiting(null)} />
      <InviteDialog
        invite={invite}
        onClose={() => setInvite(null)}
        onEntered={(partyId) => {
          setInvite(null);
          openTable(partyId);
        }}
      />
    </>
  );
  return { enter, showInvite: setInvite, dialogs };
};

/** "k7mq2x" → "K7MQ-2X": typed codes take the shape they are printed in. */
const shapeCode = (raw: string) => {
  const bare = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, INVITE_CODE_LENGTH);
  return bare.length > 4 ? `${bare.slice(0, 4)}-${bare.slice(4)}` : bare;
};

/** The invite code field: looks the table up once the code is whole, then the invitation opens. */
export const InviteCodeField: React.FC<{
  onFound: (invite: { code: string; preview: InvitePreviewDto }) => void;
  autoFocus?: boolean;
  className?: string;
}> = ({ onFound, autoFocus, className }) => {
  const preview = usePartyStore((s) => s.preview);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const complete = code.replace('-', '').length === INVITE_CODE_LENGTH;

  const check = async () => {
    if (!complete || checking) return;
    setChecking(true);
    const found = await preview(code);
    setChecking(false);
    if (found) {
      onFound({ code, preview: found });
      setCode('');
    }
  };

  return (
    <form
      className={cx('ui-home-code flex items-center gap-2', className)}
      onSubmit={(event) => {
        event.preventDefault();
        void check();
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(shapeCode(e.target.value))}
        placeholder="XXXX-XXXX"
        aria-label="Код приглашения"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        className="ui-invite-input min-w-0 flex-1 text-center"
      />
      <button type="submit" className="ui-home-code__go" disabled={!complete || checking} aria-label="Войти по коду">
        →
      </button>
    </form>
  );
};

// ------------------------------------------------------------------------------------------------

export const plural = (count: number, one: string, few: string, many: string) => {
  const tens = count % 100;
  const ones = count % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (ones === 1) return one;
  if (ones >= 2 && ones <= 4) return few;
  return many;
};

export const partyState = (party: PartyListItemDto) =>
  party.inCombat ? 'Идёт бой' : party.inSession ? 'Сессия идёт' : 'Ждёт сессии';

export const partyRole = (party: PartyListItemDto) =>
  party.role === 'master' ? 'Вы мастер' : `Мастер ${party.masterName}`;

export const heroOrigin = (hero: CharacterPreview) => {
  const origin = describeOrigin(hero);
  return [origin.race, origin.calling].filter(Boolean).join(' · ');
};

const coverSrc = (party: PartyListItemDto) => (party.coverAssetId ? assetUrl(party.coverAssetId) : undefined);
export const itemImage = (item: HomeItem | undefined) =>
  !item ? undefined : item.kind === 'hero' ? fullArtSrc(item.hero) : coverSrc(item.party);

// ------------------------------------------------------------------------------------------------

/**
 * The home page's own place: the service's dark with one warm glow, the same whatever the cursor is
 * on. Worlds live only inside their own pictures here.
 */
export const HomeAtmosphere: React.FC = () => (
  <div className="ui-home-atmosphere pointer-events-none absolute inset-0" aria-hidden />
);

/** A picture melting into the screen: each side fades over the given share of the picture (%). */
export const meltMask = ({ left = 0, right = 0, top = 0, bottom = 0 }) => {
  const mask = [
    `linear-gradient(to right, transparent, #000 ${left}%, #000 ${100 - right}%, transparent)`,
    `linear-gradient(to bottom, transparent, #000 ${top}%, #000 ${100 - bottom}%, transparent)`,
  ].join(', ');
  return { maskImage: mask, WebkitMaskImage: mask, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' } as React.CSSProperties;
};

/** A table's cover, wide; without one, its world's engraving with the emblem. */
export const PartyPicture: React.FC<{ party: PartyListItemDto; className?: string }> = ({ party, className }) => {
  const src = coverSrc(party);
  return (
    <SettingScope setting={party.setting} className={cx('overflow-hidden bg-inset', className)}>
      {src ? (
        <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <SettingBackdrop setting={party.setting} strength={0.9} frame={false} />
          <span className="absolute inset-0 grid place-items-center">
            <SettingEmblem size={72} className="text-frame-bright/45" />
          </span>
        </>
      )}
    </SettingScope>
  );
};

/** Level and health in one quiet line. */
export const HeroVitals: React.FC<{ hero: CharacterPreview; className?: string }> = ({ hero, className }) => (
  <div className={cx('flex items-center gap-4', className)}>
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">Ур.</span>
      <span className="ui-display ui-numeric text-2xl text-frame-bright">{hero.level}</span>
    </div>
    <div className="w-40">
      <Meter value={hero.currentHP} max={hero.maxHP} tone="hp" height={5} label="Здоровье" />
    </div>
    <span className="ui-numeric text-xs text-ink-muted">
      {hero.currentHP}/{hero.maxHP}
    </span>
  </div>
);

export const worldLabel = (item: HomeItem) => SETTING_INFO[itemWorld(item) as keyof typeof SETTING_INFO]?.label ?? '';

/** The service name and the account, the same over every layout of the page. */
export const HomeHeader: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => (
  <motion.header
    className="relative z-20 flex items-center justify-between px-24 pt-10"
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: HOME_EASE, delay: 0.1 } }}
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
);
