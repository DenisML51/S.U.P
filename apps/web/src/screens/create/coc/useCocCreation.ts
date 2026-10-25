import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ARCHETYPE_POINTS,
  CHARACTERISTICS,
  POINT_BUY_TOTAL,
  SOCIAL_SKILLS,
  ageRules,
  archetypeDef,
  createInvestigator,
  derivedOf,
  eduImprovement,
  formulaPoints,
  occupationDef,
  personalPoints,
  rollCharacteristics,
  rollCoreCharacteristic,
  rollLuck,
  skillBase,
  type CharacteristicId,
  type Characteristics,
  type CocEra,
  type CocVariant,
  type OccupationDef,
  type SkillChoice,
} from '@itd/game-logic/coc';
import type { CharacterImages, CocSheet, Setting } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useClearDraft, useDraftState } from '../useDraftState';

export type CharacteristicMethod = 'roll' | 'pointBuy' | 'manual';
type Pool = 'occupation' | 'personal' | 'archetype';

/** The highest a skill may start at. */
export const SKILL_CAP = 99;

const EMPTY: Characteristics = { str: 0, con: 0, siz: 0, dex: 0, app: 0, int: 0, pow: 0, edu: 0 };
const POINT_BUY_START: Characteristics = {
  str: 50,
  con: 50,
  siz: 60,
  dex: 50,
  app: 50,
  int: 60,
  pow: 50,
  edu: 60,
};

/** Picks of a choice group: `{ pick: 2, from: [...] }` keeps which two by its index in the list. */
export type ChoicePicks = Record<number, string[]>;

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

/**
 * A Call of Cthulhu investigator in the making, kept in the draft so a reload returns to it: the
 * rules (classic or Pulp, era), characteristics and age, occupation and skill points, Pulp archetype
 * and talents, backstory, gear and identity. Every derived number is computed from these.
 */
