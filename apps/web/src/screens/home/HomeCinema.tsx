import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterPreview, PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt, fullArtSrc } from '../../ui/CharacterArt';
import { IconCombat, IconCreate, IconKey } from '../../ui/icons';
import { Button, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import {
  HOME_EASE,
  HeroVitals,
  HomeAtmosphere,
  HomeHeader,
  InviteCodeField,
  PartyPicture,
  heroOrigin,
  meltMask,
  partyState,
  useHomeItems,
  usePartyEntry,
} from './homeShared';
import { rememberLastHero } from './lastHero';

/**
 * Concept F, "cinema": the hero last played is a wide banner across the top, like a film on a
 * streaming service's front page; below it two rows of posters, heroes and tables, open at a click.
 */
export const HomeCinema: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties, lastHero } = useHomeItems();
  const entry = usePartyEntry();

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <HomeAtmosphere />
      {lastHero && <Banner hero={lastHero} />}

      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        {/* ---------------------------------------------------------------- The feature */}
        <div className="flex min-h-0 flex-1 items-end px-24 pb-10">
          {lastHero ? (
            <SettingScope setting={settingOf(lastHero)}>
              <motion.div
                className="max-w-[38rem]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: HOME_EASE, delay: 0.25 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <div className="text-[11px] uppercase tracking-[0.24em] text-frame-bright/85">
                  Продолжить · {SETTING_INFO[settingOf(lastHero)].label}
                </div>
                <div className="ui-display mt-2 text-[3.6rem] leading-[1.02] text-ink">{lastHero.name}</div>
                <div className="mt-2 text-ink-muted">{heroOrigin(lastHero)}</div>
                <HeroVitals hero={lastHero} className="mt-4" />
                <div className="mt-7 flex items-center gap-3">
                  <Button variant="primary" size="lg" className="min-w-[200px]" onClick={() => play(lastHero.id)}>
                    Лист
                  </Button>
                  <Button variant="secondary" onClick={() => go({ screen: 'heroes' })}>
                    Все герои
                  </Button>
                </div>
              </motion.div>
            </SettingScope>
          ) : (
            <div>
              <div className="text-[3rem] font-semibold leading-tight text-ink">Первый герой</div>
              <Button variant="primary" size="lg" className="mt-6" icon={<IconCreate width={18} height={18} />} onClick={() => startCreation()}>
                Создать героя
              </Button>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- The rows */}
        <motion.div
          className="ui-scroll flex shrink-0 items-start gap-10 overflow-x-auto px-24 pb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: HOME_EASE, delay: 0.35 } }}
          exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
        >
          <Row title="Герои">
            {heroes.map((hero) => (
              <HeroPoster key={hero.id} hero={hero} onClick={() => play(hero.id)} />
            ))}
            <AddPoster label="Новый герой" onClick={() => startCreation()} />
          </Row>
          <Row title="Партии">
            {parties?.map((party) => (
              <TablePoster key={party.id} party={party} onClick={() => entry.enter(party)} />
            ))}
            <AddPoster label="Собрать партию" wide onClick={() => go({ screen: 'party-form' })} />
            <JoinPoster onFound={entry.showInvite} />
          </Row>
        </motion.div>
      </div>
      {entry.dialogs}
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

/** The hero's art across the top: blurred wide behind, and the figure itself standing to the right. */
const Banner: React.FC<{ hero: CharacterPreview }> = ({ hero }) => {
  const src = fullArtSrc(hero);
  return (
    <SettingScope setting={settingOf(hero)} className="pointer-events-none absolute inset-x-0 top-0 h-[72%]">
      <motion.div
        className="absolute inset-0"
        style={meltMask({ bottom: 45 })}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.9 } }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        {src && (
          <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover" style={{ filter: 'blur(40px) saturate(0.8) brightness(0.45)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-deep/90 via-bg-deep/40 to-transparent" />
      </motion.div>
      <motion.div
        className="absolute inset-y-0 right-[6%] w-[38%]"
        style={meltMask({ left: 25, right: 18, bottom: 35 })}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0, transition: { duration: 0.9, ease: HOME_EASE, delay: 0.1 } }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <CharacterArt source={hero} kind="full" className="h-full w-full" position="50% 10%" />
      </motion.div>
      {/* The account in the header stays readable over the picture. */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg-deep/80 to-transparent" />
    </SettingScope>
  );
};

const Row: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="shrink-0">
    <div className="mb-3 text-[11px] uppercase tracking-[0.26em] text-ink-faint">{title}</div>
    <div className="flex items-start gap-3">{children}</div>
  </div>
);

const HeroPoster: React.FC<{ hero: CharacterPreview; onClick: () => void }> = ({ hero, onClick }) => (
  <SettingScope setting={settingOf(hero)}>
    <button type="button" onClick={onClick} aria-label={`Лист: ${hero.name}`} className="ui-poster group block w-[92px] text-left">
      <span className="ui-poster__frame block aspect-[2/3] overflow-hidden">
        <CharacterArt source={hero} kind="full" className="ui-poster__art h-full w-full" position="50% 12%" />
      </span>
      <span className="ui-display mt-2 block truncate text-sm text-ink-muted group-hover:text-ink">{hero.name}</span>
    </button>
  </SettingScope>
);

const TablePoster: React.FC<{ party: PartyListItemDto; onClick: () => void }> = ({ party, onClick }) => (
  <SettingScope setting={party.setting}>
    <button type="button" onClick={onClick} className="ui-poster group block w-[222px] text-left">
      <span className="ui-poster__frame relative block aspect-video overflow-hidden">
        <PartyPicture party={party} className="ui-poster__art absolute inset-0" />
        <span
          className={cx(
            'absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-bg-deep/75 px-2.5 py-0.5 text-[11px] backdrop-blur',
            party.inCombat ? 'text-danger' : party.inSession ? 'text-success' : 'text-ink-faint',
          )}
        >
          {party.inCombat && <IconCombat width={12} height={12} />}
          {partyState(party)}
        </span>
      </span>
      <span className="ui-display ui-title mt-2 block truncate text-sm text-ink-muted group-hover:text-ink">{party.name}</span>
    </button>
  </SettingScope>
);

const AddPoster: React.FC<{ label: string; wide?: boolean; icon?: React.ReactNode; onClick: () => void }> = ({
  label,
  wide,
  icon,
  onClick,
}) => (
  <button type="button" onClick={onClick} className={cx('ui-poster group block text-left', wide ? 'w-[138px]' : 'w-[92px]')}>
    <span className="ui-poster__frame ui-poster__frame--add grid h-[138px] place-items-center">
      {icon ?? <IconCreate width={22} height={22} />}
    </span>
    <span className="mt-2 block truncate text-sm text-ink-faint group-hover:text-ink">{label}</span>
  </button>
);

/** Taking a seat by an invite code: a poster that turns into the code field when clicked. */
const JoinPoster: React.FC<{ onFound: React.ComponentProps<typeof InviteCodeField>['onFound'] }> = ({ onFound }) => {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="w-[15rem]">
      <div className="ui-poster__frame flex h-[138px] flex-col justify-center gap-3 px-4">
        <span className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">Код приглашения</span>
        <InviteCodeField autoFocus onFound={onFound} />
      </div>
    </div>
  ) : (
    <AddPoster label="По коду" icon={<IconKey width={22} height={22} />} onClick={() => setOpen(true)} />
  );
};
