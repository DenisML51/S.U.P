import React from 'react';
import { motion } from 'framer-motion';
import type { CharacterPreview } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { IconCreate, IconNext } from '../../ui/icons';
import { Button, Panel, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import {
  HOME_EASE,
  HeroVitals,
  HomeAtmosphere,
  HomeHeader,
  InviteCodeField,
  heroOrigin,
  plural,
  useHomeItems,
  usePartyEntry,
} from './homeShared';
import { TableCard } from './HomeHub';
import { rememberLastHero } from './lastHero';

/** Other heroes shown as tiles beside the main one; the rest are a click away on hero select. */
const SIDE_HEROES = 3;

/**
 * Concept E, "mosaic": the page is one grid of tiles of different sizes, like a dashboard of one's
 * game. The hero last played takes the largest tile; each tile wears its own world.
 */
export const HomeMosaic: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties, lastHero } = useHomeItems();
  const entry = usePartyEntry();
  const others = heroes.filter((hero) => hero !== lastHero);
  const side = others.slice(0, SIDE_HEROES);

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };

  let order = 0;
  const appear = () => ({
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: HOME_EASE, delay: 0.12 + order++ * 0.05 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  });

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <HomeAtmosphere />
      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        <main className="grid min-h-0 flex-1 grid-cols-12 grid-rows-6 gap-4 px-24 pb-12 pt-8">
          {/* ---------------------------------------------------------------- The hero */}
          <motion.div className="col-span-4 row-span-6 min-h-0" {...appear()}>
            {lastHero ? (
              <FeatureTile hero={lastHero} onPlay={() => play(lastHero.id)} />
            ) : (
              <ActionTile className="h-full" title="Первый герой" note="Выберите мир и соберите героя" onClick={() => startCreation()} />
            )}
          </motion.div>

          {/* ---------------------------------------------------------------- Other heroes */}
          {side.map((hero) => (
            <motion.div key={hero.id} className="col-span-2 row-span-3 min-h-0" {...appear()}>
              <HeroTile hero={hero} onPlay={() => play(hero.id)} />
            </motion.div>
          ))}
          <motion.div className="col-span-2 row-span-3 flex min-h-0 flex-col gap-4" {...appear()}>
            <ActionTile
              className="flex-1"
              title="Все герои"
              note={heroes.length ? `${heroes.length} ${plural(heroes.length, 'герой', 'героя', 'героев')}` : undefined}
              icon={<IconNext width={20} height={20} />}
              onClick={() => go({ screen: 'heroes' })}
            />
            <ActionTile className="flex-1" title="Новый герой" icon={<IconCreate width={20} height={20} />} onClick={() => startCreation()} />
          </motion.div>
          {/* Fewer heroes than tiles: the free cells stay quiet glass, so the grid keeps its shape. */}
          {Array.from({ length: Math.max(0, SIDE_HEROES - side.length) }, (_, i) => (
            <motion.div key={`free-${i}`} className="ui-mosaic-free col-span-2 row-span-3" {...appear()} />
          ))}

          {/* ---------------------------------------------------------------- The tables */}
          <motion.div className="col-span-4 col-start-9 row-span-6 row-start-1 flex min-h-0 flex-col" {...appear()}>
            <Panel className="flex h-full min-h-0 flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[1.15rem] font-semibold text-ink">Партии</div>
                <Button variant="secondary" size="sm" icon={<IconCreate width={14} height={14} />} onClick={() => go({ screen: 'party-form' })}>
                  Собрать
                </Button>
              </div>
              <div className="ui-scroll mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
                {parties?.map((party) => <TableCard key={party.id} party={party} compact onOpen={() => entry.enter(party)} />)}
                {parties?.length === 0 && (
                  <p className="pt-4 text-sm leading-relaxed text-ink-muted">
                    Соберите свою партию — или сядьте за чужой стол по коду от мастера.
                  </p>
                )}
              </div>
              <div className="mt-4 border-t border-[var(--divider)] pt-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-ink-faint">Код приглашения</div>
                <InviteCodeField onFound={entry.showInvite} />
              </div>
            </Panel>
          </motion.div>
        </main>
      </div>
      {entry.dialogs}
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

const FeatureTile: React.FC<{ hero: CharacterPreview; onPlay: () => void }> = ({ hero, onPlay }) => {
  const setting = settingOf(hero);
  // The tile wears the hero's world; the button over it is the page's own (service), so it sits
  // outside the world's scope.
  return (
    <div className="relative h-full">
      <SettingScope setting={setting} className="h-full">
        <Panel as="div" className="ui-mosaic-tile relative flex h-full flex-col overflow-hidden p-0">
          <CharacterArt source={hero} kind="full" className="absolute inset-0 h-full w-full" position="50% 12%" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deep from-25% via-bg-deep/50 via-50% to-transparent to-75%" />
          <div className="relative mt-auto p-6 pb-24">
            <div className="text-[11px] uppercase tracking-[0.22em] text-frame-bright/85">Продолжить · {SETTING_INFO[setting].label}</div>
            <div className="ui-display mt-2 text-[2.4rem] leading-[1.04] text-ink">{hero.name}</div>
            <div className="mt-1.5 text-sm text-ink-muted">{heroOrigin(hero)}</div>
            <HeroVitals hero={hero} className="mt-3" />
          </div>
        </Panel>
      </SettingScope>
      <Button variant="primary" size="lg" className="absolute inset-x-6 bottom-6" onClick={onPlay}>
        Лист
      </Button>
    </div>
  );
};

const HeroTile: React.FC<{ hero: CharacterPreview; onPlay: () => void }> = ({ hero, onPlay }) => {
  const setting = settingOf(hero);
  return (
    <SettingScope setting={setting} className="h-full">
      <button type="button" onClick={onPlay} aria-label={`Лист: ${hero.name}`} className="ui-mosaic-tile ui-mosaic-hero relative block h-full w-full overflow-hidden text-left">
        <CharacterArt source={hero} kind="full" className="ui-mosaic-hero__art absolute inset-0 h-full w-full" position="50% 12%" />
        <span className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/20 via-40% to-transparent" />
        <span className="absolute inset-x-0 bottom-0 p-4">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-frame-bright/85">{SETTING_INFO[setting].label}</span>
          <span className="ui-display mt-1 block truncate text-[1.25rem] leading-tight text-ink">{hero.name}</span>
          <span className="mt-0.5 block text-xs text-ink-muted">Ур. {hero.level}</span>
        </span>
      </button>
    </SettingScope>
  );
};

const ActionTile: React.FC<{
  title: string;
  note?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick: () => void;
}> = ({ title, note, icon, className, onClick }) => (
  <Panel as="button" interactive onClick={onClick} className={cx('flex flex-col justify-between p-5 text-left', className)}>
    <span className="text-ink-faint">{icon ?? <IconCreate width={20} height={20} />}</span>
    <span>
      <span className="block font-semibold text-ink">{title}</span>
      {note && <span className="mt-0.5 block text-sm text-ink-muted">{note}</span>}
    </span>
  </Panel>
);
