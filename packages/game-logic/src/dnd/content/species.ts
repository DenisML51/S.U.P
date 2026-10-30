import { proficiencyBonus } from '../helpers';
import type { AttributeId, BuildContext, ChoiceDef, Effect, FeatureDef, OptionDef, ResourceDef, SpeciesDef } from '../types';

/**
 * Species of the Player's Handbook 2024. In 2024 a species gives no ability score increases (the
 * background does) — only traits.
 *
 * Species spells (elf lineages, gnome lineages, tiefling legacies) are cast with Intelligence,
 * Wisdom or Charisma at the player's pick. The pick is a separate choice next to the lineage; the
 * granted spells carry a default ability (named in the trait text) because one option cannot read
 * another choice.
 */

// ------------------------------------------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------------------------------------------

const darkvision = (owner: string, range: number): FeatureDef => ({
  id: `${owner}.darkvision`,
  name: 'Тёмное зрение',
  description: `Видите в тусклом свете в пределах ${range} фт. как при ярком, а в темноте — как при тусклом (только оттенки серого).`,
  iconName: 'evil-eyes',
  effects: [{ type: 'darkvision', range }],
});

const speedFeature = (owner: string, speed: number, size: string): FeatureDef => ({
  id: `${owner}.body`,
  name: 'Размер и скорость',
  description: `Размер: ${size}. Скорость ходьбы ${speed} фт.`,
  iconName: 'sprint',
  effects: [{ type: 'baseSpeed', value: speed }],
});

const spellAbilityChoice = (hint: string): ChoiceDef => ({
  id: 'spellAbility',
  label: 'Заклинательная характеристика',
  count: 1,
  hint,
  options: {
    from: 'options',
    options: [
      { id: 'intelligence', name: 'Интеллект', description: 'Заклинания вида творятся через Интеллект.' },
      { id: 'wisdom', name: 'Мудрость', description: 'Заклинания вида творятся через Мудрость.' },
      { id: 'charisma', name: 'Харизма', description: 'Заклинания вида творятся через Харизму.' },
    ],
  },
});

const ONCE_FREE = 'Раз в долгий отдых без ячейки; также можно тратить ячейки.';

/** A species spell list by character level: cantrip at 1, a 1st-level spell at 3, a 2nd-level at 5. */
const spellsByLevel =
  (ability: AttributeId, cantrip: string, third: string, fifth: string) =>
  (ctx: BuildContext): Effect[] => {
    const effects: Effect[] = [{ type: 'spell', spell: cantrip, alwaysPrepared: true, ability }];
    if (ctx.level >= 3) effects.push({ type: 'spell', spell: third, alwaysPrepared: true, ability, note: ONCE_FREE });
    if (ctx.level >= 5) effects.push({ type: 'spell', spell: fifth, alwaysPrepared: true, ability, note: ONCE_FREE });
    return effects;
  };

// ------------------------------------------------------------------------------------------------
// Aasimar
// ------------------------------------------------------------------------------------------------

