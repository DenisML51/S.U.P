import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { IconCombat, IconCreate } from '../../ui/icons';
import { Button, Panel, cx } from '../../ui/primitives';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import {
  HOME_EASE,
  HomeHeader,
  HeroVitals,
  HomeAtmosphere,
  InviteCodeField,
  PartyPicture,
  heroOrigin,
  itemKey,
  itemWorld,
  partyRole,
  partyState,
  plural,
  useHomeItems,
  usePartyEntry,
  type HomeItem,
} from './homeShared';
import { readLastHero, rememberLastHero } from './lastHero';

const EASE = HOME_EASE;

/**
 * Concept C, "shelf": everything one has in one row of tiles, heroes then tables, like a console's
 * home. The chosen tile opens large below it, in its own world; the page around it stays the same.
 */
export const HomeShelf: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const go = useNavStore((s) => s.go);
  const startCreation = useNavStore((s) => s.startCreation);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const { heroItems, partyItems } = useHomeItems();
  const entry = usePartyEntry();
  const items = [...heroItems, ...partyItems];

  const [chosenKey, setChosenKey] = useState<string | null>(() => {
    const last = readLastHero();
    return last ? `hero:${last}` : null;
  });
  const chosen = items.find((item) => itemKey(item) === chosenKey) ?? items[0];

  const play = (id: string) => {
    rememberLastHero(id);
    void loadCharacter(id);
  };
  const open = (item: HomeItem) => (item.kind === 'hero' ? play(item.hero.id) : entry.enter(item.party));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || document.querySelector('[role="dialog"]')) return;
      const at = chosen ? items.indexOf(chosen) : -1;
      if (event.key === 'ArrowRight' && at < items.length - 1) setChosenKey(itemKey(items[at + 1]!));
      else if (event.key === 'ArrowLeft' && at > 0) setChosenKey(itemKey(items[at - 1]!));
      else if (event.key === 'Enter' && chosen) open(chosen);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <SettingScope setting="service" className="relative h-screen overflow-clip bg-bg">
      <HomeAtmosphere />

      <div className="relative z-10 flex h-full flex-col">
        <HomeHeader onOpenSettings={onOpenSettings} />

        {/* ---------------------------------------------------------------- The shelf */}
        <motion.nav
          className="mt-8 flex items-end gap-12 px-24"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.15 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <ShelfGroup title="Герои">
            {heroItems.map((item) => (
              <Tile key={itemKey(item)} item={item} chosen={item === chosen} onChoose={() => setChosenKey(itemKey(item))} onOpen={() => open(item)} />
            ))}
            <AddTile label="Новый герой" onClick={() => startCreation()} />
          </ShelfGroup>
          <ShelfGroup title="Партии">
            {partyItems.map((item) => (
              <Tile key={itemKey(item)} item={item} chosen={item === chosen} onChoose={() => setChosenKey(itemKey(item))} onOpen={() => open(item)} />
            ))}
            <AddTile label="Собрать партию" wide onClick={() => go({ screen: 'party-form' })} />
          </ShelfGroup>
          <div className="mb-[14px] ml-auto w-[17rem]">
            <div className="mb-3 text-[11px] uppercase tracking-[0.26em] text-ink-faint">Код приглашения</div>
            <InviteCodeField onFound={entry.showInvite} />
          </div>
        </motion.nav>

        {/* ---------------------------------------------------------------- The chosen one */}
        <main className="relative min-h-0 flex-1 px-24 pb-12 pt-10">
          <AnimatePresence mode="wait" initial={false}>
            {chosen && (
              <motion.div
                key={itemKey(chosen)}
                className="h-full"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
              >
                <Detail
                  item={chosen}
                  onOpen={() => open(chosen)}
                  onAll={() => go({ screen: 'heroes' })}
                  onSettings={chosen.kind === 'party' && chosen.party.role === 'master' ? () => go({ screen: 'party-form', partyId: chosen.party.id }) : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      {entry.dialogs}
    </SettingScope>
  );
};

// ------------------------------------------------------------------------------------------------

const ShelfGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="mb-3 text-[11px] uppercase tracking-[0.26em] text-ink-faint">{title}</div>
    <div className="flex h-[104px] items-end gap-3">{children}</div>
  </div>
);

