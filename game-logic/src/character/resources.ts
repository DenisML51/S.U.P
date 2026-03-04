import type { Character, Resource } from '../types.js';

export const spendResource = (character: Character, resourceId: string, delta: number): Character => {
  const newResources = character.resources.map(r => {
    if (r.id !== resourceId) return r;
    const current = isNaN(Number(r.current)) ? 0 : Number(r.current);
    const max = isNaN(Number(r.max)) ? 0 : Number(r.max);
    return { ...r, current: Math.min(max, Math.max(0, current + delta)) };
  });
  return { ...character, resources: newResources };
};

export const resetAllResources = (character: Character): Character => ({
  ...character,
  resources: character.resources.map(r => ({ ...r, current: r.max })),
});

export const upsertResource = (character: Character, resource: Resource): Character => {
  const idx = character.resources.findIndex(r => r.id === resource.id);
  const newResources = idx >= 0
    ? character.resources.map((r, i) => (i === idx ? resource : r))
    : [...character.resources, resource];
  return { ...character, resources: newResources };
};

export const removeResource = (character: Character, resourceId: string): Character => ({
  ...character,
  resources: character.resources.filter(r => r.id !== resourceId),
});
