import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterPreview, PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt, fullArtSrc } from '../../ui/CharacterArt';
import { IconCombat, IconCreate } from '../../ui/icons';
import { Button, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import {
  HomeHeader,
  HeroVitals,
  HomeAtmosphere,
  InviteCodeField,
  PartyPicture,
  heroOrigin,
  partyRole,
  partyState,
  plural,
  useHomeItems,
  usePartyEntry,
} from './homeParts';
import { rememberLastHero } from './lastHero';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The first screen after signing in. The hero last played stands on the left, ready to go on; the
 * tables one sits at are a column of cinematic covers on the right. The page wears the service theme
 * and never changes with the cursor; each hero and table wears its own world inside its picture.
 */
export const HomeScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties, lastHero: hero } = useHomeItems();
  const entry = usePartyEntry();

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };
  /** Hero select opens on the hero shown here, even when it is only the newest one, not yet played. */
  const allHeroes = () => {
    if (hero) rememberLastHero(hero.id);
    go({ screen: 'heroes' });
  };

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <HomeAtmosphere />

      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-16 px-24 pb-12 pt-6">
          {/* ---------------------------------------------------------------- The hero */}
          <motion.section
            className="relative min-h-0"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE, delay: 0.15 } }}
            exit={{ opacity: 0, x: -24, transition: { duration: 0.25 } }}
          >
            {hero ? (
              <HeroStage hero={hero} count={heroes.length} onPlay={() => play(hero.id)} onAll={allHeroes} />
            ) : (
              <div className="flex h-full flex-col justify-end pb-6">
                <div className="text-[11px] uppercase tracking-[0.26em] text-ink-faint">Одиночная игра</div>
                <div className="ui-display mt-2 text-[3rem] leading-tight text-ink">Первый герой</div>
                <p className="mt-2 max-w-sm text-ink-muted">Выберите мир и соберите героя: лист, бой и кубики — всё здесь.</p>
                <Button variant="primary" size="lg" className="mt-6 w-fit" icon={<IconCreate width={18} height={18} />} onClick={() => startCreation()}>
                  Создать героя
                </Button>
              </div>
            )}
          </motion.section>

          {/* ---------------------------------------------------------------- The tables */}
          <motion.section
            className="flex min-h-0 flex-col"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE, delay: 0.22 } }}
            exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.26em] text-ink-faint">Игра с мастером</div>
                <div className="mt-1 text-[1.6rem] font-semibold leading-tight text-ink">Партии</div>
              </div>
              <Button variant="secondary" size="sm" icon={<IconCreate width={15} height={15} />} onClick={() => go({ screen: 'party-form' })}>
                Собрать партию
              </Button>
            </div>

            <div className="ui-scroll mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {parties?.map((party, index) => (
                <motion.div
                  key={party.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.3 + index * 0.06 } }}
                >
                  <TableCard party={party} onOpen={() => entry.enter(party)} />
                </motion.div>
              ))}
              {parties?.length === 0 && (
                <p className="max-w-sm pt-6 text-sm leading-relaxed text-ink-muted">
                  Соберите свою партию и станьте мастером — или сядьте за чужой стол по коду, который даст мастер.
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center gap-4">
              <span className="shrink-0 text-sm text-ink-muted">Код приглашения</span>
              <InviteCodeField onFound={entry.showInvite} className="flex-1" />
            </div>
          </motion.section>
        </main>
      </div>
      {entry.dialogs}
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

const HeroStage: React.FC<{
  hero: CharacterPreview;
  /** How many heroes one has, shown on the button to all of them. */
  count: number;
  onPlay: () => void;
  onAll: () => void;
}> = ({ hero, count, onPlay, onAll }) => {
  const setting = settingOf(hero);
  // The hero's world dresses the picture and the words; the buttons stay the page's own (service).
  return (
    <div className="relative h-full">
      <SettingScope setting={setting} className="contents">
        <motion.div
          className="absolute -top-14 bottom-0 right-0 flex w-[80%] justify-end"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          <HeroFigure key={hero.id} hero={hero} />
        </motion.div>
      </SettingScope>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <SettingScope setting={setting}>
          <div className="text-[11px] uppercase tracking-[0.24em] text-frame-bright/80">{SETTING_INFO[setting].label}</div>
          <div className="ui-display mt-2 max-w-[34rem] text-[3.2rem] leading-[1.02] text-ink">{hero.name}</div>
          <div className="mt-2 text-ink-muted">{heroOrigin(hero)}</div>
          <HeroVitals hero={hero} className="mt-4" />
        </SettingScope>
        <div className="pointer-events-auto mt-7 flex items-center gap-3">
          <Button variant="primary" size="lg" className="min-w-[200px]" onClick={onPlay}>
            Лист
          </Button>
          <Button variant="secondary" size="lg" onClick={onAll}>
            Все герои
            <span className="text-ink-faint">{count}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

/** A table as a wide cover in its own world, its name and state laid over the picture. */
const TableCard: React.FC<{ party: PartyListItemDto; onOpen: () => void }> = ({ party, onOpen }) => (
  <SettingScope setting={party.setting}>
    <button
      type="button"
      onClick={onOpen}
      className="ui-table-card__body relative block aspect-[16/6] w-full overflow-hidden text-left"
    >
      <PartyPicture party={party} className="ui-table-card__picture absolute inset-0" />
      <span className="absolute inset-0 bg-gradient-to-r from-bg-deep/95 via-bg-deep/60 to-transparent" />
      <span className="relative flex h-full flex-col justify-end p-6">
        <span className="text-[10px] uppercase tracking-[0.22em] text-frame-bright/85">{SETTING_INFO[party.setting].label}</span>
        <span className="ui-display ui-title mt-1 truncate text-[1.9rem] leading-tight text-ink">{party.name}</span>
        <span className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
          {partyRole(party)} · {party.memberCount} {plural(party.memberCount, 'участник', 'участника', 'участников')}
        </span>
      </span>
      <span
        className={cx(
          'absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-bg-deep/75 px-3 py-1 text-xs backdrop-blur',
          party.inCombat ? 'text-danger' : party.inSession ? 'text-success' : 'text-ink-faint',
        )}
      >
        {party.inCombat && <IconCombat width={14} height={14} />}
        {partyState(party)}
      </span>
    </button>
  </SettingScope>
);

/** Wider than this, a picture is a portrait (a face) rather than a figure: shown smaller and whole. */
const PORTRAIT_RATIO = 0.8;

/**
 * The hero's art standing on the stage at its own proportions, never cropped to the stage's. Its
 * edges fade out as an ellipse, so a bright or busy background never shows as a box, and a blurred
 * glow of the same picture behind it lets its colours spill softly into the dark.
 */
const HeroFigure: React.FC<{ hero: CharacterPreview }> = ({ hero }) => {
  const src = fullArtSrc(hero);
  const [ratio, setRatio] = useState(2 / 3);
  const portrait = ratio > PORTRAIT_RATIO;
  return (
    <div
      className="ui-hero-figure relative max-w-full shrink-0"
      style={{ aspectRatio: ratio, height: portrait ? '72%' : '100%', marginTop: portrait ? '10%' : 0 }}
    >
      {src && <img src={src} alt="" aria-hidden draggable={false} className="ui-hero-figure__glow absolute inset-0 h-full w-full object-cover" />}
      <span className="ui-hero-figure__art absolute inset-0">
        {src ? (
          <img
            src={src}
            alt={hero.name}
            draggable={false}
            className="h-full w-full object-cover object-top"
            onLoad={(event) => {
              const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
              if (width && height) setRatio(Math.min(1.25, Math.max(0.5, width / height)));
            }}
          />
        ) : (
          <CharacterArt source={hero} kind="full" className="h-full w-full" />
        )}
      </span>
    </div>
  );
};
