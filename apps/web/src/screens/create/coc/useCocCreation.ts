import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ARCHETYPE_POINTS,
  CHARACTERISTICS,
  POINT_BUY_TOTAL,
  ageRules,
  archetypeDef,
  createInvestigator,
  derivedOf,
  eduImprovement,
  formulaPoints,
  occupationDef,
  personalPoints,
  rollCharacteristicsDetailed,
  rollCoreCharacteristicDetailed,
  rollLuckDetailed,
  skillBase,
  skillName,
  type CharacteristicId,
  type Characteristics,
  type CocEra,
  type CocVariant,
} from '@itd/game-logic/coc';
import type { CharacterImages, CocSheet, Setting } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useClearDraft, useDraftState } from '../useDraftState';
import {
  choiceNumbers,
  countedPoints,
  manualOutOfRange,
  nextPoints,
  occupationSkills,
  picksInEra,
  pruneOccupationPoints,
  prunePointsToEra,
  skillsOverCap,
  withCore,
  type ChoicePicks,
  type Pool,
  type PoolPoints,
} from './creationRules';

export { SKILL_CAP, choiceOptions, occupationSkills, type ChoicePicks } from './creationRules';

export type CharacteristicMethod = 'roll' | 'pointBuy' | 'manual';

/** A throw made on this visit, kept only to show its dice tumbling; `serial` tells throws apart. */
export interface Thrown<T> {
  serial: number;
  dice: T;
}

