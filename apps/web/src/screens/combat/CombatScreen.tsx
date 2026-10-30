import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { initiativeModifier, resetTurn } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useTableOfCharacter } from '../../store/usePartyStore';
import { useNavStore } from '../../store/useNavStore';
import { useSessionStore } from '../../store/useSessionStore';
import { CombatChat } from '../party/CombatChat';
import { PartyCombatBar } from '../party/PartyCombatBar';
import { useTurnLock } from '../party/useTurnLock';
import { useFollowTurn } from '../party/useFollowTurn';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { Button, IconButton } from '../../ui/primitives';
import { IconClose, IconDice, IconExit, IconHistory, IconPrev, IconSettings } from '../../ui/icons';
import { Drawer } from '../../ui/Drawer';
import { useToastOffset } from '../../ui/Toasts';
import { useAtLeast } from '../../ui/useBreakpoint';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { SheetDialogsProvider, useSheetDialogs } from '../sheet/dialogs/context';
import { SheetDialogHost } from '../sheet/dialogs/SheetDialogHost';
import { ConcentrationPrompt } from '../sheet/Concentration';
import { SlotPrompt } from '../sheet/SlotPrompt';
import { AmountPrompt } from '../sheet/AmountPrompt';
import { AmmoPrompt } from '../sheet/AmmoPrompt';
import { foldRepeats } from '../sheet/parts/history';
import { useRolls } from '../sheet/useRolls';
import { SyncStatus } from '../../ui/SyncStatus';
import { Hotbar } from './Hotbar';
import { ActionTokens, CombatStats, ExperienceBar, Portrait, ResourceStrip, VitalBars } from './HudParts';

interface CombatState {
  inCombat: boolean;
  round: number;
  initiative: number | null;
}

const IDLE: CombatState = { inCombat: false, round: 0, initiative: null };
const storageKey = (id: string) => `itd.combat.${id}`;

/** The fight survives a page reload; it lives with the browser tab, not with the character. */
function useCombatState(characterId: string): [CombatState, (state: CombatState) => void] {
  const [state, setState] = useState<CombatState>(() => {
    try {
      return { ...IDLE, ...JSON.parse(sessionStorage.getItem(storageKey(characterId)) ?? '{}') };
    } catch {
      return IDLE;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(characterId), JSON.stringify(state));
    } catch {
      // Not kept across reloads; the fight itself goes on.
    }
  }, [characterId, state]);
  return [state, setState];
}

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/** The last things that happened, newest at the bottom, older ones fading out. */
const CombatLog: React.FC<{ character: Character }> = ({ character }) => {
  const recent = foldRepeats([...character.history].sort((a, b) => a.timestamp - b.timestamp)).slice(-9);
  if (recent.length === 0) return null;
  return (
    <ol className="space-y-1.5 text-sm" aria-label="Последние события">
      {recent.map(({ entry, count }, index) => (
        <li
          key={entry.id}
          // The newest reads in full ink; older ones fade, never below what can still be read.
          className={index === recent.length - 1 ? 'text-ink' : 'text-ink-muted'}
          style={{ opacity: 0.6 + (0.4 * (index + 1)) / recent.length }}
        >
          {entry.message}
          {count > 1 && <span className="ml-2 tabular-nums opacity-60">×{count}</span>}
        </li>
      ))}
    </ol>
  );
};

