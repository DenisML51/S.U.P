/**
 * Domain types and rules for the UI. The definitions live in the shared packages; this module only
 * re-exports them (so components import from one place) and adds UI-only types.
 */
import { ALL_AVAILABLE_ICONS } from './utils/iconUtils';

export type {
  Ability,
  ActionCounters,
  ActionType,
  Attack,
  Character,
  CharacterDraft,
  CharacterPreview,
  Currency,
  DamageComponent,
  HistoryEntry,
  HistoryEntryType,
  InventoryItem,
  ItemType,
  Limb,
  Resistance,
  ResistanceLevel,
  Resource,
  Skill,
  Spell,
  Trait,
  WeaponClass,
} from '@itd/schema';

export * from '@itd/game-logic';

export type TabType = 'personality' | 'health' | 'abilities' | 'spells' | 'attacks' | 'equipment' | 'inventory' | 'stats';
export type ViewMode = 'tabs' | 'hotbar';

export const RESOURCE_ICONS = ALL_AVAILABLE_ICONS.map((name) => ({ name, label: name }));