/** The latest throw of each kind, for the dice on screen (not part of the draft). */
export interface CocThrows {
  characteristics?: Thrown<Record<CharacteristicId, number[]>>;
  luck?: Thrown<number[]>;
  core?: Thrown<number>;
  edu?: Thrown<{ roll: number; die?: number; gain: number }[]>;
}
/** Throws that can be made again; a throw of a kind made before counts as a re-roll. */
type RollKind = 'characteristics' | 'luck' | 'core' | 'edu';

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
  const [points, setPoints] = useDraftState<PoolPoints>('coc.points', {
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
  /** Throws made again (characteristics, luck, core, EDU checks): not limited, but the master sees them. */
  const [rerolls, setRerolls] = useDraftState('coc.rerolls', 0);
  const [rolledKinds, setRolledKinds] = useDraftState<RollKind[]>('coc.rolledKinds', []);
  const [creating, setCreating] = useState(false);
  const [throws, setThrows] = useState<CocThrows>({});
  const throwSerial = useRef(0);
  const thrown = <K extends keyof CocThrows>(kind: K, dice: NonNullable<CocThrows[K]>['dice']) => {
    throwSerial.current += 1;
    const next = { serial: throwSerial.current, dice };
    setThrows((t) => ({ ...t, [kind]: next }));
  };
  /** Counts a throw: the first of its kind is free, every later one is a re-roll. */
  const counted = (kind: RollKind, free = false) => {
    if (rolledKinds.includes(kind)) {
      if (!free) setRerolls((n) => n + 1);
    } else setRolledKinds([...rolledKinds, kind]);
  };

  const pulp = variant === 'pulp';
  const archetypeInfo = pulp ? archetypeDef(archetype) : undefined;
  const occupationInfo = occupationDef(occupation);
  const rules = ageRules(age);
  const rolled = CHARACTERISTICS.every((c) => base[c.id] > 0);
  /** The edition counts as chosen once picked, or once later steps were taken (a draft from before the flag). */
  const editionPicked = editionChosen || rolled || !!archetype || !!occupation;

  /** Characteristics after the archetype's core, age and EDU checks. */
  const characteristics = useMemo<Characteristics>(() => {
    const c = withCore(base, core, pulp);
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
  /** Points as they count: occupation points on the occupation's skills, archetype points in Pulp. */
  const counts = countedPoints(points, ownSkills, pulp);

  const budgets = {
    occupation: occupationInfo ? formulaPoints(occupationInfo.points, characteristics) : 0,
    personal: personalPoints(characteristics),
    archetype: pulp ? ARCHETYPE_POINTS : 0,
  };
  const spent = (pool: Pool) => Object.values(counts[pool]).reduce((sum, n) => sum + n, 0);
  const remaining = {
    occupation: budgets.occupation - spent('occupation'),
    personal: budgets.personal - spent('personal'),
    archetype: budgets.archetype - spent('archetype'),
  };

  /** A skill's value as allocated: base plus the points of every pool (personal points go anywhere). */
  const skillValue = (id: string) =>
    skillBase(id, characteristics) +
    (counts.occupation[id] ?? 0) +
    (counts.personal[id] ?? 0) +
    (counts.archetype[id] ?? 0);
  const creditRating = skillValue('credit-rating');

  const allocated = useMemo(() => {
    const ids = new Set([
      ...Object.keys(counts.occupation),
      ...Object.keys(counts.personal),
      ...Object.keys(counts.archetype),
    ]);
    return Object.fromEntries(
      [...ids].map((id) => [id, skillValue(id)]).filter(([, v]) => (v as number) > 0),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- skillValue reads these
  }, [points, characteristics, pulp, ownSkills.join()]);

  const ageSpent = (['str', 'con', 'dex'] as const).reduce((sum, id) => sum + (ageLoss[id] ?? 0), 0);
  const youthSpent = (ageLoss.str ?? 0) + (ageLoss.siz ?? 0);

  const choiceNumber = choiceNumbers(occupationInfo);
  const overCap = skillsOverCap(allocated as Record<string, number>);

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
      ...(method === 'manual' && manualOutOfRange(base).length ? ['Значения характеристик'] : []),
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
      ...(occupationInfo?.era && occupationInfo.era !== era ? ['Профессия другой эпохи'] : []),
      ...(occupationInfo?.skills.flatMap((choice, i) =>
        'skill' in choice || (picks[i]?.length ?? 0) >= choice.pick
          ? []
          : [`Выбор навыков ${choiceNumber[i]}`],
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
      ...overCap.map((id) => `Навык выше 99: ${skillName(id)}`),
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

  /** Points of one pool on one skill, kept within the pool and the skill cap; lowering only stops at 0. */
  const setPoint = (pool: Pool, id: string, value: number) =>
    setPoints((all) => {
      const current = all[pool][id] ?? 0;
      const next = nextPoints({
        value,
        current,
        others: Object.entries(all[pool]).reduce((sum, [key, n]) => (key === id ? sum : sum + n), 0),
        budget: budgets[pool],
        without: skillValue(id) - current,
      });
      const pool2 = { ...all[pool], [id]: next };
      if (next === 0) delete pool2[id];
      return { ...all, [pool]: pool2 };
    });

  /** The picks of choice groups, and occupation points off the skills no longer picked. */
  const choosePicks = (next: ChoicePicks) => {
    setPicks(next);
    const own = occupationSkills(occupationInfo, next);
    setPoints((p) => pruneOccupationPoints(p, own));
  };

  /** EDU improvement checks are rolled against EDU as it stands: they start over once it changes. */
  const setBaseAndChecks = (next: Characteristics) => {
    setBase(next);
    if (next.edu !== base.edu) setEduGains(null);
  };

  return {
    variant,
    editionChosen: editionPicked,
    setVariant: (v: CocVariant) => {
      setVariant(v);
      setEditionChosen(true);
      if (v === 'classic') {
        setTalents([]);
        setCore(null);
        setPoints((p) => ({ ...p, archetype: {} }));
      }
      if (v !== variant) {
        // Luck is rolled by the edition's formula (3D6×5 or (2D6+6)×5): a new edition needs a new throw.
        setLuckRolls([]);
        // The core characteristic comes or goes with Pulp: EDU checks rolled against it start over.
        if (core?.id === 'edu') setEduGains(null);
      }
    },
    era,
    setEra: (e: CocEra) => {
      if (e === era) return;
      setEra(e);
      if (occupationInfo?.era && occupationInfo.era !== e) {
        setOccupationId(undefined);
        setPicks({});
        setPoints((p) => prunePointsToEra({ ...p, occupation: {} }, e));
      } else {
        const kept = picksInEra(picks, e);
        setPicks(kept);
        setPoints((p) =>
          pruneOccupationPoints(prunePointsToEra(p, e), occupationSkills(occupationInfo, kept)),
        );
      }
    },
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
    rollCore: (id: CharacteristicId) => {
      const { value, die } = rollCoreCharacteristicDetailed();
      setCore({ id, value });
      if (id === 'edu' || core?.id === 'edu') setEduGains(null);
      counted('core');
      thrown('core', die);
    },
    method,
    setMethod: (m: CharacteristicMethod) => {
      setMethodState(m);
      setBase(m === 'pointBuy' ? POINT_BUY_START : m === 'manual' ? { ...POINT_BUY_START } : EMPTY);
      setEduGains(null);
    },
    base,
    setBase: setBaseAndChecks,
    rollAll: () => {
      const { values, dice } = rollCharacteristicsDetailed();
      setBase(values);
      setEduGains(null);
      counted('characteristics');
      thrown('characteristics', dice);
    },
    rolled,
    throws,
    luck,
    luckRolls,
    rollLuck: () => {
      const { value, dice } = rollLuckDetailed(variant);
      setLuckRolls((r) => (rules.youth && r.length === 1 ? [...r, value] : [value]));
      // A youth's second throw is the rule, not a re-roll.
      counted('luck', rules.youth && luckRolls.length === 1);
      thrown('luck', dice);
    },
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
      // EDU as the characteristics have it (a Pulp core included), before any checks are added.
      let edu = withCore(base, core, pulp).edu - (rules.youth ? 5 : 0);
      const checks: { roll: number; die?: number; gain: number }[] = [];
      for (let i = 0; i < rules.eduChecks; i++) {
        const check = eduImprovement(edu);
        checks.push(check);
        edu += check.gain;
      }
      setEduGains(checks.map((c) => c.gain));
      counted('edu');
      thrown('edu', checks);
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
    setPicks: choosePicks,
    choiceNumber,
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
    rerolls,
    issues,
    create,
    creating,
  };
}

export type CocCreation = ReturnType<typeof useCocCreation>;