export function useCocCreation(setting: Setting, onCreated: () => void) {
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const clearDraft = useClearDraft();

  const [variant, setVariant] = useDraftState<CocVariant>('coc.variant', 'classic');
  const [editionChosen, setEditionChosen] = useDraftState('coc.editionChosen', false);
  const [era, setEra] = useDraftState<CocEra>('coc.era', '1920s');
  const [archetype, setArchetypeId] = useDraftState<string | undefined>('coc.archetype', undefined);
  const [core, setCore] = useDraftState<{ id: CharacteristicId; value: number } | null>('coc.core', null);
  const [method, setMethodState] = useDraftState<CharacteristicMethod>('coc.method', 'roll');
  const [base, setBase] = useDraftState<Characteristics>('coc.base', EMPTY);
  const [luckRolls, setLuckRolls] = useDraftState<number[]>('coc.luck', []);
  const [age, setAgeState] = useDraftState('coc.age', 25);
  const [ageLoss, setAgeLoss] = useDraftState<Partial<Record<CharacteristicId, number>>>('coc.ageLoss', {});
  const [eduGains, setEduGains] = useDraftState<number[] | null>('coc.eduGains', null);
  const [occupation, setOccupationId] = useDraftState<string | undefined>('coc.occupation', undefined);
  const [picks, setPicks] = useDraftState<ChoicePicks>('coc.picks', {});
  const [points, setPoints] = useDraftState<Record<Pool, Record<string, number>>>('coc.points', {
    occupation: {},
    personal: {},
    archetype: {},
  });
  const [talents, setTalents] = useDraftState<string[]>('coc.talents', []);
  const [story, setStory] = useDraftState<Partial<CocSheet['backstory']>>('coc.story', {});
  const [residence, setResidence] = useDraftState('coc.residence', '');
  const [birthplace, setBirthplace] = useDraftState('coc.birthplace', '');
  const [weapons, setWeapons] = useDraftState<string[]>('coc.weapons', []);
  const [name, setName] = useDraftState('name', '');
  const [images, setImages] = useDraftState<CharacterImages>('images', {});
  const [creating, setCreating] = useState(false);

  const pulp = variant === 'pulp';
  const archetypeInfo = pulp ? archetypeDef(archetype) : undefined;
  const occupationInfo = occupationDef(occupation);
  const rules = ageRules(age);
  const rolled = CHARACTERISTICS.every((c) => base[c.id] > 0);
  /** The edition counts as chosen once picked, or once later steps were taken (a draft from before the flag). */
  const editionPicked = editionChosen || rolled || !!archetype || !!occupation;

  /** Characteristics after the archetype's core, age and EDU checks. */
  const characteristics = useMemo<Characteristics>(() => {
    const c = { ...base };
    if (pulp && core) c[core.id] = Math.max(c[core.id], core.value);
    // Nothing rolled yet stays empty: age takes from what is there.
    const lose = (id: CharacteristicId, by: number) => {
      if (c[id] > 0) c[id] = Math.max(1, c[id] - by);
    };
    for (const id of Object.keys(ageLoss) as CharacteristicId[]) lose(id, ageLoss[id] ?? 0);
    lose('app', rules.appLoss);
    if (rules.youth) lose('edu', 5);
    if (c.edu > 0) c.edu = Math.min(99, c.edu + (eduGains ?? []).reduce((sum, gain) => sum + gain, 0));
    return c;
  }, [base, pulp, core, ageLoss, rules.appLoss, rules.youth, eduGains]);

  const luck = luckRolls.length === 0 ? 0 : rules.youth ? Math.max(...luckRolls) : luckRolls[0]!;
  const ownSkills = occupationSkills(occupationInfo, picks);

  const budgets = {
    occupation: occupationInfo ? formulaPoints(occupationInfo.points, characteristics) : 0,
    personal: personalPoints(characteristics),
    archetype: pulp ? ARCHETYPE_POINTS : 0,
  };
  const spent = (pool: Pool) => Object.values(points[pool]).reduce((sum, n) => sum + n, 0);
  const remaining = {
    occupation: budgets.occupation - spent('occupation'),
    personal: budgets.personal - spent('personal'),
    archetype: budgets.archetype - spent('archetype'),
  };

  /** A skill's value as allocated: base plus the points of every pool (personal points go anywhere). */
  const skillValue = (id: string) =>
    skillBase(id, characteristics) +
    (points.occupation[id] ?? 0) +
    (points.personal[id] ?? 0) +
    (points.archetype[id] ?? 0);
  const creditRating = skillValue('credit-rating');

  const allocated = useMemo(() => {
    const ids = new Set([
      ...Object.keys(points.occupation),
      ...Object.keys(points.personal),
      ...Object.keys(points.archetype),
    ]);
    return Object.fromEntries(
      [...ids].map((id) => [id, skillValue(id)]).filter(([, v]) => (v as number) > 0),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- skillValue reads these
  }, [points, characteristics]);

  const ageSpent = (['str', 'con', 'dex'] as const).reduce((sum, id) => sum + (ageLoss[id] ?? 0), 0);
  const youthSpent = (ageLoss.str ?? 0) + (ageLoss.siz ?? 0);

  const issues = {
    rules: editionPicked ? [] : ['Редакция'],
    archetype: pulp
      ? [...(archetypeInfo ? [] : ['Архетип']), ...(core ? [] : ['Основная характеристика'])]
      : [],
    characteristics: [
      ...(rolled ? [] : ['Характеристики']),
      ...(method === 'pointBuy' &&
      rolled &&
      CHARACTERISTICS.reduce((sum, c) => sum + base[c.id], 0) !== POINT_BUY_TOTAL
        ? ['Очки характеристик']
        : []),
      ...(luckRolls.length ? [] : ['Удача']),
    ],
    age: [
      ...(rules.youth
        ? youthSpent === 5
          ? []
          : ['Потеря СИЛ/ТЕЛ']
        : ageSpent === rules.physicalLoss
          ? []
          : ['Потеря СИЛ/ВЫН/ЛВК']),
      ...(rules.eduChecks > 0 && !eduGains ? ['Проверки ОБР'] : []),
      ...(rules.youth && luckRolls.length < 2 ? ['Второй бросок удачи'] : []),
    ],
    occupation: [
      ...(occupationInfo ? [] : ['Профессия']),
      ...(occupationInfo?.skills.flatMap((choice, i) =>
        'skill' in choice || (picks[i]?.length ?? 0) >= choice.pick ? [] : [`Выбор навыков ${i + 1}`],
      ) ?? []),
    ],
    skills: [
      ...(remaining.occupation === 0 ? [] : ['Очки профессии']),
      ...(remaining.personal === 0 ? [] : ['Личные очки']),
      ...(pulp && remaining.archetype !== 0 ? ['Очки архетипа'] : []),
      ...(occupationInfo &&
      (creditRating < occupationInfo.creditRating[0] || creditRating > occupationInfo.creditRating[1])
        ? ['Средства']
        : []),
    ],
    talents: pulp && talents.length !== (archetypeInfo?.talents ?? 2) ? ['Таланты'] : [],
    story: [] as string[],
    gear: [] as string[],
    identity: name.trim() ? [] : ['Имя'],
  };

  const build = {
    ruleset: 'coc7' as const,
    variant,
    era,
    occupation: occupation ?? '',
    archetype: pulp ? archetype : undefined,
    talents: pulp ? talents : [],
    age,
  };

  const preview = useMemo(
    () =>
      createInvestigator({
        name: name.trim() || 'Безымянный',
        build,
        characteristics,
        luck,
        skills: allocated,
        occupationSkills: ownSkills,
        weapons,
        residence,
        birthplace,
        backstory: story,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build is rebuilt from these
    [
      name,
      variant,
      era,
      occupation,
      archetype,
      talents,
      age,
      characteristics,
      luck,
      allocated,
      weapons,
      residence,
      birthplace,
      story,
    ],
  );

  const create = async () => {
    if (Object.values(issues).some((list) => list.length > 0)) return;
    setCreating(true);
    try {
      await createCharacter({
        ...preview,
        name: name.trim(),
        setting,
        images: images.full || images.portrait ? images : undefined,
      });
      clearDraft();
      onCreated();
    } catch {
      toast.error('Не удалось создать сыщика');
      setCreating(false);
    }
  };

  /** Points of one pool on one skill, kept within the pool and the skill cap. */
  const setPoint = (pool: Pool, id: string, value: number) =>
    setPoints((all) => {
      const others = Object.entries(all[pool]).reduce((sum, [key, n]) => (key === id ? sum : sum + n), 0);
      const room = budgets[pool] - others;
      const current = all[pool][id] ?? 0;
      const capRoom = SKILL_CAP - (skillValue(id) - current);
      const next = Math.max(0, Math.min(Math.round(value), room, capRoom));
      const pool2 = { ...all[pool], [id]: next };
      if (next === 0) delete pool2[id];
      return { ...all, [pool]: pool2 };
    });

  return {
    variant,
    editionChosen: editionPicked,
    setVariant: (v: CocVariant) => {
      setVariant(v);
      setEditionChosen(true);
      if (v === 'classic') setTalents([]);
    },
    era,
    setEra,
    pulp,
    archetype,
    archetypeInfo,
    setArchetype: (id: string) => {
      if (id !== archetype) {
        setArchetypeId(id);
        setCore(null);
        setTalents([]);
        setPoints((p) => ({ ...p, archetype: {} }));
      }
    },
    core,
    rollCore: (id: CharacteristicId) => setCore({ id, value: rollCoreCharacteristic() }),
    method,
    setMethod: (m: CharacteristicMethod) => {
      setMethodState(m);
      setBase(m === 'pointBuy' ? POINT_BUY_START : m === 'manual' ? { ...POINT_BUY_START } : EMPTY);
    },
    base,
    setBase,
    rollAll: () => setBase(rollCharacteristics()),
    rolled,
    luck,
    luckRolls,
    rollLuck: () =>
      setLuckRolls((r) => (rules.youth && r.length === 1 ? [...r, rollLuck(variant)] : [rollLuck(variant)])),
    age,
    setAge: (a: number) => {
      setAgeState(Math.max(15, Math.min(89, Math.round(a))));
      setAgeLoss({});
      setEduGains(null);
      setLuckRolls((r) => r.slice(0, 1));
    },
    rules,
    ageLoss,
    setAgeLoss,
    ageSpent,
    youthSpent,
    eduGains,
    rollEdu: () => {
      let edu = base.edu - (rules.youth ? 5 : 0);
      const gains: number[] = [];
      for (let i = 0; i < rules.eduChecks; i++) {
        const { gain } = eduImprovement(edu);
        gains.push(gain);
        edu += gain;
      }
      setEduGains(gains);
    },
    characteristics,
    derived: derivedOf(characteristics, variant, age),
    occupation,
    occupationInfo,
    setOccupation: (id: string) => {
      if (id !== occupation) {
        setOccupationId(id);
        setPicks({});
        setPoints((p) => ({ ...p, occupation: {} }));
      }
    },
    picks,
    setPicks,
    ownSkills,
    points,
    setPoint,
    budgets,
    remaining,
    skillValue,
    creditRating,
    talents,
    setTalents,
    story,
    setStory,
    residence,
    setResidence,
    birthplace,
    setBirthplace,
    weapons,
    setWeapons,
    name,
    setName,
    images,
    setImages,
    preview,
    issues,
    create,
    creating,
  };
}

export type CocCreation = ReturnType<typeof useCocCreation>;