const CombatHud: React.FC<{ character: Character; onOpenSettings: () => void }> = ({
  character,
  onOpenSettings,
}) => {
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const go = useNavStore((s) => s.go);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const dialogs = useSheetDialogs();
  const roll = useRolls();
  const [combat, setCombat] = useCombatState(character.id);
  const userId = useSessionStore((s) => s.user?.id);
  // A hero at a party's table fights the party's fight: the master starts it and the turns are shared.
  // Between sessions the hero fights on their own, as if they had no party.
  const { party } = useTableOfCharacter(character.id);
  const partyFight = party?.combat ?? null;
  const partyInitiative = partyFight?.combatants.find(
    (c) =>
      c.kind === 'hero' &&
      party?.heroes.some((hero) => hero.id === c.refId && hero.characterId === character.id),
  )?.initiative;
  const inCombat = party ? partyFight !== null : combat.inCombat;
  useTurnLock(character.id);

  useFollowTurn(character.id);
  const locked = useCharacterStore((s) => s.turnLock) !== null;
  // Below the desktop width the HUD's floating panels go one under another.
  const desktop = useAtLeast('desktop');

  const start = () => {
    const initiative = roll.check('Инициатива', initiativeModifier(character), { test: { kind: 'initiative' } });
    updateCharacter((doc) => resetTurn(doc), { log: { message: 'Бой начался', type: 'other' } });
    setCombat({ inCombat: true, round: 1, initiative });
  };
  const nextTurn = () => {
    updateCharacter((doc) => resetTurn(doc));
    setCombat({ ...combat, round: combat.round + 1 });
  };
  const finish = () => {
    updateCharacter((doc) => resetTurn(doc), { log: { message: 'Бой окончен', type: 'other' } });
    setCombat(IDLE);
  };

  // The fight's state and its controls: the party's turn order at a table, the hero's own rounds alone.
  const fight = party ? (
    <PartyCombatBar
      party={party}
      characterId={character.id}
      onMyTurn={() =>
        updateCharacter((doc) => resetTurn(doc), { log: { message: 'Ваш ход', type: 'other' }, undoable: false })
      }
    />
  ) : (
    <AnimatePresence mode="wait" initial={false}>
      {combat.inCombat ? (
        <motion.div
          key="fight"
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <span className="ui-display text-lg text-frame-bright">Раунд {combat.round}</span>
          <Button variant="primary" size="md" onClick={nextTurn}>
            Следующий ход
          </Button>
          <Button variant="ghost" size="sm" onClick={finish}>
            Выйти из боя
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="calm"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <Button variant="primary" size="md" onClick={start} icon={<IconDice width={18} height={18} />}>
            Начать бой · инициатива
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
  // The master runs the table: one click back to it from any of their heroes' fights.
  const toTable = party?.role === 'master' && (
    <IconButton
      label="Стол партии"
      size={desktop ? 36 : 40}
      onClick={() => {
        goToCharacterList();
        go({ screen: 'party', partyId: party.id });
      }}
    >
      <IconExit width={20} height={20} />
    </IconButton>
  );
  const stats = (
    <div className="flex flex-wrap items-stretch justify-center gap-3">
      <ResourceStrip character={character} />
      <CombatStats
        character={character}
        initiative={party ? (partyInitiative ?? null) : combat.inCombat ? combat.initiative : null}
        onInitiative={party ? undefined : start}
      />
    </div>
  );
  const hotbar = (
    <div className={locked ? 'ui-turn-locked' : undefined}>
      <Hotbar character={character} inCombat={inCombat} />
    </div>
  );

  if (!desktop)
    return (
      <NarrowHud
        character={character}
        fight={fight}
        toTable={toTable}
        chat={party && <CombatChat party={party} userId={userId} />}
        stats={stats}
        hotbar={hotbar}
        onSheet={() => setViewMode('tabs')}
        onDice={() => dialogs.open({ kind: 'dice' })}
        onOpenSettings={onOpenSettings}
      />
    );

  return (
    <>
      <motion.header
        className="relative z-10 flex h-16 items-center gap-4 px-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTER}
      >
        <Button
          variant="ghost"
          size="sm"
          icon={<IconPrev width={16} height={16} />}
          onClick={() => setViewMode('tabs')}
        >
          Лист
        </Button>
        <div className="min-w-0">
          <div className="ui-display truncate text-xl leading-tight text-ink">{character.name}</div>
          <div className="text-xs text-ink-faint">{character.level} уровень</div>
        </div>
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">{fight}</div>
        <div className="ml-auto flex items-center gap-1">
          <SyncStatus className="mr-2" />
          {toTable}
          <IconButton label="Кубики" onClick={() => dialogs.open({ kind: 'dice' })}>
            <IconDice width={20} height={20} />
          </IconButton>
          <IconButton label="Настройки" onClick={onOpenSettings}>
            <IconSettings width={20} height={20} />
          </IconButton>
        </div>
      </motion.header>

      <motion.aside
        className="absolute right-6 top-20 z-10 w-[22rem]"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...ENTER, delay: 0.1 }}
      >
        <CombatLog character={character} />
      </motion.aside>

      {/* The table's talk, folded to its last lines, opens without leaving the fight. */}
      {party && (
        <motion.div
          className="absolute left-6 top-20 z-20 w-[24rem]"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...ENTER, delay: 0.1 }}
        >
          <CombatChat party={party} userId={userId} />
        </motion.div>
      )}

      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-4 px-6 pb-5"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...ENTER, delay: 0.05 }}
      >
        <VitalBars character={character} />
        {/* The turn's actions stand over the hero's face. */}
        <div className="flex flex-col items-center gap-2">
          <ActionTokens character={character} />
          <Portrait character={character} />
        </div>
        <div className="flex min-w-0 max-w-[76rem] flex-1 flex-col gap-2.5">
          {stats}
          {hotbar}
          <ExperienceBar character={character} />
        </div>
      </motion.div>
    </>
  );
};

