import type { ArmorDef, GearDef } from '../types';
import { BARBARIAN_ICONS } from './classes/barbarian';
import { BARD_ICONS } from './classes/bard';
import { CLERIC_ICONS } from './classes/cleric';
import { DRUID_ICONS } from './classes/druid';
import { MONK_ICONS } from './classes/monk';
import { RANGER_ICONS } from './classes/ranger';
import { ROGUE_ICONS } from './classes/rogue';
import { SORCERER_ICONS } from './classes/sorcerer';
import { WARLOCK_ICONS } from './classes/warlock';
import { WIZARD_ICONS } from './classes/wizard';

/**
 * Pictures (game-icons ids) of species, backgrounds, classes, subclasses and weapons, for the choosing
 * grids of the creation screen, the hero summary and the items and attacks made from the tables.
 */
export const DND_ICONS: Record<'species' | 'backgrounds' | 'classes' | 'subclasses' | 'weapons', Record<string, string>> = {
  species: {
    aasimar: 'angel-wings',
    dragonborn: 'dragon-head',
    dwarf: 'dwarf-face',
    elf: 'woman-elf-face',
    gnome: 'pointy-hat',
    goliath: 'giant',
    halfling: 'walking-boot',
    human: 'person',
    orc: 'orc-head',
    tiefling: 'devil-mask',
  },
  backgrounds: {
    acolyte: 'prayer',
    artisan: 'anvil',
    charlatan: 'fox-head',
    criminal: 'hood',
    entertainer: 'jester-hat',
    farmer: 'wheat',
    guard: 'spartan-helmet',
    guide: 'compass',
    hermit: 'mountain-cave',
    merchant: 'coins',
    noble: 'crown',
    sage: 'book-cover',
    sailor: 'anchor',
    scribe: 'quill-ink',
    soldier: 'knight-banner',
    wayfarer: 'backpack',
  },
  classes: {
    fighter: 'visored-helm',
    paladin: 'holy-symbol',
    barbarian: BARBARIAN_ICONS.class,
    bard: BARD_ICONS.class,
    cleric: CLERIC_ICONS.class,
    druid: DRUID_ICONS.class,
    monk: MONK_ICONS.class,
    ranger: RANGER_ICONS.class,
    rogue: ROGUE_ICONS.class,
    sorcerer: SORCERER_ICONS.class,
    warlock: WARLOCK_ICONS.class,
    wizard: WIZARD_ICONS.class,
  },
  subclasses: {
    'battle-master': 'sword-brandish',
    champion: 'laurel-crown',
    'eldritch-knight': 'spell-book',
    'psi-warrior': 'psychic-waves',
    banneret: 'knight-banner',
    'arcane-archer': 'high-shot',
    'oath-of-devotion': 'angel-outfit',
    'oath-of-glory': 'crested-helmet',
    'oath-of-the-ancients': 'oak',
    'oath-of-vengeance': 'sword-in-stone',
    'oath-of-the-noble-genies': 'whirlwind',
    ...BARBARIAN_ICONS.subclasses,
    ...BARD_ICONS.subclasses,
    ...CLERIC_ICONS.subclasses,
    ...DRUID_ICONS.subclasses,
    ...MONK_ICONS.subclasses,
    ...RANGER_ICONS.subclasses,
    ...ROGUE_ICONS.subclasses,
    ...SORCERER_ICONS.subclasses,
    ...WARLOCK_ICONS.subclasses,
    ...WIZARD_ICONS.subclasses,
  },
  weapons: {
    club: 'spiked-mace',
    dagger: 'plain-dagger',
    greatclub: 'spiked-mace',
    handaxe: 'battle-axe',
    javelin: 'barbed-spear',
    'light-hammer': 'warhammer',
    mace: 'spiked-mace',
    quarterstaff: 'wizard-staff',
    sickle: 'reaper-scythe',
    spear: 'barbed-spear',
    dart: 'thrown-daggers',
    'light-crossbow': 'crossbow',
    shortbow: 'bow-arrow',
    sling: 'thrown-daggers',
    battleaxe: 'battle-axe',
    flail: 'spiked-mace',
    glaive: 'reaper-scythe',
    greataxe: 'battle-axe',
    greatsword: 'broadsword',
    halberd: 'reaper-scythe',
    lance: 'barbed-spear',
    longsword: 'broadsword',
    maul: 'warhammer',
    morningstar: 'spiked-mace',
    pike: 'barbed-spear',
    rapier: 'saber-slash',
    scimitar: 'saber-slash',
    shortsword: 'broadsword',
    trident: 'trident',
    warhammer: 'warhammer',
    'war-pick': 'warhammer',
    whip: 'whip',
    blowgun: 'thrown-daggers',
    'hand-crossbow': 'crossbow',
    'heavy-crossbow': 'crossbow',
    longbow: 'bow-arrow',
    musket: 'rifle',
    pistol: 'pistol-gun',
  },
};

/** Pictures of particular pieces of gear; the rest take the picture of their kind. */
const GEAR_ICONS: Record<string, string> = {
  arrows: 'bow-arrow',
  bolts: 'crossbow',
  'firearm-bullets': 'revolver',
  'sling-bullets': 'thrown-daggers',
  needles: 'thrown-daggers',
  'holy-symbol': 'holy-symbol',
  'arcane-focus': 'crystal-ball',
  'druidic-focus': 'wizard-staff',
  'component-pouch': 'swap-bag',
  backpack: 'light-backpack',
  book: 'book-cover',
  spellbook: 'spell-book',
  'book-occult': 'evil-book',
  'book-prayers': 'book-cover',
  'book-philosophy': 'book-cover',
  'book-history': 'book-cover',
  candle: 'torch',
  'healers-kit': 'medical-pack',
  'holy-water': 'holy-water',
  'hooded-lantern': 'lantern',
  lamp: 'lantern',
  ink: 'scroll-quill',
  'ink-pen': 'scroll-quill',
  oil: 'bubbling-flask',
  flask: 'bubbling-flask',
  paper: 'scroll-unfurled',
  parchment: 'scroll-unfurled',
  rations: 'meat',
  rope: 'rope-coil',
  torch: 'torch',
  tinderbox: 'campfire',
  'gaming-set': 'rolling-dices',
  'dice-set': 'rolling-dices',
  'musical-instrument': 'lyre',
  lyre: 'lyre',
  lute: 'lyre',
  horn: 'hunting-horn',
  'herbalism-kit': 'magic-potion',
  'alchemists-supplies': 'bubbling-flask',
  'poisoners-kit': 'poison-bottle',
  'thieves-tools': 'key',
};

const GEAR_KIND_ICONS: Record<GearDef['kind'], string> = {
  ammunition: 'bow-arrow',
  focus: 'crystal-ball',
  gear: 'swap-bag',
  pack: 'light-backpack',
  tool: 'gear-hammer',
};

/** The picture of an item made from a gear entry of the tables. */
export const gearIcon = (gear: GearDef): string => GEAR_ICONS[gear.id] ?? GEAR_KIND_ICONS[gear.kind];

/** The picture of an item made from an armour entry: a shield, or body armour. */
export const armorIcon = (armor: ArmorDef): string => (armor.category === 'shield' ? 'checked-shield' : 'chest-armor');
