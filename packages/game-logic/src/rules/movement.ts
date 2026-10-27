import type { Character } from '@itd/schema';
import { equippedArmor, isShield, wearsHeavyArmor } from './armor';
import { exhaustionLevel } from './d20';

type Mover = Pick<Character, 'speed' | 'exhaustion' | 'conditions' | 'inventory'> &
  Partial<Pick<Character, 'speedBonus' | 'movement' | 'darkvision'>>;

const wearsArmorOrShield = (character: Pick<Character, 'inventory'>): boolean =>
  !!equippedArmor(character.inventory) || character.inventory.some((item) => item.equipped && isShield(item));

/** One term of a walking speed, written as the sheet shows it: "основа 30", "без доспехов +15". */
export interface SpeedPart {
  text: string;
  value: number;
}

/**
 * Walking speed and its terms: the sheet's speed, the bonuses the gear allows now (Unarmored
 * Movement without armour or a shield, Fast Movement out of heavy armour), −5 feet a level of
 * exhaustion. Never below 0.
 */
export function speedBreakdown(character: Mover): { parts: SpeedPart[]; total: number } {
  const bonus = character.speedBonus;
  const parts: SpeedPart[] = [{ text: `основа ${character.speed}`, value: character.speed }];
  if (bonus?.unarmored && !wearsArmorOrShield(character)) parts.push({ text: `без доспехов +${bonus.unarmored}`, value: bonus.unarmored });
  if (bonus?.noHeavyArmor && !wearsHeavyArmor(character)) {
    parts.push({ text: `без тяжёлых доспехов +${bonus.noHeavyArmor}`, value: bonus.noHeavyArmor });
  }
  const tired = exhaustionLevel(character);
  if (tired > 0) parts.push({ text: `истощение −${5 * tired}`, value: -5 * tired });
  return { parts, total: Math.max(0, parts.reduce((sum, part) => sum + part.value, 0)) };
}

/** Walking speed now, in feet. */
export const speedOf = (character: Mover): number => speedBreakdown(character).total;

export type MovementMode = 'climb' | 'swim' | 'fly';
const MOVEMENT_MODES: MovementMode[] = ['climb', 'swim', 'fly'];

/** "лазание 40": a movement for people. */
const movementText = (mode: MovementMode, feet: number): string =>
  mode === 'climb' ? `лазание ${feet}` : mode === 'swim' ? `плавание ${feet}` : `полёт ${feet}`;

/** Climbing, swimming and flying speeds in feet; one equal to the walking speed follows it. */
export function movementOf(character: Mover): { mode: MovementMode; feet: number; text: string }[] {
  const walking = speedOf(character);
  return MOVEMENT_MODES.flatMap((mode) => {
    const given = character.movement?.[mode];
    if (given === undefined) return [];
    const feet = given === 0 ? walking : given;
    return [{ mode, feet, text: movementText(mode, feet) }];
  });
}

/**
 * What the speed of a sheet says on hover, in feet: its terms when there is more than the base,
 * other movement and darkvision ("Скорость, фт: основа 30 · без доспехов +10 · лазание 40").
 */
export function speedHint(character: Mover): string {
  const { parts } = speedBreakdown(character);
  const terms = [
    ...(parts.length > 1 ? parts.map((p) => p.text) : []),
    ...movementOf(character).map((m) => m.text),
    ...(character.darkvision ? [`тёмное зрение ${character.darkvision}`] : []),
  ];
  return terms.length > 0 ? `Скорость, фт: ${terms.join(' · ')}` : 'Скорость, фт';
}
