import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';

/** Free-text fields of the sheet: notes of each section, the biography, languages. */
export type SheetTextField = {
  [K in keyof Character]-?: Character[K] extends string ? K : never;
}[keyof Character];

/** Saver for a free-text field: `save('attacksNotes')(value)`. */
export function useSheetText() {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  return (field: SheetTextField) => (value: string) => updateCharacter((doc) => ({ ...doc, [field]: value }));
}