/** One thing on the shelf: a hero's portrait or a table's cover. The chosen one is larger and lit. */
const Tile: React.FC<{ item: HomeItem; chosen: boolean; onChoose: () => void; onOpen: () => void }> = ({
  item,
  chosen,
  onChoose,
  onOpen,
}) => (
  <SettingScope setting={itemWorld(item)} className="contents">
    <motion.button
      type="button"
      onClick={chosen ? onOpen : onChoose}
      title={item.kind === 'hero' ? item.hero.name : item.party.name}
      data-chosen={chosen || undefined}
      className={cx('ui-shelf-tile relative shrink-0 overflow-hidden', item.kind === 'party' && 'ui-shelf-tile--wide')}
      animate={{ height: chosen ? 104 : 76 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      {item.kind === 'hero' ? (
        <CharacterArt source={item.hero} kind="portrait" className="h-full w-full" />
      ) : (
        <PartyPicture party={item.party} className="absolute inset-0" />
      )}
    </motion.button>
  </SettingScope>
);

const AddTile: React.FC<{ label: string; wide?: boolean; onClick: () => void }> = ({ label, wide, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={cx('ui-shelf-tile ui-shelf-tile--add grid h-[76px] shrink-0 place-items-center', wide && 'ui-shelf-tile--wide')}
  >
    <IconCreate width={22} height={22} />
  </button>
);

/** The chosen thing, large: words on the left, its picture in its own world on the right. */
const Detail: React.FC<{ item: HomeItem; onOpen: () => void; onAll: () => void; onSettings?: () => void }> = ({
  item,
  onOpen,
  onAll,
  onSettings,
}) => {
  const world = itemWorld(item);
  return (
    <SettingScope setting={world} className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-16">
      <div className="max-w-[36rem] self-end pb-24">
        <div className="text-[11px] uppercase tracking-[0.24em] text-frame-bright/80">
          {SETTING_INFO[world as keyof typeof SETTING_INFO].label}
        </div>
        {item.kind === 'hero' ? (
          <>
            <div className="ui-display mt-2 text-[3.6rem] leading-[1.02] text-ink">{item.hero.name}</div>
            <div className="mt-2 text-ink-muted">{heroOrigin(item.hero)}</div>
            <HeroVitals hero={item.hero} className="mt-4" />
          </>
        ) : (
          <>
            <div className="ui-display ui-title mt-2 text-[3.6rem] leading-[1.02] text-ink">{item.party.name}</div>
            <div className="mt-2 text-ink-muted">
              {partyRole(item.party)} · {item.party.memberCount} {plural(item.party.memberCount, 'участник', 'участника', 'участников')}
            </div>
            <div className={cx('mt-3 flex items-center gap-1.5 text-sm', item.party.inCombat ? 'text-danger' : item.party.inSession ? 'text-success' : 'text-ink-faint')}>
              {item.party.inCombat && <IconCombat width={15} height={15} />}
              {partyState(item.party)}
            </div>
          </>
        )}
        <div className="mt-8 flex items-center gap-3">
          <Button variant="primary" size="lg" className="min-w-[200px]" onClick={onOpen}>
            {item.kind === 'hero' ? 'Лист' : 'За стол'}
          </Button>
          {item.kind === 'hero' && (
            <Button variant="secondary" onClick={onAll}>
              Все герои
            </Button>
          )}
          {onSettings && (
            <Button variant="secondary" onClick={onSettings}>
              Настройки стола
            </Button>
          )}
        </div>
      </div>

      <Panel
        as="button"
        interactive
        onClick={onOpen}
        className={cx('ui-morph relative h-full max-h-[30rem] overflow-hidden p-0', item.kind === 'hero' ? 'aspect-[2/3]' : 'aspect-video')}
      >
        {item.kind === 'hero' ? (
          <CharacterArt source={item.hero} kind="full" className="absolute inset-0 h-full w-full" />
        ) : (
          <PartyPicture party={item.party} className="absolute inset-0" />
        )}
      </Panel>
    </SettingScope>
  );
};
