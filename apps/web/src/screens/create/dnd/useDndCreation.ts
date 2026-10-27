import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  pointsRemaining,
} from '@itd/game-logic';
import {
  createDndHero,
  emptyBuild,
  findBackground,
  findClass,
  validBackgroundBonuses,
  withoutPicks,
} from '@itd/game-logic/dnd';
import type { DndBuild, CharacterImages, Setting } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useClearDraft, useDraftState } from '../useDraftState';
import { CLASS_SOURCES, planIssues } from '../../progression/LevelPlanView';

/**
 * A D&D 2024 hero in the making: the build, the starting kits and the identity. The sheet it would
 * produce is recomputed on every change for the live preview.
 */
export function useDndCreation(setting: Setting, onCreated: () => void) {
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const clearDraft = useClearDraft();
  const [build, setBuild] = useDraftState<DndBuild>('build', emptyBuild);
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

  const levels = Array.from({ length: build.level }, (_, i) => i + 1);
  const issues = {
    species: !build.species ? ['Вид'] : planIssues(build, 1, ['species']),
    background: !build.background
      ? ['Предыстория']
      : [...(validBackgroundBonuses(build) ? [] : ['Увеличение характеристик']), ...planIssues(build, 1, ['background'])],
    class: build.class ? [] : ['Класс'],
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
    setClass: (classId: string) => {
      setBuild((b) => (b.class === classId ? b : { ...withoutPicks(b, 'class', 'subclass', 'casting'), class: classId, subclass: undefined }));
      setClassKitId(undefined);
    },
    /** No class again: what was picked for one goes with it. */
    clearClass: () => {
      setBuild((b) => ({ ...withoutPicks(b, 'class', 'subclass', 'casting'), class: '', subclass: undefined }));
      setClassKitId(undefined);
    },
    /** Lowering the start level forgets the hit points and the subclass of the levels above it. */
    setLevel: (level: number) =>
      setBuild((b) => {
        const classDef = findClass(b.class);
        return {
          ...b,
          level,
          subclass: classDef && level < classDef.subclassLevel ? undefined : b.subclass,
          hitPoints: b.hitPoints.filter((entry) => entry.level <= level),
        };
      }),
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
