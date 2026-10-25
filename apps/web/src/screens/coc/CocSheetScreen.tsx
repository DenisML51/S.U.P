import React, { useCallback } from 'react';
import type { HistoryEvent } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { SyncStatus } from '../../ui/SyncStatus';
import { Button } from '../../ui/primitives';
import { useTurnLock } from '../party/useTurnLock';
import { SheetDialogsProvider, useSheetDialogs } from '../sheet/dialogs/context';
import { SheetDialogHost } from '../sheet/dialogs/SheetDialogHost';
import { JournalSection } from '../sheet/sections/JournalSection';
import { CocSheetProvider, type RollRecord, type UpdateOptions } from './context';
import { CocSheetView } from './CocSheet';
import { CocCombatView } from './CocCombat';
import { RollResult } from './parts';

/** The view with the sheet's shared dialogs (the dice tray, the profile with pictures) at hand. */
const SheetWithDialogs: React.FC<
  Omit<React.ComponentProps<typeof CocSheetView>, 'onDice' | 'onProfile' | 'footer'>
> = (props) => {
  const dialogs = useSheetDialogs();
  return (
    <CocSheetView
      {...props}
      onDice={() => dialogs.open({ kind: 'dice' })}
      onProfile={() => dialogs.open({ kind: 'profile' })}
      footer={<SyncStatus />}
    />
  );
};

/** The fight, with the dice tray at hand. */
const CombatWithDialogs: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const dialogs = useSheetDialogs();
  return <CocCombatView onOpenSettings={onOpenSettings} onDice={() => dialogs.open({ kind: 'dice' })} />;
};

const renderRoll = (record: RollRecord) => <RollResult record={record} />;

/** The investigator's sheet in the app: the kit's view on the open character of the store. */
export const CocSheetScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const character = useCharacterStore((s) => s.character);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const viewMode = useCharacterStore((s) => s.viewMode);
  const setting = settingOf(character);
  useDocumentSetting(setting);
  useTurnLock(character?.id);
  const turnLock = useCharacterStore((s) => s.turnLock);
  const update = useCallback(
    (edit: (doc: Character) => Character, log?: HistoryEvent, options?: UpdateOptions) =>
      updateCharacter(edit, { log, quiet: options?.quiet }),
    [updateCharacter],
  );

  if (!character) return null;
  if (!character.coc)
    return (
      <SettingScope setting={setting} className="grid h-screen place-items-center bg-bg px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="ui-display text-2xl">{character.name}</h1>
          <p className="text-ink-muted">
            Лист сыщика пуст: у героя правил «Зова Ктулху» нет характеристик и навыков. Обычно так
            бывает с героем, созданным не до конца или в старой версии приложения. Создайте сыщика
            заново или вернитесь к списку.
          </p>
          <Button variant="primary" onClick={goToCharacterList}>
            К выбору героя
          </Button>
        </div>
      </SettingScope>
    );
  return (
    <SheetDialogsProvider>
      <SettingScope setting={setting} className="h-screen overflow-clip bg-bg">
        {/* One provider per investigator: the master's screen following the turn to another hero
            starts clean, without the last hero's roll, round or picks. */}
        <CocSheetProvider
          key={character.id}
          character={character}
          update={update}
          renderRoll={renderRoll}
          turnLock={turnLock}
        >
          {viewMode === 'hotbar' ? (
            <CombatWithDialogs onOpenSettings={onOpenSettings} />
          ) : (
            <SheetWithDialogs
              onBack={goToCharacterList}
              onCombat={() => setViewMode('hotbar')}
              onSettings={onOpenSettings}
              journal={<JournalSection character={character} />}
            />
          )}
        </CocSheetProvider>
        <SheetDialogHost />
      </SettingScope>
    </SheetDialogsProvider>
  );
};
