import type { BeastFormDef, FeatureDef } from '../types';

/** Pool of Wild Shape uses (Дикий облик) every form is taken with. */
export const WILD_SHAPE = 'druid.wild-shape';

/**
 * Beasts a druid can take the shape of, from challenge 0 up to 6 (a Circle of the Moon druid of
 * level 18). Numbers follow the stat blocks of the SRD 5.1; in Wild Shape only the physical scores,
 * armour class, speeds, senses and attacks of the beast count, the druid keeps the rest.
 */
export const BEASTS: BeastFormDef[] = [
  // Challenge 0.
  { id: 'cat', name: 'Кошка', cr: 0, size: 'Крошечный', ac: 12, speed: 40, climb: 30, str: 3, dex: 15, con: 10, iconName: 'cat',
    attacks: [{ name: 'Когти', hit: 0, damage: '1', damageType: 'Рубящий' }],
    traits: 'Острый нюх: преимущество на проверки Внимательности по запаху.' },
  { id: 'rat', name: 'Крыса', cr: 0, size: 'Крошечный', ac: 10, speed: 20, darkvision: 30, str: 2, dex: 11, con: 9, iconName: 'rat',
    attacks: [{ name: 'Укус', hit: 0, damage: '1', damageType: 'Колющий' }],
    traits: 'Острый нюх: преимущество на проверки Внимательности по запаху.' },
  { id: 'spider', name: 'Паук', cr: 0, size: 'Крошечный', ac: 12, speed: 20, climb: 20, darkvision: 30, str: 2, dex: 14, con: 8, iconName: 'spider-face',
    attacks: [{ name: 'Укус', hit: 4, damage: '1', damageType: 'Колющий', note: 'Цель проходит спасбросок Телосложения СЛ 9 или получает 1к4 урона ядом.' }],
    traits: 'Паучье лазание по стенам и потолку; чувство паутины.' },
  { id: 'raven', name: 'Ворон', cr: 0, size: 'Крошечный', ac: 12, speed: 10, fly: 50, str: 2, dex: 14, con: 8, iconName: 'raven',
    attacks: [{ name: 'Клюв', hit: 4, damage: '1', damageType: 'Колющий' }],
    traits: 'Подражание: повторяет услышанные звуки.' },
  // Challenge 1/8.
  { id: 'mastiff', name: 'Мастифф', cr: 1 / 8, size: 'Средний', ac: 12, speed: 40, str: 13, dex: 14, con: 12, iconName: 'sitting-dog',
    attacks: [{ name: 'Укус', hit: 3, damage: '1d6+1', damageType: 'Колющий', note: 'Существо сбивается с ног, если проваливает спасбросок Силы СЛ 11.' }],
    traits: 'Острый слух и нюх: преимущество на проверки Внимательности по слуху и запаху.' },
  { id: 'poisonous-snake', name: 'Ядовитая змея', cr: 1 / 8, size: 'Крошечный', ac: 13, speed: 30, swim: 30, str: 2, dex: 16, con: 11, iconName: 'snake',
    attacks: [{ name: 'Укус', hit: 5, damage: '1', damageType: 'Колющий', note: 'Цель проходит спасбросок Телосложения СЛ 10: 2к4 урона ядом при провале, половина при успехе.' }] },
  // Challenge 1/4.
  { id: 'wolf', name: 'Волк', cr: 1 / 4, size: 'Средний', ac: 13, speed: 40, str: 12, dex: 15, con: 12, iconName: 'wolf-head',
    attacks: [{ name: 'Укус', hit: 4, damage: '2d4+2', damageType: 'Колющий', note: 'Существо сбивается с ног, если проваливает спасбросок Силы СЛ 11.' }],
    traits: 'Тактика стаи: преимущество на атаку, если рядом с целью союзник. Острый слух и нюх.' },
  { id: 'boar', name: 'Кабан', cr: 1 / 4, size: 'Средний', ac: 11, speed: 40, str: 13, dex: 11, con: 12, iconName: 'boar',
    attacks: [{ name: 'Клык', hit: 3, damage: '1d6+1', damageType: 'Рубящий' }],
    traits: 'Натиск: пробежав 20 футов к цели, +1к6 урона и спасбросок Силы СЛ 11 от падения. Неумолимость: раз в отдых урон, сводящий к 0 хитов, оставляет 1.' },
  { id: 'panther', name: 'Пантера', cr: 1 / 4, size: 'Средний', ac: 12, speed: 50, climb: 40, str: 14, dex: 15, con: 10, iconName: 'feline',
    attacks: [
      { name: 'Укус', hit: 4, damage: '1d6+2', damageType: 'Колющий' },
      { name: 'Когти', hit: 4, damage: '1d4+2', damageType: 'Рубящий' },
    ],
    traits: 'Прыжок: пробежав 20 футов и попав когтями, сбивает с ног (спасбросок Силы СЛ 12) и кусает бонусным действием. Острый нюх.' },
  { id: 'giant-lizard', name: 'Гигантская ящерица', cr: 1 / 4, size: 'Большой', ac: 12, speed: 30, climb: 30, darkvision: 30, str: 15, dex: 12, con: 13, iconName: 'gecko',
    attacks: [{ name: 'Укус', hit: 4, damage: '1d8+2', damageType: 'Колющий' }] },
  { id: 'giant-poisonous-snake', name: 'Гигантская ядовитая змея', cr: 1 / 4, size: 'Средний', ac: 14, speed: 30, swim: 30, str: 10, dex: 18, con: 13, iconName: 'snake',
    attacks: [{ name: 'Укус', hit: 6, damage: '1d4+4', damageType: 'Колющий', note: 'Цель проходит спасбросок Телосложения СЛ 11: 3к6 урона ядом при провале, половина при успехе.' }] },
  { id: 'riding-horse', name: 'Ездовая лошадь', cr: 1 / 4, size: 'Большой', ac: 10, speed: 60, str: 16, dex: 10, con: 12, iconName: 'horse-head',
    attacks: [{ name: 'Копыта', hit: 5, damage: '2d4+3', damageType: 'Дробящий' }] },
  { id: 'giant-owl', name: 'Гигантская сова', cr: 1 / 4, size: 'Большой', ac: 12, speed: 5, fly: 60, darkvision: 120, str: 13, dex: 15, con: 12, iconName: 'owl',
    attacks: [{ name: 'Когти', hit: 3, damage: '2d6+1', damageType: 'Рубящий' }],
    traits: 'Пролёт: уходя из досягаемости врага, не провоцирует атак. Острый слух и зрение.' },
  // Challenge 1/2.
  { id: 'black-bear', name: 'Чёрный медведь', cr: 1 / 2, size: 'Средний', ac: 11, speed: 40, climb: 30, str: 15, dex: 10, con: 14, iconName: 'bear-head',
    attacks: [
      { name: 'Укус', hit: 4, damage: '1d6+2', damageType: 'Колющий' },
      { name: 'Когти', hit: 4, damage: '2d4+2', damageType: 'Рубящий' },
    ],
    traits: 'Мультиатака: укус и когти. Острый нюх.' },
  { id: 'crocodile', name: 'Крокодил', cr: 1 / 2, size: 'Большой', ac: 12, speed: 20, swim: 30, str: 15, dex: 10, con: 13, iconName: 'croc-jaws',
    attacks: [{ name: 'Укус', hit: 4, damage: '1d10+2', damageType: 'Колющий', note: 'Цель схвачена (высвобождение СЛ 12); пока держит, кусать другую цель нельзя.' }],
    traits: 'Задерживает дыхание на 15 минут.' },
  { id: 'ape', name: 'Обезьяна', cr: 1 / 2, size: 'Средний', ac: 12, speed: 30, climb: 30, str: 16, dex: 14, con: 14, iconName: 'monkey',
    attacks: [
      { name: 'Кулак', hit: 5, damage: '1d6+3', damageType: 'Дробящий' },
      { name: 'Камень', hit: 5, damage: '1d6+3', damageType: 'Дробящий', note: 'Дальнобойная: 25/50 футов.' },
    ],
    traits: 'Мультиатака: два удара кулаком.' },
  { id: 'giant-wasp', name: 'Гигантская оса', cr: 1 / 2, size: 'Средний', ac: 12, speed: 10, fly: 50, str: 10, dex: 14, con: 10, iconName: 'wasp-sting',
    attacks: [{ name: 'Жало', hit: 4, damage: '1d6+2', damageType: 'Колющий', note: 'Цель проходит спасбросок Телосложения СЛ 11: 3к6 урона ядом при провале, половина при успехе.' }] },
  // Challenge 1.
  { id: 'brown-bear', name: 'Бурый медведь', cr: 1, size: 'Большой', ac: 11, speed: 40, climb: 30, str: 19, dex: 10, con: 16, iconName: 'bear-head',
    attacks: [
      { name: 'Укус', hit: 6, damage: '1d8+4', damageType: 'Колющий' },
      { name: 'Когти', hit: 6, damage: '2d6+4', damageType: 'Рубящий' },
    ],
    traits: 'Мультиатака: укус и когти. Острый нюх.' },
  { id: 'dire-wolf', name: 'Лютоволк', cr: 1, size: 'Большой', ac: 14, speed: 50, str: 17, dex: 15, con: 15, iconName: 'wolf-howl',
    attacks: [{ name: 'Укус', hit: 5, damage: '2d6+3', damageType: 'Колющий', note: 'Существо сбивается с ног, если проваливает спасбросок Силы СЛ 13.' }],
    traits: 'Тактика стаи. Острый слух и нюх.' },
  { id: 'giant-spider', name: 'Гигантский паук', cr: 1, size: 'Большой', ac: 14, speed: 30, climb: 30, darkvision: 60, str: 14, dex: 16, con: 12, iconName: 'spider-face',
    attacks: [
      { name: 'Укус', hit: 5, damage: '1d8+3', damageType: 'Колющий', note: 'Цель проходит спасбросок Телосложения СЛ 11: 2к8 урона ядом при провале, половина при успехе.' },
      { name: 'Паутина', hit: 5, damage: '', damageType: '', note: 'Дальнобойная, 30/60 футов, перезарядка 5–6: цель опутана (высвобождение СЛ 12).' },
    ],
    traits: 'Паучье лазание; чувство паутины; хождение по паутине. Слепое зрение 10 футов.' },
  { id: 'giant-eagle', name: 'Гигантский орёл', cr: 1, size: 'Большой', ac: 13, speed: 10, fly: 80, str: 16, dex: 17, con: 13, iconName: 'eagle-emblem',
    attacks: [
      { name: 'Клюв', hit: 5, damage: '1d6+3', damageType: 'Колющий' },
      { name: 'Когти', hit: 5, damage: '2d6+3', damageType: 'Рубящий' },
    ],
    traits: 'Мультиатака: клюв и когти. Острое зрение.' },
  { id: 'tiger', name: 'Тигр', cr: 1, size: 'Большой', ac: 12, speed: 40, darkvision: 60, str: 17, dex: 15, con: 14, iconName: 'tiger-head',
    attacks: [
      { name: 'Укус', hit: 5, damage: '1d10+3', damageType: 'Колющий' },
      { name: 'Когти', hit: 5, damage: '1d8+3', damageType: 'Рубящий' },
    ],
    traits: 'Прыжок: пробежав 20 футов и попав когтями, сбивает с ног (спасбросок Силы СЛ 13) и кусает бонусным действием. Острый нюх.' },
  // Challenge 2 and up: a Circle of the Moon druid (challenge up to a third of the druid's level).
  { id: 'polar-bear', name: 'Белый медведь', cr: 2, size: 'Большой', ac: 12, speed: 40, swim: 30, str: 20, dex: 10, con: 16, iconName: 'bear-head',
    attacks: [
      { name: 'Укус', hit: 7, damage: '1d8+5', damageType: 'Колющий' },
      { name: 'Когти', hit: 7, damage: '2d6+5', damageType: 'Рубящий' },
    ],
    traits: 'Мультиатака: укус и когти. Острый нюх.' },
  { id: 'saber-toothed-tiger', name: 'Саблезубый тигр', cr: 2, size: 'Большой', ac: 12, speed: 40, str: 18, dex: 14, con: 15, iconName: 'tiger-head',
    attacks: [
      { name: 'Укус', hit: 6, damage: '1d10+5', damageType: 'Колющий' },
      { name: 'Когти', hit: 6, damage: '2d6+5', damageType: 'Рубящий' },
    ],
    traits: 'Прыжок: пробежав 20 футов и попав когтями, сбивает с ног (спасбросок Силы СЛ 14) и кусает бонусным действием. Острый нюх.' },
  { id: 'giant-elk', name: 'Гигантский лось', cr: 2, size: 'Огромный', ac: 14, speed: 60, str: 19, dex: 16, con: 14, iconName: 'deer',
    attacks: [
      { name: 'Таран', hit: 6, damage: '2d6+4', damageType: 'Дробящий' },
      { name: 'Копыта', hit: 6, damage: '4d8+4', damageType: 'Дробящий', note: 'Только по существу, сбитому с ног.' },
    ],
    traits: 'Натиск: пробежав 20 футов и попав тараном, +2к6 урона и спасбросок Силы СЛ 14 от падения.' },
  { id: 'ankylosaurus', name: 'Анкилозавр', cr: 3, size: 'Огромный', ac: 15, speed: 30, str: 19, dex: 11, con: 15, iconName: 'dinosaur-rex',
    attacks: [{ name: 'Хвост', hit: 7, damage: '4d6+4', damageType: 'Дробящий', note: 'Существо сбивается с ног, если проваливает спасбросок Силы СЛ 14.' }] },
  { id: 'giant-scorpion', name: 'Гигантский скорпион', cr: 3, size: 'Большой', ac: 15, speed: 40, str: 15, dex: 13, con: 15, iconName: 'scorpion',
    attacks: [
      { name: 'Клешня', hit: 4, damage: '1d8+2', damageType: 'Дробящий', note: 'Цель схвачена (высвобождение СЛ 12).' },
      { name: 'Жало', hit: 4, damage: '1d10+2', damageType: 'Колющий', note: 'Цель проходит спасбросок Телосложения СЛ 12: 4к10 урона ядом при провале, половина при успехе.' },
    ],
    traits: 'Мультиатака: две клешни и жало. Слепое зрение 60 футов.' },
  { id: 'elephant', name: 'Слон', cr: 4, size: 'Огромный', ac: 12, speed: 40, str: 22, dex: 9, con: 17, iconName: 'elephant-head',
    attacks: [
      { name: 'Бивни', hit: 8, damage: '3d8+6', damageType: 'Колющий' },
      { name: 'Топот', hit: 8, damage: '3d10+6', damageType: 'Дробящий', note: 'Только по существу, сбитому с ног.' },
    ],
    traits: 'Натиск: пробежав 20 футов и попав бивнями, спасбросок Силы СЛ 12 от падения, затем топот бонусным действием.' },
  { id: 'triceratops', name: 'Трицератопс', cr: 5, size: 'Огромный', ac: 13, speed: 50, str: 22, dex: 9, con: 17, iconName: 'dinosaur-rex',
    attacks: [
      { name: 'Рога', hit: 9, damage: '4d8+6', damageType: 'Колющий' },
      { name: 'Топот', hit: 9, damage: '3d10+6', damageType: 'Дробящий', note: 'Только по существу, сбитому с ног.' },
    ],
    traits: 'Натиск: пробежав 20 футов и попав рогами, спасбросок Силы СЛ 13 от падения, затем топот бонусным действием.' },
  { id: 'giant-shark', name: 'Гигантская акула', cr: 5, size: 'Огромный', ac: 13, speed: 0, swim: 50, str: 23, dex: 11, con: 21, iconName: 'shark-jaws',
    attacks: [{ name: 'Укус', hit: 9, damage: '3d10+6', damageType: 'Колющий' }],
    traits: 'Кровавое бешенство: преимущество на атаки по раненым существам. Дышит только под водой. Слепое зрение 60 футов.' },
  { id: 'mammoth', name: 'Мамонт', cr: 6, size: 'Огромный', ac: 13, speed: 40, str: 24, dex: 9, con: 21, iconName: 'mammoth',
    attacks: [
      { name: 'Бивни', hit: 10, damage: '4d8+7', damageType: 'Колющий' },
      { name: 'Топот', hit: 10, damage: '4d10+7', damageType: 'Дробящий', note: 'Только по существу, сбитому с ног.' },
    ],
    traits: 'Натиск: пробежав 20 футов и попав бивнями, спасбросок Силы СЛ 18 от падения, затем топот бонусным действием.' },
];