const AASIMAR: SpeciesDef = {
  id: 'aasimar',
  name: 'Аасимар',
  description:
    'Смертные, в чьих душах горит искра Верхних планов. Небесное наследие дарует им целительное касание и способность на время явить свою истинную, сияющую или пугающую суть.',
  size: 'Средний или Маленький',
  speed: 30,
  features: [
    speedFeature('aasimar', 30, 'Средний или Маленький (выбор при создании)'),
    {
      id: 'aasimar.celestial-resistance',
      name: 'Небесное сопротивление',
      description: 'Сопротивление некротическому урону и урону излучением.',
      effects: [
        { type: 'resistance', damageType: 'Некротический' },
        { type: 'resistance', damageType: 'Лучистый' },
      ],
      iconName: 'magic-shield',
    },
    darkvision('aasimar', 60),
    {
      id: 'aasimar.healing-hands',
      name: 'Исцеляющие руки',
      description:
        'Действием Магия касаетесь существа и бросаете количество к4, равное бонусу мастерства; существо восстанавливает столько хитов. Раз в долгий отдых.',
      action: 'action',
      resource: { id: 'aasimar.healing-hands', name: 'Исцеляющие руки', max: 1, recharge: 'long', iconName: 'healing' },
      damage: (ctx) => `${ctx.proficiencyBonus}d4`,
      damageType: 'Лечение',
      iconName: 'healing',
    },
    {
      id: 'aasimar.light-bearer',
      name: 'Несущий свет',
      iconName: 'sunbeams',
      description: 'Знаете заговор *Свет*; заклинательная характеристика — Харизма.',
      effects: [{ type: 'spell', spell: 'light', alwaysPrepared: true, ability: 'charisma' }],
    },
    {
      id: 'aasimar.celestial-revelation',
      minLevel: 3,
      name: 'Небесное откровение',
      description:
        'С 3-го уровня. Бонусным действием преображаетесь на 1 минуту (пока не окончите досрочно, без действия). Раз в ход, нанося урон атакой или заклинанием, одной цели добавляете урон, равный бонусу мастерства: излучением (Крылья, Сияние) или некротический (Покров). Форму выбираете при каждом использовании:\n' +
        '- **Небесные крылья** — скорость полёта равна скорости ходьбы.\n' +
        '- **Внутреннее сияние** — яркий свет 10 фт. и тусклый ещё 10 фт.; в конце каждого вашего хода все существа в 10 фт. от вас получают урон излучением, равный бонусу мастерства.\n' +
        '- **Некротический покров** — существа (кроме союзников) в 10 фт. от вас проходят спасбросок Харизмы (Сл 8 + мод. Харизмы + бонус мастерства), при провале Испуганы до конца вашего следующего хода.\n' +
        'Раз в долгий отдых.',
      action: 'bonus',
      resource: {
        id: 'aasimar.celestial-revelation',
        name: 'Небесное откровение',
        max: 1,
        recharge: 'long',
        iconName: 'sun-radiations',
      },
      iconName: 'sun-radiations',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Dragonborn
// ------------------------------------------------------------------------------------------------

const BREATH_WEAPON_USES: ResourceDef = {
  id: 'dragonborn.breath-weapon',
  name: 'Оружие дыхания',
  max: proficiencyBonus,
  recharge: 'long',
  iconName: 'flame',
};

const DRAGONS: Array<{ id: string; name: string; damageType: string; label: string }> = [
  { id: 'black', name: 'Чёрный дракон', damageType: 'Кислота', label: 'кислотой' },
  { id: 'blue', name: 'Синий дракон', damageType: 'Электричество', label: 'электричеством' },
  { id: 'brass', name: 'Латунный дракон', damageType: 'Огонь', label: 'огнём' },
  { id: 'bronze', name: 'Бронзовый дракон', damageType: 'Электричество', label: 'электричеством' },
  { id: 'copper', name: 'Медный дракон', damageType: 'Кислота', label: 'кислотой' },
  { id: 'gold', name: 'Золотой дракон', damageType: 'Огонь', label: 'огнём' },
  { id: 'green', name: 'Зелёный дракон', damageType: 'Яд', label: 'ядом' },
  { id: 'red', name: 'Красный дракон', damageType: 'Огонь', label: 'огнём' },
  { id: 'silver', name: 'Серебряный дракон', damageType: 'Холод', label: 'холодом' },
  { id: 'white', name: 'Белый дракон', damageType: 'Холод', label: 'холодом' },
];

const BREATH_ICONS: Record<string, string> = {
  Кислота: 'acid',
  Электричество: 'lightning-helix',
  Огонь: 'flame',
  Яд: 'poison-cloud',
  Холод: 'snowflake-2',
};

const draconicAncestry: OptionDef[] = DRAGONS.map((dragon) => ({
  id: dragon.id,
  name: dragon.name,
  description: `Оружие дыхания и сопротивление — ${dragon.damageType.toLowerCase()}.`,
  effects: [{ type: 'resistance', damageType: dragon.damageType }],
  features: [
    {
      id: 'dragonborn.breath-weapon',
      name: 'Оружие дыхания',
      description:
        `Заменяете одну атаку действия Атака выдохом ${dragon.label}: конус 15 фт. или линия 30 × 5 фт. ` +
        'Существа в области проходят спасбросок Ловкости (Сл 8 + мод. Телосложения + бонус мастерства): провал — 1к10 урона, успех — половина. ' +
        'Урон растёт до 2к10 на 5-м, 3к10 на 11-м и 4к10 на 17-м уровне. Использований — бонус мастерства за долгий отдых.',
      action: 'action',
      resource: BREATH_WEAPON_USES,
      damage: (ctx) => `${ctx.level >= 17 ? 4 : ctx.level >= 11 ? 3 : ctx.level >= 5 ? 2 : 1}d10`,
      damageType: dragon.damageType,
      saveAttribute: 'dexterity',
      saveDC: (ctx) => 8 + ctx.modifier('constitution') + ctx.proficiencyBonus,
      iconName: BREATH_ICONS[dragon.damageType],
    },
  ],
}));

const DRAGONBORN: SpeciesDef = {
  id: 'dragonborn',
  name: 'Драконорождённый',
  description:
    'Потомки драконов или их избранники, гордые и статные. В их чешуе и дыхании живёт стихия предка — кислота, молния, огонь, яд или холод.',
  size: 'Средний',
  speed: 30,
  features: [
    speedFeature('dragonborn', 30, 'Средний'),
    {
      id: 'dragonborn.ancestry',
      name: 'Драконий предок',
      description:
        'Выберите вид дракона-предка: он задаёт тип урона Оружия дыхания и тип урона, к которому у вас сопротивление.',
      choices: [{ id: 'lineage', label: 'Драконий предок', count: 1, options: { from: 'options', options: draconicAncestry } }],
    },
    darkvision('dragonborn', 60),
    {
      id: 'dragonborn.draconic-flight',
      minLevel: 5,
      name: 'Драконий полёт',
      description:
        'С 5-го уровня. Бонусным действием отращиваете призрачные крылья на 10 минут (или до недееспособности / досрочного окончания): скорость полёта равна скорости ходьбы. Раз в долгий отдых.',
      action: 'bonus',
      resource: {
        id: 'dragonborn.draconic-flight',
        name: 'Драконий полёт',
        max: 1,
        recharge: 'long',
        iconName: 'feather',
      },
      stance: { effects: [{ type: 'movement', mode: 'fly' }] },
      iconName: 'feather',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Dwarf
// ------------------------------------------------------------------------------------------------

const DWARF: SpeciesDef = {
  id: 'dwarf',
  name: 'Дварф',
  description:
    'Крепкий народ гор и подземных твердынь, выкованный, по преданию, богами из камня и металла. Упрямы, выносливы и чувствуют камень под ногами.',
  size: 'Средний',
  speed: 30,
  features: [
    speedFeature('dwarf', 30, 'Средний'),
    darkvision('dwarf', 120),
    {
      id: 'dwarf.resilience',
      name: 'Дварфийская устойчивость',
      description: 'Сопротивление урону ядом и преимущество на спасброски от состояния Отравленный.',
      effects: [{ type: 'resistance', damageType: 'Яд' }],
      iconName: 'poison-bottle',
    },
    {
      id: 'dwarf.toughness',
      name: 'Дварфийская выдержка',
      iconName: 'heart-plus',
      description: 'Максимум хитов больше на 1 за каждый уровень персонажа.',
      effects: [{ type: 'hpPerLevel', amount: 1 }],
    },
    {
      id: 'dwarf.stonecunning',
      name: 'Знание камня',
      description:
        'Бонусным действием получаете чувство вибраций в радиусе 60 фт. на 10 минут; нужно стоять на каменной поверхности или касаться её. Использований — бонус мастерства за долгий отдых.',
      action: 'bonus',
      resource: {
        id: 'dwarf.stonecunning',
        name: 'Знание камня',
        max: proficiencyBonus,
        recharge: 'long',
        iconName: 'radar-sweep',
      },
      iconName: 'radar-sweep',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Elf
// ------------------------------------------------------------------------------------------------

const ELF_LINEAGES: OptionDef[] = [
  {
    id: 'drow',
    name: 'Дроу',
    description:
      'Тёмное зрение 120 фт. Заговор *Пляшущие огоньки*; с 3-го уровня *Огонь фей*, с 5-го — *Тьма*.',
    effects: spellsByLevel('intelligence', 'dancing-lights', 'faerie-fire', 'darkness'),
    features: [
      {
        id: 'elf.drow-darkvision',
        name: 'Тёмное зрение дроу',
        description: 'Дальность Тёмного зрения увеличивается до 120 фт.',
        effects: [{ type: 'darkvision', range: 120 }],
        iconName: 'evil-eyes',
      },
    ],
  },
  {
    id: 'high-elf',
    name: 'Высший эльф',
    description:
      'Заговор *Фокусы* (после долгого отдыха можно заменить другим заговором волшебника); с 3-го уровня *Обнаружение магии*, с 5-го — *Туманный шаг*.',
    effects: spellsByLevel('intelligence', 'prestidigitation', 'detect-magic', 'misty-step'),
  },
  {
    id: 'wood-elf',
    name: 'Лесной эльф',
    description:
      'Скорость 35 фт. Заговор *Искусство друидов*; с 3-го уровня *Скороход*, с 5-го — *Бесследное передвижение*.',
    effects: (ctx) => [{ type: 'baseSpeed', value: 35 }, ...spellsByLevel('intelligence', 'druidcraft', 'longstrider', 'pass-without-trace')(ctx)],
  },
];

const ELF: SpeciesDef = {
  id: 'elf',
  name: 'Эльф',
  description:
    'Долгоживущий народ, родом из Страны Фей. Не спят, а погружаются в транс, зорки и чутки, и несут в себе магию своей линии — дроу, высших или лесных эльфов.',
  size: 'Средний',
  speed: 30,
  features: [
    speedFeature('elf', 30, 'Средний'),
    darkvision('elf', 60),
    {
      id: 'elf.lineage',
      name: 'Эльфийская линия',
      description:
        `Выберите линию: она даёт заговор на 1-м уровне и заклинания на 3-м и 5-м. ${ONCE_FREE} ` +
        'Заклинательная характеристика — Интеллект, Мудрость или Харизма на ваш выбор (по умолчанию Интеллект).',
      choices: [
        { id: 'lineage', label: 'Происхождение', count: 1, options: { from: 'options', options: ELF_LINEAGES } },
        spellAbilityChoice('Характеристика для заклинаний эльфийской линии'),
      ],
      iconName: 'magic-swirl',
    },
    {
      id: 'elf.fey-ancestry',
      name: 'Наследие фей',
      description: 'Преимущество на спасброски от состояния Очарованный.',
      iconName: 'charm',
    },
    {
      id: 'elf.keen-senses',
      name: 'Обострённые чувства',
      iconName: 'all-seeing-eye',
      description: 'Владение одним навыком на выбор: Проницательность, Внимательность или Выживание.',
      choices: [
        { id: 'skill', label: 'Навык', count: 1, options: { from: 'skills', list: ['insight', 'perception', 'survival'] } },
      ],
    },
    {
      id: 'elf.trance',
      name: 'Транс',
      iconName: 'moon',
      description:
        'Не нуждаетесь во сне, и магия не может вас усыпить. Долгий отдых можно завершить за 4 часа медитативного транса, оставаясь в сознании.',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Gnome
// ------------------------------------------------------------------------------------------------

const GNOME_LINEAGES: OptionDef[] = [
  {
    id: 'forest-gnome',
    name: 'Лесной гном',
    description: 'Заговор *Малая иллюзия* и всегда подготовленное *Разговор с животными*.',
    effects: [
      { type: 'spell', spell: 'minor-illusion', alwaysPrepared: true, ability: 'intelligence' },
      {
        type: 'spell',
        spell: 'speak-with-animals',
        alwaysPrepared: true,
        ability: 'intelligence',
        note: 'Без ячейки столько раз, каков бонус мастерства, за долгий отдых; также можно тратить ячейки.',
      },
    ],
    features: [
      {
        id: 'gnome.speak-with-animals',
        name: 'Разговор с животными',
        description:
          'Творите *Разговор с животными* без ячейки заклинаний. Использований — бонус мастерства за долгий отдых.',
        action: 'action',
        resource: {
          id: 'gnome.speak-with-animals',
          name: 'Разговор с животными',
          max: proficiencyBonus,
          recharge: 'long',
          iconName: 'human-ear',
        },
        iconName: 'human-ear',
      },
    ],
  },
  {
    id: 'rock-gnome',
    name: 'Скальный гном',
    description: 'Заговоры *Починка* и *Фокусы*; умеете мастерить заводные устройства.',
    effects: [
      { type: 'spell', spell: 'mending', alwaysPrepared: true, ability: 'intelligence' },
      { type: 'spell', spell: 'prestidigitation', alwaysPrepared: true, ability: 'intelligence' },
    ],
    features: [
      {
        id: 'gnome.clockwork-device',
        name: 'Заводное устройство',
        description:
          'Потратив 10 минут на сотворение *Фокусов*, создаёте Крошечное заводное устройство (КД 5, 1 хит) с одним эффектом этого заговора; оно срабатывает, когда существо бонусным действием касается его. Одновременно — до трёх устройств; каждое разваливается через 8 часов или по вашему касанию (действие Использовать).',
        iconName: 'gear-hammer',
      },
    ],
  },
];

const GNOME: SpeciesDef = {
  id: 'gnome',
  name: 'Гном',
  description:
    'Маленький, любознательный и изобретательный народ. Одни тянутся к тайнам леса и говорят со зверями, другие корпят над хитроумными механизмами.',
  size: 'Маленький',
  speed: 30,
  features: [
    speedFeature('gnome', 30, 'Маленький'),
    darkvision('gnome', 60),
    {
      id: 'gnome.cunning',
      name: 'Гномья хитрость',
      description: 'Преимущество на спасброски Интеллекта, Мудрости и Харизмы.',
      iconName: 'brain',
    },
    {
      id: 'gnome.lineage',
      name: 'Гномья линия',
      description:
        'Выберите линию: лесные или скальные гномы. Заклинательная характеристика её заклинаний — Интеллект, Мудрость или Харизма на ваш выбор (по умолчанию Интеллект).',
      choices: [
        { id: 'lineage', label: 'Происхождение', count: 1, options: { from: 'options', options: GNOME_LINEAGES } },
        spellAbilityChoice('Характеристика для заклинаний гномьей линии'),
      ],
      iconName: 'magic-swirl',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Goliath
// ------------------------------------------------------------------------------------------------

const GIANT_ANCESTRY_USES: ResourceDef = {
  id: 'goliath.giant-ancestry',
  name: 'Наследие великанов',
  max: proficiencyBonus,
  recharge: 'long',
};

const giantOption = (id: string, name: string, description: string, feature: Omit<FeatureDef, 'id' | 'name' | 'description' | 'resource'>): OptionDef => ({
  id,
  name,
  description,
  features: [
    {
      id: `goliath.${id}`,
      name,
      description: `${description} Использований — бонус мастерства за долгий отдых.`,
      resource: { ...GIANT_ANCESTRY_USES, iconName: feature.iconName },
      ...feature,
    },
  ],
});

const GIANT_ANCESTRIES: OptionDef[] = [
  giantOption('clouds-jaunt', 'Облачный шаг (облачный великан)', 'Бонусным действием телепортируетесь на 30 фт. в видимое свободное пространство.', {
    action: 'bonus',
    iconName: 'teleport',
  }),
  giantOption('fires-burn', 'Огненный ожог (огненный великан)', 'Попав по цели броском атаки и нанеся урон, добавляете ей 1к10 урона огнём.', {
    action: 'passive',
    damage: '1d10',
    damageType: 'Огонь',
    iconName: 'flame',
  }),
  giantOption(
    'frosts-chill',
    'Морозный холод (ледяной великан)',
    'Попав по цели броском атаки и нанеся урон, добавляете ей 1к6 урона холодом, а её скорость снижается на 10 фт. до начала вашего следующего хода.',
    { action: 'passive', damage: '1d6', damageType: 'Холод', iconName: 'snowflake-2' },
  ),
  giantOption('hills-tumble', 'Холмовой обвал (холмовой великан)', 'Попав броском атаки по существу Большого размера или меньше и нанеся урон, сбиваете его с ног (Опрокинутый).', {
    action: 'passive',
    iconName: 'falling',
  }),
  giantOption(
    'stones-endurance',
    'Каменная стойкость (каменный великан)',
    'Получая урон, реакцией бросаете 1к12, добавляете модификатор Телосложения и уменьшаете урон на итог.',
    { action: 'reaction', iconName: 'checked-shield' },
  ),
  giantOption(
    'storms-thunder',
    'Грозовой гром (штормовой великан)',
    'Когда существо в пределах 60 фт. наносит вам урон, реакцией наносите ему 1к8 урона звуком.',
    { action: 'reaction', damage: '1d8', damageType: 'Звук', iconName: 'lightning-helix' },
  ),
];

const GOLIATH: SpeciesDef = {
  id: 'goliath',
  name: 'Голиаф',
  description:
    'Рослые потомки великанов, живущие на горных вершинах. В каждом голиафе дремлет сила одного из великаньих родов, а со временем он способен и сам вырасти до их размеров.',
  size: 'Средний',
  speed: 35,
  features: [
    speedFeature('goliath', 35, 'Средний'),
    {
      id: 'goliath.giant-ancestry',
      name: 'Наследие великанов',
      description: 'Выберите род великанов-предков и получите его дар. Использований — бонус мастерства за долгий отдых.',
      choices: [{ id: 'lineage', label: 'Происхождение', count: 1, options: { from: 'options', options: GIANT_ANCESTRIES } }],
    },
    {
      id: 'goliath.large-form',
      minLevel: 5,
      name: 'Большая форма',
      description:
        'С 5-го уровня. Бонусным действием становитесь Большим на 10 минут (если хватает места): преимущество на проверки Силы, скорость +10 фт. Раз в долгий отдых.',
      action: 'bonus',
      resource: { id: 'goliath.large-form', name: 'Большая форма', max: 1, recharge: 'long', iconName: 'mailed-fist' },
      stance: { effects: [{ type: 'advantage', on: ['check:strength'] }, { type: 'speed', amount: 10 }] },
      iconName: 'mailed-fist',
    },
    {
      id: 'goliath.powerful-build',
      name: 'Мощное телосложение',
      description:
        'Преимущество на проверки характеристик, чтобы окончить состояние Схваченный. При расчёте грузоподъёмности считаетесь на размер больше.',
      iconName: 'grapple',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Halfling
// ------------------------------------------------------------------------------------------------

const HALFLING: SpeciesDef = {
  id: 'halfling',
  name: 'Полурослик',
  description:
    'Невысокий, жизнерадостный и удивительно везучий народ, ценящий дом и уют, но не боящийся дороги. Легко проскальзывают мимо больших существ и не теряют присутствия духа.',
  size: 'Маленький',
  speed: 30,
  features: [
    speedFeature('halfling', 30, 'Маленький'),
    {
      id: 'halfling.brave',
      name: 'Храбрость',
      description: 'Преимущество на спасброски от состояния Испуганный.',
      iconName: 'checked-shield',
    },
    {
      id: 'halfling.nimbleness',
      name: 'Проворство полуросликов',
      description: 'Можете проходить через пространство любого существа, которое больше вас хотя бы на один размер, но не можете там остановиться.',
      iconName: 'dodge',
    },
    {
      id: 'halfling.luck',
      name: 'Везение',
      description: 'Выпала 1 на к20 при испытании к20 — перебросьте кость и используйте новый результат.',
      iconName: 'rolling-dices',
    },
    {
      id: 'halfling.naturally-stealthy',
      name: 'Естественная скрытность',
      description: 'Можете совершить действие Спрятаться, даже если вас заслоняет лишь существо хотя бы на размер больше вас.',
      iconName: 'hooded-assassin',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Human
// ------------------------------------------------------------------------------------------------

const HUMAN: SpeciesDef = {
  id: 'human',
  name: 'Человек',
  description:
    'Самый распространённый и разнообразный народ мультивселенной. Короткая жизнь людей с лихвой окупается упорством, находчивостью и умением освоить что угодно.',
  size: 'Средний или Маленький',
  speed: 30,
  features: [
    speedFeature('human', 30, 'Средний или Маленький (выбор при создании)'),
    {
      id: 'human.resourceful',
      name: 'Находчивость',
      description: 'Получаете Героическое вдохновение каждый раз, когда заканчиваете долгий отдых.',
      iconName: 'sparkles',
    },
    {
      id: 'human.skillful',
      name: 'Умелость',
      iconName: 'book-cover',
      description: 'Владение одним навыком на выбор.',
      choices: [{ id: 'skill', label: 'Навык', count: 1, options: { from: 'skills' } }],
    },
    {
      id: 'human.versatile',
      name: 'Разносторонность',
      iconName: 'sparkles',
      description: 'Получаете черту происхождения на выбор (рекомендуется Умелец).',
      choices: [{ id: 'feat', label: 'Черта происхождения', count: 1, options: { from: 'feats', categories: ['origin'] } }],
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Orc
// ------------------------------------------------------------------------------------------------

const ORC: SpeciesDef = {
  id: 'orc',
  name: 'Орк',
  description:
    'Сильный и выносливый народ, наделённый, по преданию, неукротимым духом своего бога-создателя. Орки видят во тьме, рвутся вперёд и не падают там, где пал бы другой.',
  size: 'Средний',
  speed: 30,
  features: [
    speedFeature('orc', 30, 'Средний'),
    {
      id: 'orc.adrenaline-rush',
      name: 'Выброс адреналина',
      description:
        'Совершаете действие Рывок бонусным действием и получаете временные хиты, равные бонусу мастерства. Использований — бонус мастерства за короткий или долгий отдых.',
      action: 'bonus',
      resource: {
        id: 'orc.adrenaline-rush',
        name: 'Выброс адреналина',
        max: proficiencyBonus,
        recharge: 'shortOrLong',
        iconName: 'sprint',
      },
      iconName: 'sprint',
    },
    darkvision('orc', 120),
    {
      id: 'orc.relentless-endurance',
      name: 'Непоколебимая стойкость',
      description: 'Когда хиты опускаются до 0, но вы не умираете сразу, хиты становятся равны 1. Раз в долгий отдых.',
      action: 'passive',
      resource: {
        id: 'orc.relentless-endurance',
        name: 'Непоколебимая стойкость',
        max: 1,
        recharge: 'long',
        iconName: 'heart-plus',
      },
      iconName: 'heart-plus',
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Tiefling
// ------------------------------------------------------------------------------------------------

const TIEFLING_LEGACIES: OptionDef[] = [
  {
    id: 'abyssal',
    name: 'Бездна',
    description: 'Сопротивление яду. Заговор *Ядовитые брызги*; с 3-го уровня *Луч болезни*, с 5-го — *Удержание личности*.',
    effects: (ctx) => [
      { type: 'resistance', damageType: 'Яд' },
      ...spellsByLevel('charisma', 'poison-spray', 'ray-of-sickness', 'hold-person')(ctx),
    ],
  },
  {
    id: 'chthonic',
    name: 'Хтоническое',
    description: 'Сопротивление некротическому урону. Заговор *Леденящее прикосновение*; с 3-го уровня *Ложная жизнь*, с 5-го — *Луч слабости*.',
    effects: (ctx) => [
      { type: 'resistance', damageType: 'Некротический' },
      ...spellsByLevel('charisma', 'chill-touch', 'false-life', 'ray-of-enfeeblement')(ctx),
    ],
  },
  {
    id: 'infernal',
    name: 'Инфернальное',
    description: 'Сопротивление огню. Заговор *Огненный снаряд*; с 3-го уровня *Адское возмездие*, с 5-го — *Тьма*.',
    effects: (ctx) => [
      { type: 'resistance', damageType: 'Огонь' },
      ...spellsByLevel('charisma', 'fire-bolt', 'hellish-rebuke', 'darkness')(ctx),
    ],
  },
];

const TIEFLING: SpeciesDef = {
  id: 'tiefling',
  name: 'Тифлинг',
  description:
    'Смертные, несущие след Нижних планов — по крови или по воле судьбы. Их наследие бывает связано с Бездной, Девятью Преисподними или мрачным Карцери и проявляется в магии.',
  size: 'Средний или Маленький',
  speed: 30,
  features: [
    speedFeature('tiefling', 30, 'Средний или Маленький (выбор при создании)'),
    darkvision('tiefling', 60),
    {
      id: 'tiefling.legacy',
      name: 'Дьявольское наследие',
      description:
        `Выберите наследие: оно даёт сопротивление, заговор на 1-м уровне и заклинания на 3-м и 5-м. ${ONCE_FREE} ` +
        'Заклинательная характеристика — Интеллект, Мудрость или Харизма на ваш выбор (по умолчанию Харизма); она же действует для *Чудотворства*.',
      choices: [
        { id: 'lineage', label: 'Происхождение', count: 1, options: { from: 'options', options: TIEFLING_LEGACIES } },
        spellAbilityChoice('Характеристика для заклинаний дьявольского наследия'),
      ],
      iconName: 'pentagram-rose',
    },
    {
      id: 'tiefling.otherworldly-presence',
      name: 'Потустороннее присутствие',
      iconName: 'ghost',
      description: 'Знаете заговор *Чудотворство*; характеристика та же, что у Дьявольского наследия.',
      effects: [{ type: 'spell', spell: 'thaumaturgy', alwaysPrepared: true, ability: 'charisma' }],
    },
  ],
};

export const SPECIES: SpeciesDef[] = [AASIMAR, DRAGONBORN, DWARF, ELF, GNOME, GOLIATH, HALFLING, HUMAN, ORC, TIEFLING];
