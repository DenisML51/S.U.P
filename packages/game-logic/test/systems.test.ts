import { describe, expect, it } from 'vitest';
import { RULESETS } from '@itd/schema';
import { loadRuleSystem, ruleSystem } from '../src';
import { DND_CLASS_META } from '../src/dnd/meta';

describe('rules systems', () => {
  it('loads every ruleset of the schema on demand', async () => {
    for (const id of RULESETS) {
      const system = await loadRuleSystem(id);
      expect(system.id).toBe(id);
      expect(ruleSystem(id)).toBe(system);
      expect(system.featureParts.length).toBeGreaterThan(0);
    }
  });

  it('keeps the always-loaded D&D class table in step with the presets', async () => {
    const { DND_CLASSES } = await import('../src/dnd');
    expect(DND_CLASS_META.map(({ id, name }) => ({ id, name }))).toEqual(
      expect.arrayContaining(DND_CLASSES.map(({ id, name }) => ({ id, name }))),
    );
    expect(DND_CLASS_META).toHaveLength(DND_CLASSES.length);
  });
});