/** "1/4", "1/2", "3": a challenge rating as the books write it. */
export const challengeLabel = (cr: number): string => (cr === 1 / 8 ? '1/8' : cr === 1 / 4 ? '1/4' : cr === 1 / 2 ? '1/2' : String(cr));

const SPEEDS: [keyof BeastFormDef, string][] = [
  ['climb', 'лазание'],
  ['swim', 'плавание'],
  ['fly', 'полёт'],
];

/** The stat block of a form, in short, for its card. */
export function beastSummary(beast: BeastFormDef): string {
  const speeds = [`${beast.speed} фт`, ...SPEEDS.filter(([key]) => beast[key]).map(([key, name]) => `${name} ${beast[key]} фт`)].join(', ');
  const attacks = beast.attacks.map(
    (a) => `- **${a.name}**${a.damage ? `: +${a.hit} к попаданию, ${a.damage} ${a.damageType.toLowerCase()}` : ''}${a.note ? `. ${a.note}` : ''}`,
  );
  return [
    `**${beast.size} зверь, опасность ${challengeLabel(beast.cr)}.** КБ ${beast.ac}; скорость ${speeds}${beast.darkvision ? `; тёмное зрение ${beast.darkvision} фт` : ''}.`,
    `СИЛ ${beast.str}, ЛВК ${beast.dex}, ТЕЛ ${beast.con}.`,
    attacks.join('\n'),
    beast.traits ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Taking the shape of a known beast: a bonus action that spends a use of Wild Shape and turns the
 * form on. Temporary hit points equal to the druid level come with it; spells wait until level 18.
 */
export const beastFormFeature = (beast: BeastFormDef): FeatureDef => ({
  id: `wild-shape.${beast.id}`,
  name: `Облик: ${beast.name}`,
  description: `${beastSummary(beast)}\n\nВ облике вы сохраняете хиты, Интеллект, Мудрость, Харизму, умения и владения; получаете временные хиты, равные уровню друида.`,
  action: 'bonus',
  usesResource: { id: WILD_SHAPE },
  iconName: beast.iconName,
  stance: {
    group: 'wild-shape',
    noSpells: (ctx) => ctx.classLevel < 18,
    tempHP: (ctx) => ctx.classLevel,
    effects: [{ type: 'form', beast: beast.id }],
  },
});
