import type { useCharacterSheetLogic } from '../../components/CharacterSheet/CharacterSheetLogic';

/** The sheet's actions and modal state while a character is open (the hook returns `{ character: null }` otherwise). */
export type SheetLogic = Extract<ReturnType<typeof useCharacterSheetLogic>, { updateCharacter: unknown }>;
