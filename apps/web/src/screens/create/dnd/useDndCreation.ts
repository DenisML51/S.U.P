import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  pointsRemaining,
} from '@itd/game-logic';
import {
  createDndHero,
  emptyBuild,
  findBackground,
  heroLevel,
  preparedAtCreationKey,
  setHeroLevel,
  setLevelClass,
  validBackgroundBonuses,
  withoutPicks,
} from '@itd/game-logic/dnd';
import { BuildSchema, type DndBuild, type CharacterImages, type Setting } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useClearDraft, useDraftState } from '../useDraftState';
import { CLASS_SOURCES, planIssues } from '../../progression/LevelPlanView';

/**
 * A kept draft build, read the way the schema reads builds saved before multiclassing; its starting
 * prepared spells, kept then for the one class, become that class's.
 */
const reviveBuild = (stored: unknown): DndBuild | undefined => {
  const parsed = BuildSchema.safeParse(stored);
  if (!parsed.success || parsed.data.ruleset !== 'dnd2024') return undefined;
  const { [LEGACY_PREPARED]: prepared, ...choices } = parsed.data.choices;
  const first = parsed.data.classes[0]?.class;
  return prepared && first ? { ...parsed.data, choices: { ...choices, [preparedAtCreationKey(first)]: prepared } } : parsed.data;
};

/** Where a draft kept its starting prepared spells before they were kept per class. */
const LEGACY_PREPARED = 'creation:prepared';

/** Character levels 1 to level. */
const upTo = (level: number) => Array.from({ length: level }, (_, i) => i + 1);

/**
 * A D&D 2024 hero in the making: the build, the starting kits and the identity. The sheet it would
 * produce is recomputed on every change for the live preview.
 */
export function useDndCreation(setting: Setting, onCreated: () => void) {
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const clearDraft = useClearDraft();
  const [build, setBuild] = useDraftState<DndBuild>('build', emptyBuild, reviveBuild);
  // The start level is picked before the class too; the class then takes every level of it.
  const [startLevel, setStartLevel] = useDraftState('level', () => Math.max(1, heroLevel(build)));
  const classId = build.classes[0]?.class;
  const level = classId ? heroLevel(build) : startLevel;
  const [rolls, setRolls] = useDraftState<number[] | null>('rolls', null);
  const [classKitId, setClassKitId] = useDraftState<string | undefined>('classKit', undefined);
  const [backgroundKitId, setBackgroundKitId] = useDraftState<string | undefined>('backgroundKit', undefined);
  const [name, setName] = useDraftState('name', '');
  const [images, setImages] = useDraftState<CharacterImages>('images', {});
  const [creating, setCreating] = useState(false);

  const preview = useMemo(
    () => createDndHero({ name: name.trim() || 'Безымянный', build, classKitId, backgroundKitId }),
    [build, name, classKitId, backgroundKitId],
  );

  const levels = upTo(level);
  const issues = {
    species: !build.species ? ['Вид'] : planIssues(build, 1, ['species']),
    background: !build.background
      ? ['Предыстория']
      : [...(validBackgroundBonuses(build) ? [] : ['Увеличение характеристик']), ...planIssues(build, 1, ['background'])],
    class: classId ? [] : ['Класс'],
    abilities:
      build.abilityMethod === 'pointBuy'
        ? pointsRemaining(build.baseAttributes) === 0
          ? []
          : ['Очки характеристик']
        : build.abilityMethod === 'roll' && !rolls
          ? ['Бросок']
          : [],
    progression: levels.flatMap((level) => planIssues(build, level, CLASS_SOURCES).map((issue) => `${level}: ${issue}`)),
    equipment: [...(classKitId ? [] : ['Снаряжение класса']), ...(backgroundKitId ? [] : ['Снаряжение предыстории'])],
    identity: name.trim() ? [] : ['Имя'],
  };

  const create = async () => {
    if (Object.values(issues).some((list) => list.length > 0)) return;
    setCreating(true);
    try {
      await createCharacter({
        ...createDndHero({ name: name.trim(), build, classKitId, backgroundKitId }),
        setting,
        images: images.full || images.portrait ? images : undefined,
      });
      clearDraft();
      onCreated();
    } catch {
      toast.error('Не удалось создать героя');
      setCreating(false);
    }
  };

  return {
    build,
    setBuild,
    setSpecies: (species: string) => setBuild((b) => (b.species === species ? b : { ...withoutPicks(b, 'species'), species })),
    setBackground: (background: string) => {
      const abilities = findBackground(background)?.abilities;
      // +2/+1 to the first two of its scores until the player moves them.
      const backgroundBonuses = abilities ? { [abilities[0]]: 2, [abilities[1]]: 1 } : {};
      setBuild((b) => (b.background === background ? b : { ...withoutPicks(b, 'background'), background, backgroundBonuses }));
      setBackgroundKitId(undefined);
    },
    classId,
    level,
    setClass: (id: string) => {
      setBuild((b) => (b.classes[0]?.class === id ? b : { ...withoutPicks(b, 'class', 'subclass', 'casting', 'swap'), classes: [{ class: id, levels: upTo(level) }] }));
      setClassKitId(undefined);
    },
    /** No class again: what was picked for one goes with it. */
    clearClass: () => {
      setBuild((b) => ({ ...withoutPicks(b, 'class', 'subclass', 'casting', 'swap'), classes: [] }));
      setClassKitId(undefined);
    },
    /**
     * The start level: levels above it are given back from the last, with their picks, hit points
     * and a subclass left out of reach; new ones go to the class of the last level.
     */
    setLevel: (next: number) => {
      setStartLevel(next);
      setBuild((b) => (b.classes.length > 0 ? setHeroLevel(b, next) : b));
    },
    /** A level after the first taken in another class (multiclassing); its picks start over. */
    setLevelClass: (level: number, id: string) => setBuild((b) => setLevelClass(b, level, id)),
    rolls,
    setRolls,
    classKitId,
    setClassKitId,
    backgroundKitId,
    setBackgroundKitId,
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

export type DndCreation = ReturnType<typeof useDndCreation>;
