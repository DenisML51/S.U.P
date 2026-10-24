import type { Character, Resource } from '@itd/schema';

export interface ResourceChange {
  character: Character;
  resource: Resource;
  /** What actually changed after clamping to 0..max; 0 when the resource was already at a bound. */
  applied: number;
}

/** Spends (negative delta) or restores (positive delta) a resource within 0..max. */
export function changeResource(character: Character, resourceId: string, delta: number): ResourceChange | null {
  const resource = character.resources.find((r) => r.id === resourceId);
  if (!resource) return null;

  const current = Math.min(resource.max, Math.max(0, resource.current + delta));
  const updated = { ...resource, current };
  return {
    character: { ...character, resources: character.resources.map((r) => (r.id === resourceId ? updated : r)) },
    resource: updated,
    applied: current - resource.current,
  };
}
