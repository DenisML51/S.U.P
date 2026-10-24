import React, { useEffect } from 'react';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { EntryPresentationScope, useSheetDialogs, type EntryKind } from './dialogs/context';
import { EntryCard } from './dialogs/SheetDialogHost';

const entriesOf = (character: Character, kind: EntryKind): { id: string }[] =>
  ({
    attack: character.attacks,
    ability: character.abilities,
    spell: character.spells,
    item: character.inventory,
    trait: character.traits,
    resource: character.resources,
  })[kind];

/**
 * The card of the entry chosen in a list, rendered as the details pane. Editing opens the card's
 * form as a dialog over it, so the pane stays in place. Another entry gets a fresh card in the
 * same frame: only the contents change.
 */
export const EntryPane: React.FC = () => {
  const character = useCharacterStore((s) => s.character);
  const { selected, clearSelection, open } = useSheetDialogs();
  const exists = !!selected && !!character && entriesOf(character, selected.kind).some((e) => e.id === selected.id);

  // A deleted entry takes its card with it.
  useEffect(() => {
    if (selected && !exists) clearSelection();
  }, [selected, exists, clearSelection]);

  if (!selected || !exists) return null;
  return (
    <EntryPresentationScope value={{ mode: 'pane', edit: () => open({ kind: selected.kind, id: selected.id, edit: true }) }}>
      <EntryCard key={`${selected.kind}:${selected.id}`} kind={selected.kind} id={selected.id} open onClose={clearSelection} />
    </EntryPresentationScope>
  );
};
