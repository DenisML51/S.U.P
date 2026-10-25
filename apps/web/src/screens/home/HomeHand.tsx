import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterPreview } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { IconCreate, IconNext } from '../../ui/icons';
import { Button, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO, settingOf } from '../../ui/theme/settings';
import { HOME_EASE, HomeAtmosphere, HomeHeader, InviteCodeField, useHomeItems, usePartyEntry } from './homeShared';
import { TableCard } from './HomeHub';
import { rememberLastHero } from './lastHero';

/** Height of a card in the hand and how much of it shows while it rests. */
const CARD_H = 330;
const CARD_W = 220;
const RESTING = 200;

/**
 * Concept D, "hand": one's heroes are a hand of cards along the bottom of the screen, as in a card
 * game; the tables one sits at lie face up on the table above. A card under the cursor is drawn up
 * out of the hand and shows who it is.
 */
export const HomeHand: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroes, parties } = useHomeItems();
  const entry = usePartyEntry();

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <HomeAtmosphere />
      <div className="ui-home-felt pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        {/* ---------------------------------------------------------------- The table */}
        <motion.main
          className="flex min-h-0 flex-1 flex-col items-center px-24 pt-4"
          style={{ paddingBottom: RESTING + 24 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: HOME_EASE, delay: 0.15 } }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <div className="flex w-full items-end justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-ink-faint">Игра с мастером</div>
              <div className="mt-1 text-[1.6rem] font-semibold leading-tight text-ink">Столы</div>
            </div>
            <div className="flex items-center gap-3">
              <InviteCodeField onFound={entry.showInvite} className="w-[17rem]" />
              <Button variant="secondary" size="sm" icon={<IconCreate width={15} height={15} />} onClick={() => go({ screen: 'party-form' })}>
                Собрать партию
              </Button>
            </div>
          </div>
          <div className="ui-scroll mt-6 flex min-h-0 w-full max-w-[1100px] flex-1 flex-wrap content-center justify-center gap-6 overflow-y-auto py-2">
            {parties?.map((party, index) => (
              <motion.div
                key={party.id}
                className="w-[330px]"
                initial={{ opacity: 0, y: 20, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  // Cards lie on the table as they were put down: never quite straight.
                  rotate: index % 2 ? 1.2 : -1.2,
                  transition: { duration: 0.6, ease: HOME_EASE, delay: 0.25 + index * 0.07 },
                }}
              >
                <TableCard party={party} compact onOpen={() => entry.enter(party)} />
              </motion.div>
            ))}
            {parties?.length === 0 && (
              <p className="max-w-sm self-center text-center text-sm leading-relaxed text-ink-muted">
                На столе пусто. Соберите свою партию — или сядьте за чужой стол по коду от мастера.
              </p>
            )}
          </div>
        </motion.main>
      </div>

      <Hand heroes={heroes} onPlay={play} onCreate={() => startCreation()} onAll={() => go({ screen: 'heroes' })} />
      {entry.dialogs}
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

/** The heroes fanned along the bottom edge; the new-hero card closes the hand. */
const Hand: React.FC<{
  heroes: CharacterPreview[];
  onPlay: (id: string) => void;
  onCreate: () => void;
  onAll: () => void;
}> = ({ heroes, onPlay, onCreate, onAll }) => {
  const [drawn, setDrawn] = useState<number | null>(null);
  const count = heroes.length + 1;
  // A wide hand overlaps more, so it still fits the screen.
  const step = Math.min(CARD_W * 0.78, 900 / Math.max(1, count - 1));
  const middle = (count - 1) / 2;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 h-0" onMouseLeave={() => setDrawn(null)}>
      <button
        type="button"
        onClick={onAll}
        className="ui-hand-all absolute left-24 flex items-center gap-1.5 text-sm text-ink-muted"
        style={{ bottom: RESTING + 18 }}
      >
        <span className="text-[11px] uppercase tracking-[0.26em] text-ink-faint">Мои герои</span>
        <IconNext width={14} height={14} />
      </button>
      {Array.from({ length: count }, (_, index) => {
        const hero = heroes[index];
        const offset = index - middle;
        const isDrawn = drawn === index;
        // Cards next to the drawn one lean away to make room for it.
        const push = drawn === null || isDrawn ? 0 : Math.sign(index - drawn) * (Math.abs(index - drawn) === 1 ? 46 : 26);
        return (
          <motion.div
            key={hero?.id ?? 'new'}
            className="absolute left-1/2"
            style={{ width: CARD_W, height: CARD_H, bottom: RESTING - CARD_H, zIndex: isDrawn ? 50 : index, transformOrigin: '50% 120%' }}
            initial={{ x: '-50%', y: 160, opacity: 0 }}
            animate={{
              x: `calc(-50% + ${offset * step + push}px)`,
              // The fan's arc: cards at the ends sit lower. A drawn card comes up whole and straight, its
              // bottom edge on the screen's, so it never slides out from under the cursor.
              y: isDrawn ? -(CARD_H - RESTING) : Math.abs(offset) ** 2 * 4,
              rotate: isDrawn ? 0 : offset * 4,
              opacity: 1,
              transition: { type: 'spring', stiffness: 260, damping: 28 },
            }}
            exit={{ y: 200, opacity: 0, transition: { duration: 0.3 } }}
            onMouseEnter={() => setDrawn(index)}
          >
            {hero ? (
              <HeroCard hero={hero} drawn={isDrawn} onClick={() => onPlay(hero.id)} />
            ) : (
              <button type="button" onClick={onCreate} className="ui-hand-card ui-hand-card--new flex h-full w-full flex-col items-center gap-3 pt-14">
                <IconCreate width={30} height={30} />
                <span className="text-sm">Новый герой</span>
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const HeroCard: React.FC<{ hero: CharacterPreview; drawn: boolean; onClick: () => void }> = ({ hero, drawn, onClick }) => {
  const setting = settingOf(hero);
  return (
    <SettingScope setting={setting} className="h-full">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Лист: ${hero.name}`}
        data-drawn={drawn || undefined}
        className="ui-hand-card relative block h-full w-full overflow-hidden text-left"
      >
        <CharacterArt source={hero} kind="full" className="absolute inset-0 h-full w-full" position="50% 12%" />
        <span className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/30 via-40% to-transparent to-60%" />
        <span className={cx('absolute inset-x-0 bottom-0 p-4 transition-opacity duration-300', drawn ? 'opacity-100' : 'opacity-0')}>
          <span className="block text-[10px] uppercase tracking-[0.22em] text-frame-bright/85">{SETTING_INFO[setting].label}</span>
          <span className="ui-display mt-1 block text-[1.45rem] leading-[1.05] text-ink">{hero.name}</span>
          <span className="mt-1.5 flex items-baseline gap-2 text-xs text-ink-muted">
            <span>Ур. {hero.level}</span>
            <span className="ui-numeric">
              {hero.currentHP}/{hero.maxHP}
            </span>
          </span>
        </span>
      </button>
    </SettingScope>
  );
};