/**
 * The fight on a phone or a tablet: the same pieces one under another, the page scrolling. A
 * header keeps the ways out and the tools; the fight's controls stand under it; the log of what
 * happened slides out as a drawer.
 */
const NarrowHud: React.FC<{
  character: Character;
  fight: React.ReactNode;
  toTable: React.ReactNode;
  chat: React.ReactNode;
  stats: React.ReactNode;
  hotbar: React.ReactNode;
  onSheet: () => void;
  onDice: () => void;
  onOpenSettings: () => void;
}> = ({ character, fight, toTable, chat, stats, hotbar, onSheet, onDice, onOpenSettings }) => {
  const [log, setLog] = useState(false);
  return (
    <motion.div
      className="ui-touch relative z-10 flex h-full flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={ENTER}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-line/70 bg-bg/60 px-4 py-1.5 backdrop-blur-sm">
        <IconButton label="К листу" size={40} onClick={onSheet} className="-ml-2 shrink-0">
          <IconPrev width={20} height={20} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="ui-display truncate text-lg leading-tight text-ink">{character.name}</div>
          <div className="text-xs text-ink-faint">{character.level} уровень</div>
        </div>
        <IconButton label="Журнал боя" size={40} onClick={() => setLog(true)} className="shrink-0">
          <IconHistory width={20} height={20} />
        </IconButton>
        {toTable}
        <IconButton label="Кубики" size={40} onClick={onDice} className="shrink-0">
          <IconDice width={20} height={20} />
        </IconButton>
        <IconButton label="Настройки" size={40} onClick={onOpenSettings} className="-mr-2 shrink-0">
          <IconSettings width={20} height={20} />
        </IconButton>
      </header>

      <main className="ui-flow ui-scroll ui-scroll--bare min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-4">
          <div className="flex justify-center">{fight}</div>
          {chat}
          {/* The hero: sanity and health on either side of the face, the turn's actions over it. */}
          <VitalBars
            character={character}
            between={
              <div className="flex flex-col items-center gap-2">
                <ActionTokens character={character} />
                <Portrait character={character} />
              </div>
            }
          />
          {stats}
          {hotbar}
          <ExperienceBar character={character} />
        </div>
      </main>

      <Drawer open={log} onClose={() => setLog(false)} label="Журнал боя" side="right">
        <div className="flex shrink-0 items-center justify-between border-b border-line/70 px-4 py-2">
          <span className="ui-display text-lg text-ink">Журнал боя</span>
          <IconButton label="Свернуть" size={40} onClick={() => setLog(false)} className="-mr-2">
            <IconClose width={18} height={18} />
          </IconButton>
        </div>
        <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <CombatLog character={character} />
        </div>
        <div className="shrink-0 border-t border-line/70 px-4 py-2">
          <SyncStatus />
        </div>
      </Drawer>
    </motion.div>
  );
};

/**
 * Combat: the hero in the scene, what happened lately, and a bar of everything they can do this
 * turn. Laid out like a game HUD rather than a sheet: nothing to scroll, everything a click away.
 */
export const CombatScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const character = useCharacterStore((s) => s.character);
  // While the party's table is open (a session or a fight running) the fight is in the party's world,
  // whatever the hero's own setting; between sessions the hero is on their own, in their own world.
  const { listed, atTable } = useTableOfCharacter(character?.id);
  const setting = listed && atTable ? listed.setting : settingOf(character);
  useDocumentSetting(setting);

  // Messages rise above the combat bar instead of covering it; a narrow screen has the bar in the
  // page's flow, not pinned to the bottom.
  useToastOffset('22rem', useAtLeast('desktop'));
  if (!character) return null;

  return (
    <SheetDialogsProvider>
      <SettingScope setting={setting} className="relative h-screen overflow-clip bg-bg max-lg:h-dvh">
        {/* The setting's atmosphere (a world's own scenery) behind the bar, not the hero's art. */}
        <SettingBackdrop setting={setting} strength={0.85} frame={false} />
        <CombatHud character={character} onOpenSettings={onOpenSettings} />
        <SheetDialogHost />
        <SlotPrompt />
        <AmountPrompt />
        <AmmoPrompt />
        <ConcentrationPrompt />
      </SettingScope>
    </SheetDialogsProvider>
  );
};
