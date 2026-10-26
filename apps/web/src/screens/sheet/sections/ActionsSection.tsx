import React from 'react';
import { formatModifier, isActiveFeature, isUsable } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { Ledger, LedgerGroup, LedgerRow, MetaLine, MetaValue } from '../../../ui/Ledger';
import { Button } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';
import { damageParts, describeDamage } from '../parts/damage';
import { SectionNotes } from '../parts/EditableText';
import { useSheetText } from '../useSheetText';
import { ConcentrationMark } from '../Concentration';
import { useActs } from '../useActs';
import { useSheetDialogs } from '../dialogs/context';
import { SectionAside, SectionList } from '../SectionAside';
import { plainText } from '../../../ui/text';

const resourceName = (character: Character, id?: string) =>
  character.resources.find((r) => r.id === id)?.name;

/** Attacks and abilities: what the hero does on their turn, one click from the roll. */
export const ActionsSection: React.FC<{ character: Character }> = ({ character }) => {
  const saveText = useSheetText();
  const { attack, activate } = useActs();
  const dialogs = useSheetDialogs();

  const passive = character.abilities.filter((a) => !isUsable(a));
  const active = character.abilities.filter(isUsable);

  return (
    <div className="flex h-full gap-8 max-lg:flex-col">
      <SectionList maxWidth={1180}>
        <div className="ui-section__columns grid min-h-0 flex-1 grid-cols-2 gap-8">
          <div className="flex min-h-0 min-w-0 flex-col gap-5">
            <Ledger title="Атаки" addLabel="Добавить атаку" onAdd={() => dialogs.open({ kind: 'attack' })}>
              {character.attacks.map((entry) => {
                const parts = damageParts(entry);
                return (
                  <LedgerRow
                    key={entry.id}
                    title={entry.name}
                    meta={
                      <MetaLine
                        parts={[
                          <>
                            <MetaValue>{formatModifier(entry.hitBonus)}</MetaValue> к попаданию
                          </>,
                          parts.length > 0 && <MetaValue>{describeDamage(parts)}</MetaValue>,
                          ACTION_TYPES[entry.actionType].short,
                          entry.usesAmmunition && `расход боеприпасов: ${entry.ammunitionCost ?? 1}`,
                        ]}
                      />
                    }
                    selected={dialogs.isSelected('attack', entry.id)}
                    onOpen={() => dialogs.openEntry('attack', entry.id)}
                    action={
                      <Button
                        size="row"
                        variant="secondary"
                        icon={<IconDice width={14} height={14} />}
                        onClick={() => attack(entry)}
                      >
                        Атака
                      </Button>
                    }
                  />
                );
              })}
              {character.attacks.length === 0 && <li className="py-4 text-sm opacity-60">Атак пока нет</li>}
            </Ledger>
            <SectionNotes value={character.attacksNotes} onSave={saveText('attacksNotes')} />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-5">
            <Ledger
              title="Способности"
              addLabel="Добавить способность"
              onAdd={() => dialogs.open({ kind: 'ability' })}
            >
              {active.map((entry) => {
                const parts = damageParts(entry);
                return (
                  <LedgerRow
                    key={entry.id}
                    title={
                      <>
                        {entry.name}
                        {entry.concentration && <ConcentrationMark />}
                      </>
                    }
                    meta={
                      <MetaLine
                        parts={[
                          entry.actionType === 'passive' ? 'без действия' : ACTION_TYPES[entry.actionType].short,
                          // A conversion (Font of Magic) has no price of its own; a chosen cost shows its range.
                          entry.resourceId && !entry.convert && (
                            <>
                              <MetaValue>{entry.resourceCostMax ? `${entry.resourceCost ?? 1}–${entry.resourceCostMax}` : (entry.resourceCost ?? 1)}</MetaValue>{' '}
                              {resourceName(character, entry.resourceId) ?? 'ресурс'}
                            </>
                          ),
                          parts.length > 0 && <MetaValue>{describeDamage(parts)}</MetaValue>,
                          plainText(entry.effect || entry.description),
                        ]}
                      />
                    }
                    selected={dialogs.isSelected('ability', entry.id)}
                    onOpen={() => dialogs.openEntry('ability', entry.id)}
                    action={
                      <Button size="row" variant="secondary" onClick={() => activate(entry)}>
                        {isActiveFeature(character, entry.id) ? 'Прекратить' : 'Использовать'}
                      </Button>
                    }
                  />
                );
              })}
              {passive.length > 0 && <LedgerGroup>Действуют всегда</LedgerGroup>}
              {passive.map((entry) => (
                <LedgerRow
                  key={entry.id}
                  title={entry.name}
                  meta={plainText(entry.effect || entry.description)}
                  selected={dialogs.isSelected('ability', entry.id)}
                  onOpen={() => dialogs.openEntry('ability', entry.id)}
                />
              ))}
              {character.abilities.length === 0 && (
                <li className="py-4 text-sm opacity-60">Способностей пока нет</li>
              )}
            </Ledger>
            <SectionNotes value={character.abilitiesNotes} onSave={saveText('abilitiesNotes')} />
          </div>
        </div>
      </SectionList>
      <SectionAside />
    </div>
  );
};
