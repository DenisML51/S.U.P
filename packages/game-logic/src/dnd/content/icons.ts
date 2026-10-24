/**
 * Pictures (game-icons ids) of species, backgrounds, classes and subclasses, for the choosing grids
 * of the creation screen and the hero summary.
 */
export const DND_ICONS: Record<'species' | 'backgrounds' | 'classes' | 'subclasses', Record<string, string>> = {
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
  },
  subclasses: {
    'battle-master': 'sword-brandish',
    champion: 'laurel-crown',
    'eldritch-knight': 'spell-book',
    'psi-warrior': 'psychic-waves',
    'oath-of-devotion': 'angel-outfit',
    'oath-of-glory': 'crested-helmet',
    'oath-of-the-ancients': 'oak',
    'oath-of-vengeance': 'sword-in-stone',
  },
};
