import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DEFAULT_SETTING, type CharacterPreview } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CharacterArt, fullArtSrc } from '../../ui/CharacterArt';
import { describeOrigin } from '../../ui/characterLabels';
import { ConfirmDialog } from '../../ui/Dialog';
import { Button, IconButton, Meter, Panel, cx } from '../../ui/primitives';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope } from '../../ui/theme/SettingScope';
import { settingOf, SETTING_INFO } from '../../ui/theme/settings';
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

const LAST_CHARACTER_KEY = 'itd.lastCharacterId';

const rememberLast = (id: string) => {
  try {
    localStorage.setItem(LAST_CHARACTER_KEY, id);
  } catch {
    // Not remembered; the list starts at the first hero next time.
  }
};
const readLast = (): string | null => {
  try {
    return localStorage.getItem(LAST_CHARACTER_KEY);
  } catch {
    return null;
  }
};

/** Index of the "new hero" slot that ends the row. */
type Slot = { kind: 'hero'; hero: CharacterPreview } | { kind: 'new' };

interface HeroSelectProps {
  onCreate: () => void;
  onOpenSettings: () => void;
}

/**
 * The first screen after signing in: heroes as a row of cards, the focused one in front. The whole
 * screen takes the focused hero's setting, so browsing previews each universe before entering.
 */
