import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CharacterPreview } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CharacterArt, fullArtSrc } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { ConfirmDialog } from '../../ui/Dialog';
import { Button, IconButton, Panel, cx } from '../../ui/primitives';
import { SETTING_ART } from '../../ui/art';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf, SETTING_INFO, type Theme } from '../../ui/theme/settings';
import {
  IconCreate,
  IconExport,
  IconImport,
  IconNext,
  IconPrev,
  IconSettings,
  IconTrash,
} from '../../ui/icons';
import { Wordmark } from './Wordmark';
import { SyncBadge } from './SyncBadge';
import { useHasSoloDraft } from '../create/useDraftState';
import { readLastHero as readLast, rememberLastHero as rememberLast } from '../home/lastHero';
import { HeroVitals, RulebookPlate } from '../home/homeParts';

/** Index of the "new hero" slot that ends the row. */
type Slot = { kind: 'hero'; hero: CharacterPreview } | { kind: 'new' };

interface HeroSelectProps {
  onCreate: () => void;
  onHome: () => void;
  onOpenSettings: () => void;
}

/**
 * The first screen after signing in: heroes as a row of cards, the focused one in front. The
 * atmosphere takes the focused hero's setting, so browsing previews each universe before entering;
 * the controls are the service's own and stay the same over every world.
 */
