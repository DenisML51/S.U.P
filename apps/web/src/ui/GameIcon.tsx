import React from 'react';
import { ICONS, type GameIconId } from './gameIconCatalog';

export type { GameIconId } from './gameIconCatalog';
export { ICON_GROUPS } from './gameIconCatalog';

/** What an icon stands for, which decides the picture shown when none was chosen. */
export type IconKind = 'attack' | 'ability' | 'spell' | 'item' | 'resource';

const DEFAULT_ICON: Record<IconKind, GameIconId> = {
  attack: 'broadsword',
  ability: 'sparkles',
  spell: 'magic-swirl',
  item: 'round-potion',
  resource: 'power-lightning',
};

/** Sheets made before this picker store Lucide icon names; each maps to the closest picture. */
const LEGACY_ICON: Record<string, GameIconId> = {
  Zap: 'lightning-helix',
  ZapOff: 'lightning-helix',
  CloudLightning: 'chain-lightning',
  Flame: 'flame',
  Sparkles: 'sparkles',
  Star: 'sparkles',
  Sword: 'broadsword',
  Swords: 'crossed-swords',
  Axe: 'battle-axe',
  Hammer: 'warhammer',
  Shield: 'checked-shield',
  Heart: 'heart-plus',
  Activity: 'heart-plus',
  Brain: 'brain',
  Eye: 'all-seeing-eye',
  Droplet: 'water-bolt',
  Target: 'arrow-scope',
  Wind: 'tornado',
  Snowflake: 'snowflake-2',
  Sun: 'sunbeams',
  SunMedium: 'sunbeams',
  Moon: 'moon',
  MoonStar: 'moon',
  Skull: 'death-skull',
  Ghost: 'ghost',
  Wand: 'fairy-wand',
  Wand2: 'fairy-wand',
  Gem: 'gems',
  Crown: 'crown',
  FlaskConical: 'bubbling-flask',
  FlaskRound: 'round-potion',
  Scroll: 'scroll-unfurled',
  Book: 'spell-book',
  BookMagic: 'spell-book',
  Pentagram: 'pentagram-rose',
  Dna: 'dna1',
  Backpack: 'light-backpack',
  Package: 'swap-bag',
  Box: 'open-treasure-chest',
  Coins: 'two-coins',
  Key: 'key',
  Feather: 'feather',
  Dice5: 'rolling-dices',
  Music: 'lyre',
  Beer: 'beer-stein',
  Leaf: 'feather',
};

/** The picture to draw for a stored icon name: the chosen one, its old equivalent or the default. */
export function resolveIcon(name: string | undefined, kind: IconKind): GameIconId {
  if (name && name in ICONS) return name as GameIconId;
  return (name && LEGACY_ICON[name]) || DEFAULT_ICON[kind];
}

/**
 * Colours offered for entry icons. Muted enough for every setting; an icon without a colour takes
 * the setting's own accent.
 */
export const ICON_COLORS: { value: string; label: string }[] = [
  { value: '#d4a94e', label: 'Золото' },
  { value: '#c8503f', label: 'Кровь' },
  { value: '#e07b39', label: 'Пламя' },
  { value: '#7fb069', label: 'Яд' },
  { value: '#4fa3c7', label: 'Лёд' },
  { value: '#8a7be0', label: 'Чары' },
  { value: '#c665a8', label: 'Псионика' },
  { value: '#a3aab3', label: 'Сталь' },
  { value: '#e6dcc4', label: 'Кость' },
];

export const GameIcon: React.FC<{
  /** Stored icon name; empty falls back to the kind's picture. */
  name?: string;
  kind: IconKind;
  size?: number;
  color?: string;
  className?: string;
}> = ({ name, kind, size = 24, color, className }) => {
  const Icon = ICONS[resolveIcon(name, kind)];
  return (
    <Icon
      width={size}
      height={size}
      className={className}
      style={color ? { color } : undefined}
      aria-hidden
    />
  );
};

/** A picture by its catalogue id, for conditions and damage types. */
export const CatalogIcon: React.FC<{ id: GameIconId; size?: number; className?: string }> = ({
  id,
  size = 20,
  className,
}) => {
  const Icon = ICONS[id];
  return <Icon width={size} height={size} className={className} aria-hidden />;
};

export const CONDITION_ICONS: Record<string, GameIconId> = {
  blinded: 'blindfold',
  charmed: 'charm',
  deafened: 'human-ear',
  frightened: 'terror',
  grappled: 'grab',
  incapacitated: 'knocked-out-stars',
  invisible: 'invisible',
  paralyzed: 'frozen-body',
  petrified: 'stone-bust',
  poisoned: 'poison-bottle',
  prone: 'falling',
  restrained: 'manacles',
  stunned: 'knocked-out-stars',
  unconscious: 'coma',
  exhaustion: 'tired-eye',
};

export const DAMAGE_ICONS: Record<string, GameIconId> = {
  Физический: 'fist',
  Колющий: 'plain-dagger',
  Рубящий: 'saber-slash',
  Дробящий: 'crush',
  Огонь: 'flame',
  Холод: 'cold-heart',
  Электричество: 'lightning-helix',
  Яд: 'poison-bottle',
  Кислота: 'acid',
  Психический: 'psychic-waves',
  Некротический: 'death-skull',
  Лучистый: 'sun-radiations',
  Силовой: 'spiky-explosion',
};
