import React from 'react';
import { formatModifier } from '@itd/game-logic';
import type { Ability, Attack, Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { Ledger, LedgerGroup, LedgerRow, MetaLine, MetaValue } from '../../../ui/Ledger';
import { Button } from '../../../ui/primitives';
import { IconDice } from '../../../ui/icons';
import { damageParts, describeDamage } from '../parts/damage';
import { SectionNotes } from '../parts/SectionNotes';
import type { SheetLogic } from '../sheetLogic';
import { useRolls } from '../useRolls';
import { plainText } from '../../../ui/text';

const resourceName = (character: Character, id?: string) => character.resources.find((r) => r.id === id)?.name;

/** Attacks and abilities: what the hero does on their turn, one click from the roll. */
export const ActionsSection: React.FC<{ logic: SheetLogic }> = ({ logic }) => {
  const { character } = logic;
  const performAction = useCharacterStore((s) => s.performAction);
  const logHistory = useCharacterStore((s) => s.logHistory);
  const roll = useRolls();

  const attack = (entry: Attack) => {
    // Pays the ammunition the attack needs; refuses (with a message) when there is none.
    if (entry.usesAmmunition && !performAction({ kind: 'attack', id: entry.id })?.ok) return;
    roll.check(`${entry.name}: попадание`, entry.hitBonus);
    roll.damage(`${entry.name}: урон`, damageParts(entry));
  };

  const activate = (entry: Ability) => {
    // A cost is paid (and logged) by performAction; a free ability is only logged.
    if (entry.resourceId) {
      if (!performAction({ kind: 'ability', id: entry.id })?.ok) return;
    } else {
      logHistory(`Способность: ${entry.name}`);
    }
    roll.damage(entry.name, damageParts(entry));
  };

  const passive = character.abilities.filter((a) => a.actionType === 'passive');
  const active = character.abilities.filter((a) => a.actionType !== 'passive');

  return (
    <div className="grid h-full grid-cols-2 gap-8">
      <div className="flex min-h-0 min-w-0 flex-col gap-5">
        <Ledger title="Атаки" addLabel="Добавить атаку" onAdd={() => logic.openAttackModal()}>
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
                onOpen={() => logic.openAttackView(entry)}
                action={
                  <Button size="row" variant="secondary" icon={<IconDice width={14} height={14} />} onClick={() => attack(entry)}>
                    Атака
                  </Button>
                }
              />
            );
          })}
          {character.attacks.length === 0 && <li className="py-4 text-sm opacity-60">Атак пока нет</li>}
        </Ledger>
        <SectionNotes value={character.attacksNotes} onSave={logic.updateAttacksNotes} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-5">
        <Ledger title="Способности" addLabel="Добавить способность" onAdd={() => logic.openAbilityModal()}>
          {active.map((entry) => {
            const parts = damageParts(entry);
            return (
              <LedgerRow
                key={entry.id}
                title={entry.name}
                meta={
                  <MetaLine
                    parts={[
                      ACTION_TYPES[entry.actionType].short,
                      entry.resourceId && (
                        <>
                          <MetaValue>{entry.resourceCost ?? 1}</MetaValue> {resourceName(character, entry.resourceId) ?? 'ресурс'}
                        </>
                      ),
                      parts.length > 0 && <MetaValue>{describeDamage(parts)}</MetaValue>,
                      plainText(entry.effect || entry.description),
                    ]}
                  />
                }
                onOpen={() => logic.openAbilityView(entry)}
                action={
                  <Button size="row" variant="secondary" onClick={() => activate(entry)}>
                    Использовать
                  </Button>
                }
              />
            );
          })}
          {passive.length > 0 && <LedgerGroup>Действуют всегда</LedgerGroup>}
          {passive.map((entry) => (
            <LedgerRow key={entry.id} title={entry.name} meta={plainText(entry.effect || entry.description)} onOpen={() => logic.openAbilityView(entry)} />
          ))}
          {character.abilities.length === 0 && <li className="py-4 text-sm opacity-60">Способностей пока нет</li>}
        </Ledger>
        <SectionNotes value={character.abilitiesNotes} onSave={logic.updateAbilitiesNotes} />
      </div>
    </div>
  );
};
