import React, { useCallback } from 'react';
import type { HistoryEvent } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { settingOf } from '../../ui/theme/settings';
import { SyncStatus } from '../../ui/SyncStatus';
import { useTurnLock } from '../party/useTurnLock';
import { SheetDialogsProvider } from '../sheet/dialogs/context';
import { JournalSection } from '../sheet/sections/JournalSection';
import { CocSheetProvider } from './context';
import { CocSheetView } from './CocSheet';

/** The investigator's sheet in the app: the kit's view on the open character of the store. */
export const CocSheetScreen: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const character = useCharacterStore((s) => s.character);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const setting = settingOf(character);
  useDocumentSetting(setting);
  useTurnLock(character?.id);
  const update = useCallback(
    (edit: (doc: Character) => Character, log?: HistoryEvent) => updateCharacter(edit, log ? { log } : undefined),
    [updateCharacter],
  );

  if (!character?.coc) return null;
  return (
    <SheetDialogsProvider>
      <SettingScope setting={setting} className="h-screen overflow-clip bg-bg">
        <CocSheetProvider character={character} update={update}>
          <CocSheetView
            onBack={goToCharacterList}
            onCombat={() => setViewMode('hotbar')}
            onSettings={onOpenSettings}
            journal={<JournalSection character={character} />}
            footer={<SyncStatus />}
          />
        </CocSheetProvider>
      </SettingScope>
    </SheetDialogsProvider>
  );
};
