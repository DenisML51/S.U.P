import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterPreview } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { SettingEmblem } from '../../ui/ornaments';
import { cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import {
  HOME_EASE,
  HomeHeader,
  HeroVitals, HomeAtmosphere, InviteCodeField, heroOrigin, meltMask, useHomeItems, usePartyEntry } from './homeShared';
import { rememberLastHero } from './lastHero';

const EASE = HOME_EASE;

/**
 * Concept A, "title menu": the page reads like a game's main menu. Words on the left; on the right
 * the hero last played stands waiting to be continued.
 */
export const HomeMenu: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties, lastHero } = useHomeItems();
  const entry = usePartyEntry();
  const [joining, setJoining] = useState(false);

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <HomeAtmosphere />
      {lastHero && <Featured hero={lastHero} onPlay={() => play(lastHero.id)} />}

      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        <motion.nav
          className="ui-scroll flex min-h-0 w-[30rem] flex-1 flex-col justify-center overflow-y-auto py-10 pl-24"
          initial="hidden"
          animate="shown"
          exit="hidden"
          variants={{ shown: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } } }}
        >
          <MenuGroup title="Одиночная игра">
            {lastHero && <MenuItem large label="Продолжить" onClick={() => play(lastHero.id)} />}
            <MenuItem
              label="Мои герои"
              note={heroes.length ? String(heroes.length) : undefined}
              onClick={() => go({ screen: 'heroes' })}
            />
            <MenuItem label="Новый герой" onClick={() => startCreation()} />
          </MenuGroup>

          <MenuGroup title="Игра с мастером">
            {parties?.map((party) => (
              <MenuItem
                key={party.id}
                label={party.name}
                world={party.setting}
                note={party.inCombat ? 'бой' : party.inSession ? 'сессия' : undefined}
                onClick={() => entry.enter(party)}
              />
            ))}
            <MenuItem label="Собрать партию" onClick={() => go({ screen: 'party-form' })} />
            {joining ? (
              <motion.div variants={ITEM} className="py-2 pr-8">
                <InviteCodeField autoFocus onFound={entry.showInvite} />
              </motion.div>
            ) : (
              <MenuItem label="Войти по коду" onClick={() => setJoining(true)} />
            )}
          </MenuGroup>
        </motion.nav>
        <div className="h-16 shrink-0" />
      </div>
      {entry.dialogs}
    </SettingScope>
  );
};

const ITEM = {
  hidden: { opacity: 0, x: -16 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

const MenuGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-9 last:mb-0">
    <motion.div variants={ITEM} className="mb-2 text-[11px] uppercase tracking-[0.26em] text-ink-faint">
      {title}
    </motion.div>
    {children}
  </div>
);

const MenuItem: React.FC<{
  label: string;
  note?: string;
  large?: boolean;
  /** A table's world: its emblem before the name, in the world's own colour. */
  world?: CharacterPreview['setting'];
  onClick: () => void;
}> = ({ label, note, large, world, onClick }) => (
  <motion.button
    type="button"
    variants={ITEM}
    onClick={onClick}
    title={world ? SETTING_INFO[world!].label : undefined}
    className={cx('ui-menu-item flex w-full items-center gap-3 py-1.5 text-left', large && 'ui-menu-item--large')}
  >
    {world && (
      <SettingScope setting={world} className="contents">
        <SettingEmblem size={18} className="shrink-0 text-frame-bright" />
      </SettingScope>
    )}
    <span className="truncate">{label}</span>
    {note && <span className="shrink-0 text-sm font-normal text-ink-faint">{note}</span>}
  </motion.button>
);

// ------------------------------------------------------------------------------------------------

/** The hero last played, standing large on the right in their own world, ready to be continued. */
const Featured: React.FC<{ hero: CharacterPreview; onPlay: () => void }> = ({ hero, onPlay }) => (
  <SettingScope setting={settingOf(hero)} className="absolute inset-y-0 right-0 w-[64%]">
    <motion.button
      type="button"
      onClick={onPlay}
      aria-label={`Продолжить за ${hero.name}`}
      className="ui-featured absolute inset-y-0 right-0 w-[66%]"
      style={meltMask({ left: 30, right: 14, top: 12, bottom: 30 })}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE, delay: 0.15 } }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.3 } }}
    >
      <CharacterArt source={hero} kind="full" className="h-full w-full" position="50% 15%" />
    </motion.button>
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg-deep/80 to-transparent" />
    <motion.div
      className="pointer-events-none absolute bottom-[12%] left-[6%] max-w-[30rem]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.35 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className="text-[11px] uppercase tracking-[0.24em] text-frame-bright/80">{SETTING_INFO[settingOf(hero)].label}</div>
      <div className="ui-display mt-2 text-[3.2rem] leading-[1.02] text-ink">{hero.name}</div>
      <div className="mt-2 text-ink-muted">{heroOrigin(hero)}</div>
      <HeroVitals hero={hero} className="mt-4" />
    </motion.div>
  </SettingScope>
);

