import React from 'react';
import { formatModifier } from '@itd/game-logic';
import type { Ability, Attack, Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { Button, IconButton, SectionTitle } from '../../../ui/primitives';
import { IconDice, IconPlus } from '../../../ui/icons';
import { EntryRow, MetaLine, MetaValue } from '../parts/EntryRow';
import { SectionNotes } from '../parts/SectionNotes';
import type { SheetLogic } from '../sheetLogic';
import { useRolls } from '../useRolls';

const damageParts = (entry: { damage?: string; damageType?: string; damageComponents?: { damage: string; type: string }[] }) =>
  entry.damageComponents && entry.damageComponents.length > 0
    ? entry.damageComponents
    : entry.damage
      ? [{ damage: entry.damage, type: entry.damageType ?? '' }]
      : [];

const describeDamage = (parts: { damage: string; type: string }[]) =>
  parts.map((p) => `${p.damage}${p.type ? ` ${p.type.toLowerCase()}` : ''}`).join(' + ');

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
    <div className="grid h-full grid-cols-2 gap-10">
      <section className="flex min-h-0 flex-col">
        <SectionTitle
          className="mb-3"
          action={
            <IconButton label="Добавить атаку" onClick={() => logic.openAttackModal()}>
              <IconPlus width={20} height={20} />
            </IconButton>
          }
        >
          Атаки
        </SectionTitle>
        <ul className="ui-scroll min-h-0 flex-1 overflow-y-auto">
          {character.attacks.map((entry) => {
            const type = ACTION_TYPES[entry.actionType];
            const parts = damageParts(entry);
            return (
              <EntryRow
                key={entry.id}
                tone={type.token}
                title={entry.name}
                meta={
                  <MetaLine
                    parts={[
                      <>
                        <MetaValue>{formatModifier(entry.hitBonus)}</MetaValue> к попаданию
                      </>,
                      parts.length > 0 && <MetaValue>{describeDamage(parts)}</MetaValue>,
                      type.short,
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
          {character.attacks.length === 0 && <li className="py-6 text-sm text-ink-faint">Атак пока нет</li>}
        </ul>
        <div className="mt-4">
          <SectionNotes value={character.attacksNotes} onSave={logic.updateAttacksNotes} />
        </div>
      </section>

      <section className="flex min-h-0 flex-col">
        <SectionTitle
          className="mb-3"
          action={
            <IconButton label="Добавить способность" onClick={() => logic.openAbilityModal()}>
              <IconPlus width={20} height={20} />
            </IconButton>
          }
        >
          Способности
        </SectionTitle>
        <ul className="ui-scroll min-h-0 flex-1 overflow-y-auto">
          {active.map((entry) => {
            const type = ACTION_TYPES[entry.actionType];
            const parts = damageParts(entry);
            return (
              <EntryRow
                key={entry.id}
                tone={type.token}
                title={entry.name}
                meta={
                  <MetaLine
                    parts={[
                      type.short,
                      entry.resourceId && (
                        <>
                          <MetaValue>{entry.resourceCost ?? 1}</MetaValue> {resourceName(character, entry.resourceId) ?? 'ресурс'}
                        </>
                      ),
                      parts.length > 0 && <MetaValue>{describeDamage(parts)}</MetaValue>,
                      entry.effect || entry.description,
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
          {passive.length > 0 && (
            <li className="pb-1 pt-4 text-[11px] uppercase tracking-[0.16em] text-ink-faint">Действуют всегда</li>
          )}
          {passive.map((entry) => (
            <EntryRow
              key={entry.id}
              tone={ACTION_TYPES.passive.token}
              title={entry.name}
              meta={entry.effect || entry.description}
              onOpen={() => logic.openAbilityView(entry)}
            />
          ))}
          {character.abilities.length === 0 && <li className="py-6 text-sm text-ink-faint">Способностей пока нет</li>}
        </ul>
        <div className="mt-4">
          <SectionNotes value={character.abilitiesNotes} onSave={logic.updateAbilitiesNotes} />
        </div>
      </section>
    </div>
  );
};