export const HeroSelect: React.FC<HeroSelectProps> = ({ onCreate, onOpenSettings }) => {
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
  const setting = focused.kind === 'hero' ? settingOf(focused.hero) : DEFAULT_SETTING;

  const [pendingDelete, setPendingDelete] = useState<CharacterPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const play = useCallback(
    (hero: CharacterPreview) => {
      rememberLast(hero.id);
      void loadCharacter(hero.id);
    },
    [loadCharacter],
  );
  const step = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(slots.length - 1, i + delta))), [slots.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pendingDelete || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
      else if (event.key === 'Enter') {
        if (focused.kind === 'hero') play(focused.hero);
        else onCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, onCreate, pendingDelete, play, step]);

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importFromJSON(file).catch(() => {});
  };

  const background = focused.kind === 'hero' ? fullArtSrc(focused.hero) : undefined;

  return (
    <SettingScope setting={setting} className="ui-morph relative h-screen overflow-hidden bg-bg">
      {/* Atmosphere: the focused hero's art, blurred into the backdrop. */}
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
      <SettingBackdrop setting={setting} />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-24 pt-10">
          <Wordmark setting={setting} />
          <div className="flex items-center gap-3">
            <SyncBadge />
            <IconButton label="Настройки" onClick={onOpenSettings}>
              <IconSettings width={22} height={22} />
            </IconButton>
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 items-center justify-center">
          <Carousel slots={slots} index={focusIndex} onFocus={setIndex} onPlay={play} onCreate={onCreate} />
          <IconButton label="Предыдущий герой" className="absolute left-16" size={44} onClick={() => step(-1)} disabled={focusIndex === 0}>
            <IconPrev width={26} height={26} />
          </IconButton>
          <IconButton
            label="Следующий герой"
            className="absolute right-16"
            size={44}
            onClick={() => step(1)}
            disabled={focusIndex === slots.length - 1}
          >
            <IconNext width={26} height={26} />
          </IconButton>
        </main>

        <footer className="flex items-center justify-between gap-6 px-24 pb-10">
          <div className="flex w-64 gap-2">
            <Button variant="ghost" size="sm" icon={<IconImport width={16} height={16} />} onClick={() => fileInput.current?.click()}>
              Импорт
            </Button>
            <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
          </div>

          <div className="flex flex-col items-center gap-4">
            {focused.kind === 'hero' ? (
              <Button variant="primary" size="lg" className="min-w-[220px]" onClick={() => play(focused.hero)}>
                Играть
              </Button>
            ) : (
              <Button variant="primary" size="lg" className="min-w-[220px]" icon={<IconCreate width={18} height={18} />} onClick={onCreate}>
                Создать героя
              </Button>
            )}
            <Strip slots={slots} index={focusIndex} onFocus={setIndex} />
          </div>

          <div className="flex w-64 justify-end gap-1">
            {focused.kind === 'hero' && (
              <>
                <IconButton label="Экспорт в файл" onClick={() => void exportToJSON(focused.hero.id)}>
                  <IconExport width={20} height={20} />
                </IconButton>
                <IconButton label="Удалить героя" onClick={() => setPendingDelete(focused.hero)}>
                  <IconTrash width={20} height={20} />
                </IconButton>
              </>
            )}
          </div>
        </footer>
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

const CARD_HEIGHT = 'min(64vh, 600px)';

/** Cards fanned around the focused one; neighbours recede and turn away. */
const Carousel: React.FC<{
  slots: Slot[];
  index: number;
  onFocus: (index: number) => void;
  onPlay: (hero: CharacterPreview) => void;
  onCreate: () => void;
}> = ({ slots, index, onFocus, onPlay, onCreate }) => (
  <div className="relative h-full w-full" style={{ perspective: 1600 }}>
    {slots.map((slot, i) => {
      const offset = i - index;
      const distance = Math.abs(offset);
      if (distance > 3) return null;
      const isFocused = offset === 0;
      return (
        <motion.div
          key={slot.kind === 'hero' ? slot.hero.id : 'new'}
          className="absolute left-1/2 top-1/2"
          style={{ height: CARD_HEIGHT, aspectRatio: '0.66', zIndex: 10 - distance }}
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
      );
    })}
  </div>
);

/** Long names step down in size rather than wrapping onto a third line. */
const nameSize = (name: string) => (name.length > 22 ? 'text-[1.45rem]' : name.length > 14 ? 'text-[1.75rem]' : 'text-[2.1rem]');

const HeroCard: React.FC<{ hero: CharacterPreview; focused: boolean; onClick: () => void }> = ({ hero, focused, onClick }) => {
  const origin = describeOrigin(hero);
  const setting = settingOf(hero);
  return (
    <SettingScope setting={setting} className="h-full">
      <Panel
        as="button"
        interactive
        active={focused}
        onClick={onClick}
        aria-label={focused ? `Играть за ${hero.name}` : hero.name}
        className="ui-morph flex h-full w-full flex-col overflow-hidden p-0 text-left"
      >
        <CharacterArt source={hero} kind="full" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep from-10% via-bg-deep/60 via-35% to-transparent to-60%" />
        <div className="relative mt-auto space-y-3 p-6">
          {focused && (
            <div className="text-[11px] uppercase tracking-[0.22em] text-frame-bright/80">{SETTING_INFO[setting].label}</div>
          )}
          <div className={cx('ui-display leading-[1.05] text-ink', nameSize(hero.name))}>{hero.name}</div>
          {focused && (
            <div className="text-sm text-ink-muted">{[origin.race, origin.calling].filter(Boolean).join(' · ')}</div>
          )}
          <div className={cx('flex items-center gap-4 pt-1', !focused && 'hidden')}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">Ур.</span>
              <span className="ui-display ui-numeric text-2xl text-frame-bright">{hero.level}</span>
            </div>
            <div className="flex-1">
              <Meter value={hero.currentHP} max={hero.maxHP} tone="hp" height={5} label="Здоровье" />
            </div>
            <span className="ui-numeric text-xs text-ink-muted">
              {hero.currentHP}/{hero.maxHP}
            </span>
          </div>
        </div>
      </Panel>
    </SettingScope>
  );
};

const NewHeroCard: React.FC<{ focused: boolean; onClick: () => void }> = ({ focused, onClick }) => (
  <Panel
    as="button"
    interactive
    active={focused}
    onClick={onClick}
    aria-label="Создать нового героя"
    className="flex h-full w-full flex-col items-center justify-center gap-4 text-center"
  >
    <span className="grid h-20 w-20 place-items-center rounded-full border border-frame/50 text-frame-bright">
      <IconCreate width={36} height={36} />
    </span>
    <span className="ui-display text-2xl">Новый герой</span>
    <span className="max-w-[16rem] text-sm text-ink-muted">Начните историю с чистого листа</span>
  </Panel>
);

/** Portrait strip: every hero at a glance, and a quick way to jump far along the row. */
const Strip: React.FC<{ slots: Slot[]; index: number; onFocus: (index: number) => void }> = ({ slots, index, onFocus }) => (
  <div className="flex items-center gap-2" role="tablist" aria-label="Герои">
    {slots.map((slot, i) => (
      <button
        key={slot.kind === 'hero' ? slot.hero.id : 'new'}
        role="tab"
        aria-selected={i === index}
        aria-label={slot.kind === 'hero' ? slot.hero.name : 'Новый герой'}
        onClick={() => onFocus(i)}
        className={cx(
          'ui-morph h-11 w-11 overflow-hidden border transition-all',
          i === index ? 'scale-110 border-frame-bright' : 'border-line opacity-60 hover:opacity-100',
        )}
        style={{ borderRadius: 'var(--radius)' }}
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
