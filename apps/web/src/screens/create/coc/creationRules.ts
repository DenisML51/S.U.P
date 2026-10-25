import {
  CHARACTERISTICS,
  SKILLS,
  SOCIAL_SKILLS,
  skillDef,
  type CharacteristicId,
  type Characteristics,
  type CocEra,
  type OccupationDef,
  type SkillChoice,
} from '@itd/game-logic/coc';

/**
 * The pure rules of investigator creation, apart from the hook that keeps the draft: which skills an
 * occupation gives, what its choice groups offer, how points are counted and set.
 */

export type Pool = 'occupation' | 'personal' | 'archetype';
export type PoolPoints = Record<Pool, Record<string, number>>;

/** The highest a skill may start at. */
export const SKILL_CAP = 99;

/** Picks of a choice group: `{ pick: 2, from: [...] }` keeps which two by its index in the list. */
export type ChoicePicks = Record<number, string[]>;

/** A skill exists in this era (Computer Use and Electronics only today). */
export const skillInEra = (id: string, era: CocEra): boolean => {
  const era2 = skillDef(id)?.skill.era;
  return !era2 || era2 === era;
};

/** The occupation's skills: fixed ones plus what the player picked in its choice groups. */
export function occupationSkills(occupation: OccupationDef | undefined, picks: ChoicePicks): string[] {
  if (!occupation) return [];
  const fixed = occupation.skills.flatMap((choice) => ('skill' in choice ? [choice.skill] : []));
  const chosen = occupation.skills.flatMap((choice, i) =>
    'skill' in choice ? [] : (picks[i] ?? []).slice(0, choice.pick),
  );
  return [...new Set([...fixed, ...chosen, 'credit-rating'])];
}

/** What a choice group offers: its list, the interpersonal skills, or anything. */
export const choiceOptions = (choice: SkillChoice): string[] | 'any' =>
  'from' in choice ? choice.from : 'social' in choice ? SOCIAL_SKILLS : 'any' in choice ? 'any' : [];

/** Every skill points can buy, specialities spelled out, in this era. */
export const anySkillOptions = (era: CocEra): string[] =>
  SKILLS.flatMap((s) =>
    s.noPoints || (s.era && s.era !== era)
      ? []
      : s.specialities
        ? s.specialities.map((sp) => `${s.id}:${sp.id}`)
        : [s.id],
  ).filter((id) => id !== 'credit-rating');

/**
 * The buttons of one choice group: its options in this era, without skills the occupation already
 * gives — fixed ones or picked in another group. What this group has picked always stays.
 */
export function choiceList(
  occupation: OccupationDef,
  index: number,
  picks: ChoicePicks,
  era: CocEra,
): string[] {
  const choice = occupation.skills[index];
  if (!choice || 'skill' in choice) return [];
  const options = choiceOptions(choice);
  const list =
    options === 'any'
      ? anySkillOptions(era)
      : options.flatMap((id) => {
          const specialities = skillDef(id)?.skill.specialities;
          return specialities && !id.includes(':') ? specialities.map((s) => `${id}:${s.id}`) : [id];
        });
  const mine = picks[index] ?? [];
  const elsewhere = new Set(
    occupation.skills.flatMap((c, i) =>
      'skill' in c ? [c.skill] : i === index ? [] : (picks[i] ?? []).slice(0, c.pick),
    ),
  );
  return list.filter((id) => mine.includes(id) || (skillInEra(id, era) && !elsewhere.has(id)));
}

/** The number a choice group goes by on screen: 1, 2… among the choice groups only (fixed skills skipped). */
export function choiceNumbers(occupation: OccupationDef | undefined): Record<number, number> {
  const numbers: Record<number, number> = {};
  let n = 0;
  occupation?.skills.forEach((choice, i) => {
    if (!('skill' in choice)) numbers[i] = ++n;
  });
  return numbers;
}

/** Picks that still hold in this era; the era change drops the rest. */
export function picksInEra(picks: ChoicePicks, era: CocEra): ChoicePicks {
  return Object.fromEntries(
    Object.entries(picks).map(([i, list]) => [i, list.filter((id) => skillInEra(id, era))]),
  );
}

/**
 * The points that count: occupation points only on the occupation's skills, archetype points only
 * for a Pulp hero. Whatever lies elsewhere (a draft from before a change) is left out.
 */
export function countedPoints(points: PoolPoints, ownSkills: string[], pulp: boolean): PoolPoints {
  const own = new Set(ownSkills);
  return {
    occupation: Object.fromEntries(Object.entries(points.occupation).filter(([id]) => own.has(id))),
    personal: points.personal,
    archetype: pulp ? points.archetype : {},
  };
}

/** Occupation points without the skills the occupation no longer gives. */
export function pruneOccupationPoints(points: PoolPoints, ownSkills: string[]): PoolPoints {
  const own = new Set(ownSkills);
  const occupation = Object.fromEntries(Object.entries(points.occupation).filter(([id]) => own.has(id)));
  return Object.keys(occupation).length === Object.keys(points.occupation).length
    ? points
    : { ...points, occupation };
}

/** Points on skills that do not exist in this era, dropped from every pool. */
export function prunePointsToEra(points: PoolPoints, era: CocEra): PoolPoints {
  const keep = (pool: Record<string, number>) =>
    Object.fromEntries(Object.entries(pool).filter(([id]) => skillInEra(id, era)));
  return {
    occupation: keep(points.occupation),
    personal: keep(points.personal),
    archetype: keep(points.archetype),
  };
}

/**
 * The points a pool puts on a skill once the player sets them. Raising is held by what is left in the
 * pool and by the skill cap; lowering only stops at zero, so an overspent pool (INT or EDU re-rolled
 * lower) can be taken back point by point instead of losing the whole skill.
 */
export function nextPoints(args: {
  value: number;
  current: number;
  /** Points of this pool on every other skill. */
  others: number;
  budget: number;
  /** The skill's value without this pool's points on it. */
  without: number;
}): number {
  const value = Math.round(args.value);
  if (value <= args.current) return Math.max(0, value);
  const room = args.budget - args.others;
  const capRoom = SKILL_CAP - args.without;
  return Math.max(args.current, Math.min(value, room, capRoom));
}

/**
 * Characteristics as a Pulp hero has them: the archetype's core characteristic is rolled as
 * (1D6+13)×5 instead of the usual roll (Pulp Cthulhu, "Core Characteristic") — it replaces that
 * value, even a higher one, rather than taking the better of the two.
 */
export function withCore(
  base: Characteristics,
  core: { id: CharacteristicId; value: number } | null,
  pulp: boolean,
): Characteristics {
  if (!pulp || !core) return { ...base };
  return { ...base, [core.id]: core.value };
}

/**
 * Characteristics entered by hand, as rolled on real dice: each within what its dice can give
 * (3D6×5 — 15…90, (2D6+6)×5 — 40…90) and a multiple of 5. The ones that are not.
 */
export function manualOutOfRange(base: Characteristics): CharacteristicId[] {
  return CHARACTERISTICS.filter((c) => {
    const v = base[c.id];
    const min = c.roll === '3d6' ? 15 : 40;
    return v < min || v > 90 || v % 5 !== 0;
  }).map((c) => c.id);
}

/** Skills above the cap: Dodge after DEX, Own Language after EDU, points set earlier. */
export const skillsOverCap = (values: Record<string, number>): string[] =>
  Object.entries(values)
    .filter(([, v]) => v > SKILL_CAP)
    .map(([id]) => id);