export const HeroSelect: React.FC<HeroSelectProps> = ({ onCreate, onHome, onOpenSettings }) => {
  const resumable = useHasSoloDraft();
  const heroes = useCharacterStore((s) => s.charactersList);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const importFromJSON = useCharacterStore((s) => s.importFromJSON);
  const exportToJSON = useCharacterStore((s) => s.exportToJSON);

  const slots: Slot[] = useMemo(
    () => [...heroes.map((hero) => ({ kind: 'hero' as const, hero })), { kind: 'new' as const }],
    [heroes],
  );
  const [index, setIndex] = useState(() => {
    const last = readLast();
    const found = heroes.findIndex((h) => h.id === last);
    return found >= 0 ? found : 0;
  });
  const focusIndex = Math.min(index, slots.length - 1);
  const focused = slots[focusIndex]!;
  // The world of the hero in front tints the atmosphere; the new-hero slot belongs to no world.
  const world: Theme = focused.kind === 'hero' ? settingOf(focused.hero) : 'service';
  useDocumentSetting('service');

  const [pendingDelete, setPendingDelete] = useState<CharacterPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const play = useCallback(
    (hero: CharacterPreview) => {
      rememberLast(hero.id);
      void loadCharacter(hero.id);
    },
    [loadCharacter],
  );
  const panned = useRef(false);
  const step = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(slots.length - 1, i + delta))), [slots.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pendingDelete || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'Escape') onHome();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
      else if (event.key === 'Enter') {
        if (focused.kind === 'hero') play(focused.hero);
        else onCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, onCreate, onHome, pendingDelete, play, step]);

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importFromJSON(file).catch(() => {});
  };

  const background = focused.kind === 'hero' ? fullArtSrc(focused.hero) : undefined;

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg max-lg:h-dvh">
      {/* Atmosphere in the focused hero's world: its colours, its backdrop and the hero's art blurred
          into it. The account's controls over it are the service's own. */}
      <SettingScope setting={world} className="ui-morph ui-atmosphere pointer-events-none absolute inset-0 isolate bg-bg">
        <AnimatePresence>
          {background && (
            <motion.img
              key={background}
              src={background}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover"
              style={{ filter: 'blur(36px) saturate(0.7) brightness(0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            />
          )}
        </AnimatePresence>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 20%, rgb(var(--c-bg-deep) / 0.92) 75%)' }}
        />
        <SettingBackdrop setting={world} />
      </SettingScope>

      <div className="relative z-10 flex h-full flex-col">
        <motion.header
          className="flex items-center justify-between gap-4 px-24 pt-14 max-lg:px-8 max-lg:pt-8 max-sm:px-4 max-sm:pt-3"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15 } }}
          exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
        >
          <Wordmark onHome={onHome} />
          <div className="flex items-center gap-3">
            <SyncBadge />
            <IconButton label="Настройки" onClick={onOpenSettings}>
              <IconSettings width={22} height={22} />
            </IconButton>
          </div>
        </motion.header>

        {/* A finger swipes along the row of heroes, as the arrows step it. */}
        <motion.main
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center"
          onPointerDownCapture={() => {
            panned.current = false;
          }}
          onPanStart={() => {
            panned.current = true;
          }}
          onPanEnd={(_, info) => {
            if (Math.abs(info.offset.x) < 48 || Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
            step(info.offset.x < 0 ? 1 : -1);
          }}
          // The finger lifted at the end of a swipe is not a tap on the card under it.
          onClickCapture={(event) => {
            if (!panned.current) return;
            panned.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Carousel slots={slots} index={focusIndex} onFocus={setIndex} onPlay={play} onCreate={onCreate} />
          {/* Moving along the row and the hero's own actions belong to the hero: they wear its world,
              which outranks the service theme (the service's type stays, as everywhere on this screen). */}
          <SettingScope setting={world} className="ui-service ui-morph contents">
            <IconButton label="Предыдущий герой" className="absolute left-24 z-20 max-lg:left-20 max-sm:hidden" size={44} onClick={() => step(-1)} disabled={focusIndex === 0}>
              <IconPrev width={26} height={26} />
            </IconButton>
            <IconButton
              label="Следующий герой"
              className="absolute right-24 z-20 max-lg:right-20 max-sm:hidden"
              size={44}
              onClick={() => step(1)}
              disabled={focusIndex === slots.length - 1}
            >
              <IconNext width={26} height={26} />
            </IconButton>
          </SettingScope>
        </motion.main>

        {/* Every hero at a glance, in a column down the right edge; on a phone the strip stays under
            the card, where there is room for it. */}
        <SettingScope
          setting={world}
          className="ui-service ui-morph absolute right-8 top-1/2 z-20 flex -translate-y-1/2 max-lg:right-4 max-sm:hidden"
        >
          <motion.div
            className="flex"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.2 } }}
            exit={{ opacity: 0, x: 12, transition: { duration: 0.25 } }}
          >
            <Strip slots={slots} index={focusIndex} onFocus={setIndex} vertical />
          </motion.div>
        </SettingScope>

        <motion.footer
          className="flex items-center justify-between gap-6 px-24 pb-14 max-lg:px-8 max-lg:pb-8 max-sm:flex-wrap max-sm:gap-x-2 max-sm:gap-y-3 max-sm:px-4 max-sm:pb-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.2 } }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.25 } }}
        >
          <div className="flex w-64 gap-2 max-lg:w-40 max-sm:order-2 max-sm:w-auto">
            <Button variant="ghost" size="sm" icon={<IconImport width={16} height={16} />} onClick={() => fileInput.current?.click()}>
              Импорт
            </Button>
            <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
          </div>

          <SettingScope
            setting={world}
            className="ui-service ui-morph flex min-w-0 flex-col items-center gap-4 max-sm:order-1 max-sm:w-full max-sm:gap-3"
          >
            {focused.kind === 'hero' ? (
              <Button variant="primary" size="lg" className="min-w-[220px]" onClick={() => play(focused.hero)}>
                Лист
              </Button>
            ) : (
              <Button variant="primary" size="lg" className="min-w-[220px]" icon={<IconCreate width={18} height={18} />} onClick={onCreate}>
                {resumable ? 'Продолжить создание' : 'Создать героя'}
              </Button>
            )}
            <Strip slots={slots} index={focusIndex} onFocus={setIndex} className="sm:hidden" />
          </SettingScope>

          <div className="flex w-64 justify-end max-lg:w-40 max-sm:order-3 max-sm:w-auto">
            {focused.kind === 'hero' && (
              <SettingScope setting={world} className="ui-service ui-morph flex gap-1">
                <IconButton label="Экспорт в файл" onClick={() => void exportToJSON(focused.hero.id)}>
                  <IconExport width={20} height={20} />
                </IconButton>
                <IconButton label="Удалить героя" onClick={() => setPendingDelete(focused.hero)}>
                  <IconTrash width={20} height={20} />
                </IconButton>
              </SettingScope>
            )}
          </div>
        </motion.footer>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Удалить героя?"
        message={
          <>
            <span className="text-ink">{pendingDelete?.name}</span> будет перемещён в корзину, откуда его можно
            восстановить.
          </>
        }
        confirmLabel="Удалить"
        danger
        setting="service"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteCharacter(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

/**
 * As tall as the room between the header and the footer allows (with space for the plates that hang
 * over its edges), and on a phone narrow enough for the neighbours to show at its sides.
 */
const CARD_HEIGHT = 'min(64vh, 600px, calc(100% - 7.5rem), calc((100vw - 7rem) / 0.66))';

/** Cards fanned around the focused one; neighbours recede and turn away. */
const Carousel: React.FC<{
  slots: Slot[];
  index: number;
  onFocus: (index: number) => void;
  onPlay: (hero: CharacterPreview) => void;
  onCreate: () => void;
}> = ({ slots, index, onFocus, onPlay, onCreate }) => (
  <div className="relative h-full w-full">
    {slots.map((slot, i) => {
      const offset = i - index;
      const distance = Math.abs(offset);
      if (distance > 3) return null;
      const isFocused = offset === 0;
      return (
        // A full-screen layer per card, scaled from the screen centre: on arrival the cards gather
        // in from the edges one after another; on leaving the chosen card comes towards the viewer
        // while the others are thrown apart.
        <motion.div
          key={slot.kind === 'hero' ? slot.hero.id : 'new'}
          className="pointer-events-none absolute inset-0"
          style={{ perspective: 1600, zIndex: 10 - distance }}
          initial={{ opacity: 0, scale: 1.25 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 + distance * 0.07 } }}
          exit={
            isFocused
              ? { opacity: 0, scale: 1.12, transition: { duration: 0.4, ease: [0.4, 0, 1, 1] } }
              : { opacity: 0, scale: 1.35, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }
          }
        >
          <motion.div
            className="pointer-events-auto absolute left-1/2 top-1/2"
            style={{ height: CARD_HEIGHT, aspectRatio: '0.66' }}
            initial={false}
            animate={{
              // Neighbours sit just past the focused card; farther ones overlap each other more.
              x: `calc(-50% + ${Math.sign(offset) * (distance === 0 ? 0 : 74 + (distance - 1) * 46)}%)`,
              y: '-50%',
              scale: isFocused ? 1 : 0.8 - (distance - 1) * 0.08,
              rotateY: offset === 0 ? 0 : offset > 0 ? -22 : 22,
              // Cards stay opaque so the one behind never shows through; depth is shown by darkening.
              opacity: distance > 2 ? 0 : 1,
              filter: isFocused ? 'brightness(1) saturate(1)' : `brightness(${distance === 1 ? 0.38 : 0.22}) saturate(0.55)`,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
          >
            {slot.kind === 'hero' ? (
              <HeroCard
                hero={slot.hero}
                focused={isFocused}
                onClick={() => (isFocused ? onPlay(slot.hero) : onFocus(i))}
              />
            ) : (
              <NewHeroCard focused={isFocused} onClick={() => (isFocused ? onCreate() : onFocus(i))} />
            )}
          </motion.div>
        </motion.div>
      );
    })}
  </div>
);

/** Long names step down in size rather than wrapping onto a third line. */
const nameSize = (name: string) => (name.length > 22 ? 'text-[1.45rem]' : name.length > 14 ? 'text-[1.75rem]' : 'text-[2.1rem]');

const HeroCard: React.FC<{ hero: CharacterPreview; focused: boolean; onClick: () => void }> = ({ hero, focused, onClick }) => {
  const origin = describeOrigin(hero);
  const setting = settingOf(hero);
  const { HeroReadout } = SETTING_ART[setting];
  return (
    <SettingScope setting={setting} className="ui-hero-card relative h-full" data-focused={focused || undefined}>
      {focused && <RulebookPlate hero={hero} />}
      {HeroReadout && <HeroReadout id={hero.id} level={hero.level} age={hero.investigator?.age} hp={hero.currentHP} maxHp={hero.maxHP} />}
      <Panel
        as="button"
        interactive
        active={focused}
        onClick={onClick}
        aria-label={focused ? `Лист: ${hero.name}` : hero.name}
        className="ui-morph flex h-full w-full flex-col overflow-hidden p-0 text-left"
      >
        <CharacterArt source={hero} kind="full" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep from-10% via-bg-deep/60 via-35% to-transparent to-60%" />
        <div className="relative mt-auto space-y-3 p-6">
          {focused && (
            <div className="text-[11px] uppercase tracking-[0.22em] text-frame-bright/80">{SETTING_INFO[setting].label}</div>
          )}
          <div className={cx('ui-display ui-hero-name leading-[1.05] text-ink', nameSize(hero.name))}>{hero.name}</div>
          {focused && (
            <div className="text-sm text-ink-muted">{[origin.race, origin.calling].filter(Boolean).join(' · ')}</div>
          )}
          <HeroVitals hero={hero} className={cx('pt-1', !focused && 'hidden')} meterClassName="flex-1" rulebook={false} />
        </div>
      </Panel>
    </SettingScope>
  );
};

const NewHeroCard: React.FC<{ focused: boolean; onClick: () => void }> = ({ focused, onClick }) => {
  const resumable = useHasSoloDraft();
  return (
  <Panel
    as="button"
    interactive
    active={focused}
    onClick={onClick}
    aria-label="Создать нового героя"
    className="flex h-full w-full flex-col items-center justify-center gap-4 text-center"
  >
    <span className="ui-new-hero-mark grid h-20 w-20 place-items-center rounded-full border border-frame/50 text-frame-bright">
      <IconCreate width={36} height={36} />
    </span>
    <span className="ui-display text-2xl">Новый герой</span>
    <span className="max-w-[16rem] text-sm text-ink-muted">
      {resumable ? 'Создание не закончено: продолжите с того же места' : 'Начните историю с чистого листа'}
    </span>
  </Panel>
  );
};

/**
 * Portrait strip: every hero at a glance, and a quick way to jump far along the row. Standing upright
 * it is strung on a rail, as a game lists its characters down the side of the screen.
 */
const Strip: React.FC<{ slots: Slot[]; index: number; onFocus: (index: number) => void; vertical?: boolean; className?: string }> = ({
  slots,
  index,
  onFocus,
  vertical,
  className,
}) => (
  <div
    className={cx(
      'ui-scroll ui-scroll--bare flex items-center gap-2 px-1.5 py-1.5 [justify-content:safe_center]',
      vertical ? 'ui-strip-rail max-h-[min(60vh,560px)] flex-col gap-3.5 overflow-y-auto py-4' : 'max-w-full overflow-x-auto',
      className,
    )}
    role="tablist"
    aria-label="Герои"
    aria-orientation={vertical ? 'vertical' : 'horizontal'}
  >
    {slots.map((slot, i) => (
      <button
        key={slot.kind === 'hero' ? slot.hero.id : 'new'}
        role="tab"
        aria-selected={i === index}
        aria-label={slot.kind === 'hero' ? slot.hero.name : 'Новый герой'}
        onClick={() => onFocus(i)}
        className={cx(
          'ui-strip-thumb h-11 w-11 shrink-0 overflow-hidden border transition-all',
          i === index ? 'scale-110 border-frame-bright' : 'border-line brightness-[0.6] saturate-[0.7] hover:brightness-100 hover:saturate-100',
        )}
      >
        {slot.kind === 'hero' ? (
          <CharacterArt source={slot.hero} kind="portrait" className="h-full w-full" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-inset text-frame">
            <IconCreate width={18} height={18} />
          </span>
        )}
      </button>
    ))}
  </div>
);
