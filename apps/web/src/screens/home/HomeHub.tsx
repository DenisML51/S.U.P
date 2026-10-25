import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CharacterPreview, PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { IconCombat, IconCreate, IconNext } from '../../ui/icons';
import { Button, IconButton, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import {
  HOME_EASE,
  HomeHeader,
  HeroVitals,
  HomeAtmosphere,
  InviteCodeField,
  PartyPicture,
  heroOrigin,
  meltMask,
  partyRole,
  partyState,
  plural,
  useHomeItems,
  usePartyEntry,
} from './homeShared';
import { rememberLastHero } from './lastHero';

const EASE = HOME_EASE;

/**
 * Concept B, "hub": the hero one plays stands on the left, ready to go on; the tables one sits at
 * are a column of cinematic covers on the right, each in its own world.
 */
export const HomeHub: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties, lastHero } = useHomeItems();
  const entry = usePartyEntry();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const hero = heroes.find((h) => h.id === pickedId) ?? lastHero;

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
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
              <HeroStage
                hero={hero}
                heroes={heroes}
                onPick={setPickedId}
                onPlay={() => play(hero.id)}
                onAll={() => go({ screen: 'heroes' })}
              />
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
  heroes: CharacterPreview[];
  onPick: (id: string) => void;
  onPlay: () => void;
  onAll: () => void;
}> = ({ hero, heroes, onPick, onPlay, onAll }) => {
  const setting = settingOf(hero);
  return (
    <SettingScope setting={setting} className="relative h-full">
      <AnimatePresence initial={false}>
        <motion.button
          key={hero.id}
          type="button"
          onClick={onPlay}
          aria-label={`Лист: ${hero.name}`}
          className="ui-featured absolute -top-24 bottom-0 right-0 w-[78%]"
          style={meltMask({ left: 35, right: 10, top: 18, bottom: 34 })}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          <CharacterArt source={hero} kind="full" className="h-full w-full" position="50% 15%" />
        </motion.button>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="text-[11px] uppercase tracking-[0.24em] text-frame-bright/80">{SETTING_INFO[setting].label}</div>
        <div className="ui-display mt-2 max-w-[34rem] text-[3.2rem] leading-[1.02] text-ink">{hero.name}</div>
        <div className="mt-2 text-ink-muted">{heroOrigin(hero)}</div>
        <HeroVitals hero={hero} className="mt-4" />
        <div className="pointer-events-auto mt-7 flex items-center gap-6">
          <Button variant="primary" size="lg" className="min-w-[200px]" onClick={onPlay}>
            Лист
          </Button>
          <SettingScope setting="service" className="flex items-center gap-2">
            {heroes.map((other) => (
              <button
                key={other.id}
                type="button"
                title={other.name}
                aria-label={other.name}
                onClick={() => onPick(other.id)}
                className={cx(
                  'ui-strip-thumb h-11 w-11 overflow-hidden rounded-full border transition-all',
                  other.id === hero.id ? 'border-frame-bright' : 'border-line opacity-55 hover:opacity-100',
                )}
              >
                <CharacterArt source={other} kind="portrait" className="h-full w-full" />
              </button>
            ))}
            <IconButton label="Все герои" onClick={onAll} className="ml-1">
              <IconNext width={20} height={20} />
            </IconButton>
          </SettingScope>
        </div>
      </div>
    </SettingScope>
  );
};

/**
 * A table as a wide cover in its own world, its name and state laid over the picture. `compact`: a
 * smaller card, for a table among others on a surface.
 */
export const TableCard: React.FC<{ party: PartyListItemDto; onOpen: () => void; compact?: boolean; className?: string }> = ({
  party,
  onOpen,
  compact,
  className,
}) => (
  <SettingScope setting={party.setting} className={cx('ui-table-card', className)}>
    <button
      type="button"
      onClick={onOpen}
      className={cx('ui-table-card__body relative block w-full overflow-hidden text-left', compact ? 'aspect-video' : 'aspect-[16/6]')}
    >
      <PartyPicture party={party} className="ui-table-card__picture absolute inset-0" />
      <span className="absolute inset-0 bg-gradient-to-r from-bg-deep/95 via-bg-deep/60 to-transparent" />
      <span className={cx('relative flex h-full flex-col justify-end', compact ? 'p-4' : 'p-6')}>
        <span className="text-[10px] uppercase tracking-[0.22em] text-frame-bright/85">{SETTING_INFO[party.setting].label}</span>
        <span className={cx('ui-display ui-title mt-1 truncate leading-tight text-ink', compact ? 'text-[1.35rem]' : 'text-[1.9rem]')}>{party.name}</span>
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
