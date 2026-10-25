import { describe, expect, it } from 'vitest';
import { isRuleSystemLoaded, ruleSystem } from '../src';

// Its own file: vitest gives each file fresh modules, so nothing has loaded D&D here.
describe('rules systems before loading', () => {
  it('are not part of the core rules', () => {
    expect(isRuleSystemLoaded('dnd2024')).toBe(false);
    expect(() => ruleSystem('dnd2024')).toThrow(/not loaded/);
  });
});
