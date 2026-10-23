import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CONDITIONS, formatModifier, initiativeModifier, resetTurn } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { Button, IconButton, Panel, cx } from '../../ui/primitives';
import { IconDice, IconPrev, IconSettings } from '../../ui/icons';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { SheetDialogsProvider, useSheetDialogs } from '../sheet/dialogs/context';
import { SheetDialogHost } from '../sheet/dialogs/SheetDialogHost';
import { foldRepeats } from '../sheet/parts/history';
import { ResourceList, StatusCluster } from '../sheet/parts/StatusCluster';
import { useRolls } from '../sheet/useRolls';
import { ActionBar } from './ActionBar';

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
          className="text-ink-muted"
          style={{ opacity: 0.35 + (0.65 * (index + 1)) / recent.length }}
        >
          {entry.message}
          {count > 1 && <span className="ml-2 tabular-nums opacity-60">×{count}</span>}
        </li>
      ))}
    </ol>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; onClick?: () => void; hint?: string }> = ({
  label,
  value,
  onClick,
  hint,
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={hint}
      className={cx(
        'flex flex-col items-center py-1.5',
        onClick && 'transition-colors hover:text-frame-bright',
      )}
    >
      <span className="ui-display ui-numeric text-xl leading-none">{value}</span>
      <span className="mt-1 text-[11px] text-ink-faint">{label}</span>
    </Tag>
  );
};

const CombatHud: React.FC<{ character: Character; onOpenSettings: () => void }> = ({
  character,
  onOpenSettings,
}) => {
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const dialogs = useSheetDialogs();
  const roll = useRolls();
  const [combat, setCombat] = useCombatState(character.id);
  const conditions = character.conditions.map((id) => CONDITIONS.find((c) => c.id === id)?.name ?? id);

  const start = () => {
    const initiative = roll.check('Инициатива', initiativeModifier(character));
    updateCharacter((doc) => resetTurn(doc), { log: { message: 'Бой начался', type: 'other' } });
    setCombat({ inCombat: true, round: 1, initiative });
  };
  const endTurn = () => {
    updateCharacter((doc) => resetTurn(doc));
    setCombat({ ...combat, round: combat.round + 1 });
  };
  const finish = () => {
    updateCharacter((doc) => resetTurn(doc), { log: { message: 'Бой окончен', type: 'other' } });
    setCombat(IDLE);
  };
  const openDice = () => window.dispatchEvent(new CustomEvent('open-dice-hub', { detail: {} }));

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
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-4">
          {combat.inCombat ? (
            <>
              <span className="ui-display text-lg text-frame-bright">Раунд {combat.round}</span>
              {combat.initiative !== null && (
                <span className="text-sm text-ink-muted">инициатива {combat.initiative}</span>
              )}
              <Button variant="ghost" size="sm" onClick={finish}>
                Завершить бой
              </Button>
            </>
          ) : (
            <Button variant="primary" size="md" onClick={start} icon={<IconDice width={18} height={18} />}>
              Начать бой
            </Button>
          )}
        </div>
        <div className="ml-auto flex gap-1">
          <IconButton label="Кубики" onClick={openDice}>
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

      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-[330px_minmax(0,1fr)_300px] items-end gap-5 px-6 pb-5"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...ENTER, delay: 0.05 }}
      >
        <div className="space-y-2">
          {conditions.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode('tabs')}
              className="block text-left text-sm text-warning"
              title="Состояния — во вкладке «Тело»"
            >
              {conditions.join(' · ')}
            </button>
          )}
          <StatusCluster character={character} className="bg-surface/90" />
        </div>
        <ActionBar character={character} inCombat={combat.inCombat} onEndTurn={endTurn} />
        <Panel ornate={false} className="space-y-2 px-4 py-3">
          <div className="grid grid-cols-4 divide-x divide-line/60">
            <Stat
              label="КБ"
              value={character.armorClass}
              onClick={() => dialogs.open({ kind: 'armor' })}
              hint="Защита"
            />
            <Stat label="Иниц." value={formatModifier(initiativeModifier(character))} />
            <Stat label="Скор." value={character.speed} />
            <Stat label="СЛ" value={character.spellcastingDifficultyValue ?? '—'} />
          </div>
          <div className="ui-scroll max-h-[11rem] overflow-y-auto pr-1">
            <ResourceList character={character} />
          </div>
        </Panel>
      </motion.div>
    </>
  );
};

/**
 * Combat: the hero in the scene, what happened lately, and a bar of everything they can do this
 * turn. Laid out like a game HUD rather than a sheet: nothing to scroll, everything a click away.
 */
export const CombatScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const character = useCharacterStore((s) => s.character);
  const setting = settingOf(character);
  useDocumentSetting(setting);

  // Messages rise above the combat bar instead of covering it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-offset', '17rem');
    return () => {
      root.style.removeProperty('--toast-offset');
    };
  }, []);
  if (!character) return null;

  return (
    <SheetDialogsProvider>
      <SettingScope setting={setting} className="relative h-screen overflow-hidden bg-bg">
        <motion.div
          className="pointer-events-none absolute inset-y-0 left-0 w-[60%]"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            maskImage:
              'linear-gradient(90deg, #000 30%, transparent), linear-gradient(0deg, transparent 20%, #000 60%)',
            maskComposite: 'intersect',
          }}
        >
          <CharacterArt
            source={character}
            kind="full"
            className="h-full w-full opacity-60"
            position="50% 20%"
          />
        </motion.div>
        <CombatHud character={character} onOpenSettings={onOpenSettings} />
        <SheetDialogHost />
      </SettingScope>
    </SheetDialogsProvider>
  );
};
