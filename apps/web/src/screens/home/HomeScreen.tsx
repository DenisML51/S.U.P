import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { useHasSoloDraft } from '../create/useDraftState';
import { pageTone, readArt, type Rgb } from './artTone';
import { figureMask } from './figureMask';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Enters from one side, `delay` seconds after the page. */
const enter = (from: { x?: number; y?: number }, delay = 0) => ({
  initial: { opacity: 0, ...from },
  animate: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: EASE, delay } },
  exit: { opacity: 0, ...from, transition: { duration: 0.25 } },
});

/**
 * As `enter`, but with no exit of its own (the page fades as a whole). For rows that can mount while
 * the page is leaving — a table just joined arrives over the socket — since a motion element with an
 * exit added to a leaving page kept that exit from ever finishing.
 */
const enterOnly = (from: { x?: number; y?: number }, delay = 0) => {
  const { exit: _exit, ...rest } = enter(from, delay);
  return rest;
};

/**
 * The first screen after signing in. The hero takes the page: their art stands large on the right,
 * the whole height of the screen. On the left a narrow column reads like a menu: the hero last
 * played, ready to go on, then the tables one sits at as a quiet list. The page wears the service
 * theme and never changes with the cursor; each hero and table wears its own world inside its picture.
 */
export const HomeScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const resumable = useHasSoloDraft();
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties, lastHero: hero } = useHomeItems();
  const entry = usePartyEntry();
  // The colour where the hero's art meets the page; the dark around the hero takes a little of it.
  const [tone, setTone] = useState<Rgb | null>(null);

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };
  /** Hero select opens on the hero shown here, even when it is only the newest one, not yet played. */
  const allHeroes = () => {
    if (hero) rememberLastHero(hero.id);
    go({ screen: 'heroes' });
  };
  const create = () => startCreation();
  const newParty = () => go({ screen: 'party-form' });

  return (
    <SettingScope
      setting="service"
      className="ui-hub relative h-screen overflow-clip bg-bg"
      style={tone ? ({ '--hub-tone': `rgb(${tone.join(' ')})` } as React.CSSProperties) : undefined}
    >
      <HomeAtmosphere />
      <div className="ui-hub-lift pointer-events-none absolute inset-0" aria-hidden />

      {/* ---------------------------------------------------------------- The art, behind everything */}
      <motion.div className="absolute inset-y-0 left-[42%] right-0" {...enter({ x: 40 }, 0.1)}>
        {hero ? (
          <HeroFigure key={hero.id} hero={hero} onTone={setTone} />
        ) : (
          <div className="flex h-full items-end justify-center pb-12">
            <button type="button" onClick={create} className="ui-hero-place">
              <IconCreate width={22} height={22} />
              Здесь встанет ваш герой
            </button>
          </div>
        )}
      </motion.div>

      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        <main className="flex min-h-0 w-[42%] max-w-[46rem] flex-1 flex-col pb-[clamp(1.5rem,4.5vh,3rem)] pl-24 pr-6 pt-[clamp(1rem,3.5vh,2.5rem)]">
          {/* ---------------------------------------------------------------- The hero */}
          <motion.section {...enter({ x: -24 }, 0.15)}>
            {hero ? (
              <>
                <HeroTitle hero={hero} />
                <div className="mt-[clamp(1.25rem,2.6vh,1.75rem)] flex items-center gap-3">
                  <Button variant="primary" size="lg" className="min-w-[200px]" onClick={() => play(hero.id)}>
                    Лист
                  </Button>
                  <Button variant="secondary" size="lg" onClick={allHeroes}>
                    Все герои
                    <span className="text-ink-faint">{heroes.length}</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-[0.26em] text-ink-faint">Одиночная игра</div>
                <div className="ui-display mt-2 text-[3rem] leading-tight text-ink">Первый герой</div>
                <AddCard
                  className="mt-6"
                  title={resumable ? 'Продолжить создание' : 'Создать героя'}
                  hint="Выберите мир и соберите героя: лист, бой и кубики — всё здесь"
                  onClick={create}
                />
              </>
            )}
          </motion.section>

          {/* ---------------------------------------------------------------- The tables */}
          <motion.section
            className="mt-[clamp(1.5rem,5vh,3rem)] flex min-h-0 flex-1 flex-col"
            {...enter({ x: -24 }, 0.22)}
          >
            <div className="ui-hub-rule mb-6" aria-hidden />
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="whitespace-nowrap text-[11px] uppercase tracking-[0.26em] text-ink-faint">
                  Игра с мастером
                </div>
                <div className="mt-1 flex items-baseline gap-2 text-[1.6rem] font-semibold leading-tight text-ink">
                  Партии
                  {!!parties?.length && <span className="text-base font-normal text-ink-faint">{parties.length}</span>}
                </div>
              </div>
              {!!parties?.length && (
                <Button variant="secondary" size="sm" icon={<IconCreate width={15} height={15} />} onClick={newParty}>
                  Собрать партию
                </Button>
              )}
            </div>

            {parties?.length ? (
              <TableList parties={parties} onOpen={entry.enter} />
            ) : (
              <div className="min-h-0 flex-1 pt-5">
                {parties && (
                  <AddCard
                    title="Собрать партию"
                    hint="Станьте мастером своего стола — или сядьте за чужой по коду, который даст мастер"
                    onClick={newParty}
                  />
                )}
              </div>
            )}

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

/** The hero's world, name, origin, level and health, in the hero's own look. */
const HeroTitle: React.FC<{ hero: CharacterPreview }> = ({ hero }) => {
  const setting = settingOf(hero);
  return (
    <SettingScope setting={setting}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-frame-bright/80">{SETTING_INFO[setting].label}</div>
      <div className="ui-display ui-hub-name mt-2 leading-[1.02] text-ink">{hero.name}</div>
      <div className="mt-2 text-ink-muted">{heroOrigin(hero)}</div>
      <HeroVitals hero={hero} className="mt-4" />
    </SettingScope>
  );
};

/** Something to make while there is none yet: a quiet dashed card that opens its making. */
const AddCard: React.FC<{ title: string; hint: string; onClick: () => void; className?: string }> = ({
  title,
  hint,
  onClick,
  className,
}) => (
  <button type="button" onClick={onClick} className={cx('ui-add-card group', className)}>
    <span className="ui-add-card__plus">
      <IconCreate width={20} height={20} />
    </span>
    <span className="min-w-0">
      <span className="block font-semibold text-ink">{title}</span>
      <span className="mt-0.5 block text-sm leading-snug text-ink-muted">{hint}</span>
    </span>
  </button>
);

/** Which ends of a scrolled box have more beyond them: "up", "down", both or neither. */
const useScrollEdges = (deps: unknown) => {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState('');
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => {
      const up = box.scrollTop > 2;
      const down = box.scrollTop + box.clientHeight < box.scrollHeight - 2;
      setMore([up && 'up', down && 'down'].filter(Boolean).join(' '));
    };
    measure();
    box.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => {
      box.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [deps]);
  return { ref, more };
};

/**
 * The tables as a quiet list: a small cover, the name in its world's face, who plays and the state.
 * Scrolls when the column cannot hold them all, fading at the edge it scrolls past.
 */
const TableList: React.FC<{ parties: PartyListItemDto[]; onOpen: (party: PartyListItemDto) => void }> = ({
  parties,
  onOpen,
}) => {
  const { ref, more } = useScrollEdges(parties.length);
  return (
    <div ref={ref} data-more={more} className="ui-table-list ui-scroll -mx-3 mt-4 min-h-0 flex-1 overflow-y-auto">
      {parties.map((party, index) => (
        <motion.div key={party.id} {...enterOnly({ y: 12 }, 0.3 + index * 0.05)}>
          <SettingScope setting={party.setting}>
            <button type="button" onClick={() => onOpen(party)} className="ui-table-row">
              <PartyPicture party={party} className="ui-table-row__picture relative" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-frame-bright/80">
                  {SETTING_INFO[party.setting].label}
                </span>
                <span className="ui-display ui-title block truncate text-[1.35rem] leading-tight text-ink">
                  {party.name}
                </span>
                <span className="block truncate text-xs text-ink-muted">
                  {partyRole(party)} · {party.memberCount}{' '}
                  {plural(party.memberCount, 'участник', 'участника', 'участников')}
                </span>
              </span>
              <PartyState party={party} />
              <span className="ui-table-row__go text-ink-muted" aria-hidden>
                →
              </span>
            </button>
          </SettingScope>
        </motion.div>
      ))}
    </div>
  );
};

/** The state as a dot (crossed swords in a fight; a table in play breathes) and its name, when there is room. */
const PartyState: React.FC<{ party: PartyListItemDto }> = ({ party }) => (
  <span
    className={cx(
      'flex shrink-0 items-center gap-1.5 text-xs',
      party.inCombat ? 'text-danger' : party.inSession ? 'text-success' : 'text-ink-faint',
    )}
    title={partyState(party)}
  >
    {party.inCombat ? (
      <IconCombat width={14} height={14} />
    ) : (
      <span className={cx('ui-party-dot', party.inSession && 'ui-party-dot--live')} />
    )}
    <span className="ui-table-row__state">{partyState(party)}</span>
  </span>
);

/** Wider than this, a picture is a portrait (a face) rather than a figure: shown smaller and whole. */
const PORTRAIT_RATIO = 0.8;

/**
 * The hero's art standing in its area at its own proportions: as large as fits, never cropped, so a
 * head near an edge of the picture stays in it. Its edges fade out as an ellipse, so a bright or busy
 * background never shows as a box, and a blurred glow of the same picture behind it lets its colours
 * spill softly into the dark.
 */
const HeroFigure: React.FC<{ hero: CharacterPreview; onTone: (tone: Rgb | null) => void }> = ({ hero, onTone }) => {
  const src = fullArtSrc(hero);
  const [ratio, setRatio] = useState(2 / 3);
  const [brightTop, setBrightTop] = useState(false);
  const mask = useMemo(() => figureMask(brightTop), [brightTop]);
  const portrait = ratio > PORTRAIT_RATIO;
  useEffect(() => {
    if (!src) onTone(null);
  }, [src, onTone]);
  return (
    <div className="ui-art-fit flex h-full items-end justify-center">
      <div
        className="ui-art-fit__box ui-hero-figure relative"
        style={{ '--art-ratio': ratio, '--art-scale': portrait ? 0.72 : 1 } as React.CSSProperties}
      >
        <span className="ui-hero-figure__halo" aria-hidden />
        {src && (
          <img
            src={src}
            alt=""
            aria-hidden
            draggable={false}
            className="ui-hero-figure__glow absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="ui-hero-figure__art absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }}>
          {src ? (
            <img
              src={src}
              alt={hero.name}
              draggable={false}
              className="h-full w-full object-cover"
              onLoad={(event) => {
                const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                if (width && height) setRatio(Math.min(1.25, Math.max(0.5, width / height)));
                const reading = readArt(event.currentTarget);
                setBrightTop(reading?.brightTop ?? false);
                onTone(reading && pageTone(reading.edge));
              }}
            />
          ) : (
            <CharacterArt source={hero} kind="full" className="h-full w-full" />
          )}
        </span>
      </div>
    </div>
  );
};
