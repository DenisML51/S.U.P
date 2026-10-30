import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { INVITE_CODE_LENGTH, type CharacterPreview, type InvitePreviewDto, type PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { usePartyStore } from '../../store/usePartyStore';
import { assetUrl } from '../../data/api/client';
import { describeOrigin } from '../../ui/characterLabels';
import { SettingEmblem } from '../../ui/ornaments';
import { IconButton, Input, Meter, cx } from '../../ui/primitives';
import { IconSettings } from '../../ui/icons';
import { SyncBadge } from '../select/SyncBadge';
import { Wordmark } from '../select/Wordmark';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope } from '../../ui/theme/SettingScope';
import { InviteDialog } from '../party/InviteDialog';
import { readLastHero } from './lastHero';
import { rulebookLabel } from '../../systems';

const EASE = [0.22, 1, 0.36, 1] as const;

/** One's heroes and tables, and the hero the page features: the one last played, else the newest. */
export const useHomeItems = () => {
  const heroes = useCharacterStore((s) => s.charactersList);
  const parties = usePartyStore((s) => s.list);
  return useMemo(() => {
    const last = readLastHero();
    const lastHero = heroes.find((hero) => hero.id === last) ?? heroes.at(-1);
    return { heroes, parties, lastHero };
  }, [heroes, parties]);
};

// ------------------------------------------------------------------------------------------------

/** Opening a table from home; between sessions a player finds it as a lobby (seats, heroes, chronicle). */
export const usePartyEntry = () => {
  const go = useNavStore((s) => s.go);
  const [invite, setInvite] = useState<{ code: string; preview: InvitePreviewDto } | null>(null);
  const openTable = (partyId: string) => go({ screen: 'party', partyId });

  const enter = (party: PartyListItemDto) => openTable(party.id);

  const dialogs = (
    <>
      <InviteDialog
        invite={invite}
        onClose={() => setInvite(null)}
        // Not closed here: the dialog leaves together with the page. Closing it in the moment the page
        // starts its exit kept that exit from finishing — the table never mounted, the screen stayed
        // dark. Its state lives in this page, so it is gone when the page comes back.
        onEntered={openTable}
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

export { plural } from '../../i18n';

export const partyState = (party: PartyListItemDto) =>
  party.inCombat ? 'Идёт бой' : party.inSession ? 'Сессия идёт' : 'Ждёт сессии';

export const partyRole = (party: PartyListItemDto) =>
  party.role === 'master' ? 'Вы мастер' : `Мастер ${party.masterName}`;

export const heroOrigin = (hero: CharacterPreview) => {
  const origin = describeOrigin(hero);
  return [origin.race, origin.calling].filter(Boolean).join(' · ');
};

const coverSrc = (party: PartyListItemDto) => (party.coverAssetId ? assetUrl(party.coverAssetId) : undefined);

// ------------------------------------------------------------------------------------------------

/**
 * The home page's own place: the service's dark with one warm glow, the same whatever the cursor is
 * on. Worlds live only inside their own pictures here.
 */
export const HomeAtmosphere: React.FC = () => (
  <div className="ui-home-atmosphere pointer-events-none absolute inset-0" aria-hidden />
);

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

/**
 * The rulebook hung under the focused hero card, in the setting's manner: a brass plaque in
 * Lovecraft's world, a ribbon, a chip, a tag on a chain, a holo-label, a rune bar.
 */
export const RulebookPlate: React.FC<{ hero: CharacterPreview }> = ({ hero }) => (
  <div className="ui-rulebook-plate" aria-label={`Правила: ${rulebookLabel(hero)}`}>
    <RulebookMark hero={hero} />
  </div>
);

/** The rulebook's name on a hero's card, in the setting's tag. */
export const RulebookMark: React.FC<{ hero: CharacterPreview; className?: string }> = ({ hero, className }) => (
  <span className={cx('ui-tag ui-rulebook', className)} style={{ '--tag-tone': 'var(--c-frame-bright)' } as React.CSSProperties}>
    {rulebookLabel(hero)}
  </span>
);

/** What the big number of a hero's card is: the level, or an investigator's age. */
export const heroRank = (hero: CharacterPreview): { label: string; value: number } =>
  hero.investigator ? { label: 'Лет', value: hero.investigator.age } : { label: 'Ур.', value: hero.level };

/** Level (or age) and health, and an investigator's sanity, in one quiet line. */
export const HeroVitals: React.FC<{
  hero: CharacterPreview;
  className?: string;
  meterClassName?: string;
  /** The rulebook's mark in the line; the hero select hangs it under the card instead. */
  rulebook?: boolean;
}> = ({ hero, className, meterClassName = 'w-40', rulebook = true }) => {
  const rank = heroRank(hero);
  return (
    <div className={cx('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {rulebook && <RulebookMark hero={hero} />}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">{rank.label}</span>
        <span className="ui-display ui-numeric text-2xl text-frame-bright">{rank.value}</span>
      </div>
      <div className={cx('flex flex-col gap-1', meterClassName)}>
        <Meter value={hero.currentHP} max={hero.maxHP} tone="hp" height={5} label="Здоровье" />
        {hero.investigator && <Meter value={hero.investigator.sanity} max={hero.investigator.maxSanity} tone="sanity" height={4} label="Рассудок" />}
      </div>
      <span className="ui-numeric text-xs text-ink-muted">
        {hero.currentHP}/{hero.maxHP}
        {hero.investigator && <span className="block">рассудок {hero.investigator.sanity}</span>}
      </span>
    </div>
  );
};

/** The service name and the account, the same over every layout of the page. */
export const HomeHeader: React.FC<{ onOpenSettings: () => void; extra?: React.ReactNode }> = ({
  onOpenSettings,
  extra,
}) => (
  <motion.header
    className="relative z-20 flex items-center justify-between gap-4 px-24 pt-10 max-lg:px-8 max-lg:pt-8 max-sm:px-4 max-sm:pt-3"
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.1 } }}
    exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
  >
    <Wordmark />
    <div className="flex items-center gap-3">
      <SyncBadge />
      {extra}
      <IconButton label="Настройки" onClick={onOpenSettings}>
        <IconSettings width={22} height={22} />
      </IconButton>
    </div>
  </motion.header>
);
