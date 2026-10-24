import type { ArmorDef, GearDef, KitOption, MasteryDef, WeaponDef } from '../types';

/**
 * Equipment of the D&D 2024 Player's Handbook: weapon masteries, weapons, armour, adventuring gear,
 * tools, ammunition, packs and the class starting kits. Russian names follow dnd.su.
 * Weight is in pounds, cost in gold pieces (1 sp = 0.1, 1 cp = 0.01).
 */

// ------------------------------------------------------------------------------------------------
// Weapon mastery properties
// ------------------------------------------------------------------------------------------------

export const MASTERIES: MasteryDef[] = [
  {
    id: 'cleave',
    name: 'Прорубающее',
    description:
      'Попав по существу рукопашной атакой этим оружием, можно сразу атаковать им же в рукопашную второе существо, ' +
      'которое находится в пределах 5 футов от первого и в вашей досягаемости. При попадании второе существо получает урон ' +
      'оружия без модификатора характеристики (если только он не отрицательный). Не чаще одного раза за ход.',
  },
  {
    id: 'graze',
    name: 'Секущее',
    description:
      'Если атака этим оружием по существу промахивается, существо всё равно получает урон, равный модификатору ' +
      'характеристики, использованной для броска атаки, того же типа, что и урон оружия. Этот урон растёт только вместе ' +
      'с самим модификатором.',
  },
  {
    id: 'nick',
    name: 'Быстрое',
    description:
      'Дополнительную атаку, которую даёт свойство «Лёгкое», можно совершить частью действия «Атака», а не бонусным ' +
      'действием. Не чаще одного раза за ход.',
  },
  {
    id: 'push',
    name: 'Отталкивающее',
    description:
      'При попадании этим оружием можно оттолкнуть существо размером не больше Большого на расстояние до 10 футов ' +
      'прямо от себя.',
  },
  {
    id: 'sap',
    name: 'Ослабляющее',
    description:
      'При попадании этим оружием существо совершает свой следующий бросок атаки с помехой, если делает его до начала ' +
      'вашего следующего хода.',
  },
  {
    id: 'slow',
    name: 'Замедляющее',
    description:
      'Если вы попали этим оружием и нанесли урон, Скорость существа уменьшается на 10 футов до начала вашего следующего ' +
      'хода. Несколько попаданий таким оружием не уменьшают Скорость больше чем на 10 футов.',
  },
  {
    id: 'topple',
    name: 'Опрокидывающее',
    description:
      'При попадании этим оружием можно заставить существо пройти спасбросок Телосложения со Сл 8 + модификатор ' +
      'характеристики, использованной для атаки, + бонус владения. При провале существо получает состояние «Опрокинутый».',
  },
  {
    id: 'vex',
    name: 'Отвлекающее',
    description:
      'Если вы попали этим оружием и нанесли урон, ваш следующий бросок атаки по этому существу до конца вашего ' +
      'следующего хода совершается с преимуществом.',
  },
];

// ------------------------------------------------------------------------------------------------
// Weapons
// ------------------------------------------------------------------------------------------------

const P = 'Колющий';
const S = 'Рубящий';
const B = 'Дробящий';

export const WEAPONS: WeaponDef[] = [
  // Simple melee
  { id: 'club', name: 'Дубинка', category: 'simple', kind: 'melee', damage: '1d4', damageType: B, properties: ['Лёгкое'], mastery: 'slow', weight: 2, cost: 0.1 },
  { id: 'dagger', name: 'Кинжал', category: 'simple', kind: 'melee', damage: '1d4', damageType: P, properties: ['Лёгкое', 'Фехтовальное', 'Метательное (дис. 20/60)'], mastery: 'nick', weight: 1, cost: 2 },
  { id: 'greatclub', name: 'Палица', category: 'simple', kind: 'melee', damage: '1d8', damageType: B, properties: ['Двуручное'], mastery: 'push', weight: 10, cost: 0.2 },
  { id: 'handaxe', name: 'Одноручный топор', category: 'simple', kind: 'melee', damage: '1d6', damageType: S, properties: ['Лёгкое', 'Метательное (дис. 20/60)'], mastery: 'vex', weight: 2, cost: 5 },
  { id: 'javelin', name: 'Метательное копьё', category: 'simple', kind: 'melee', damage: '1d6', damageType: P, properties: ['Метательное (дис. 30/120)'], mastery: 'slow', weight: 2, cost: 0.5 },
  { id: 'light-hammer', name: 'Лёгкий молот', category: 'simple', kind: 'melee', damage: '1d4', damageType: B, properties: ['Лёгкое', 'Метательное (дис. 20/60)'], mastery: 'nick', weight: 2, cost: 2 },
  { id: 'mace', name: 'Булава', category: 'simple', kind: 'melee', damage: '1d6', damageType: B, properties: [], mastery: 'sap', weight: 4, cost: 5 },
  { id: 'quarterstaff', name: 'Боевой посох', category: 'simple', kind: 'melee', damage: '1d6', damageType: B, properties: ['Универсальное (1d8)'], mastery: 'topple', weight: 4, cost: 0.2 },
  { id: 'sickle', name: 'Серп', category: 'simple', kind: 'melee', damage: '1d4', damageType: S, properties: ['Лёгкое'], mastery: 'nick', weight: 2, cost: 1 },
  { id: 'spear', name: 'Копьё', category: 'simple', kind: 'melee', damage: '1d6', damageType: P, properties: ['Метательное (дис. 20/60)', 'Универсальное (1d8)'], mastery: 'sap', weight: 3, cost: 1 },

  // Simple ranged
  { id: 'dart', name: 'Дротик', category: 'simple', kind: 'ranged', damage: '1d4', damageType: P, properties: ['Фехтовальное', 'Метательное (дис. 20/60)'], mastery: 'vex', weight: 0.25, cost: 0.05 },
  { id: 'light-crossbow', name: 'Лёгкий арбалет', category: 'simple', kind: 'ranged', damage: '1d8', damageType: P, properties: ['Боеприпасы (дис. 80/320; болт)', 'Перезарядка', 'Двуручное'], mastery: 'slow', weight: 5, cost: 25, ammunition: 'Болты' },
  { id: 'shortbow', name: 'Короткий лук', category: 'simple', kind: 'ranged', damage: '1d6', damageType: P, properties: ['Боеприпасы (дис. 80/320; стрела)', 'Двуручное'], mastery: 'vex', weight: 2, cost: 25, ammunition: 'Стрелы' },
  { id: 'sling', name: 'Праща', category: 'simple', kind: 'ranged', damage: '1d4', damageType: B, properties: ['Боеприпасы (дис. 30/120; снаряд для пращи)'], mastery: 'slow', weight: 0, cost: 0.1, ammunition: 'Снаряды для пращи' },

  // Martial melee
  { id: 'battleaxe', name: 'Боевой топор', category: 'martial', kind: 'melee', damage: '1d8', damageType: S, properties: ['Универсальное (1d10)'], mastery: 'topple', weight: 4, cost: 10 },
  { id: 'flail', name: 'Цеп', category: 'martial', kind: 'melee', damage: '1d8', damageType: B, properties: [], mastery: 'sap', weight: 2, cost: 10 },
  { id: 'glaive', name: 'Глефа', category: 'martial', kind: 'melee', damage: '1d10', damageType: S, properties: ['Тяжёлое', 'Досягаемость', 'Двуручное'], mastery: 'graze', weight: 6, cost: 20 },
  { id: 'greataxe', name: 'Секира', category: 'martial', kind: 'melee', damage: '1d12', damageType: S, properties: ['Тяжёлое', 'Двуручное'], mastery: 'cleave', weight: 7, cost: 30 },
  { id: 'greatsword', name: 'Двуручный меч', category: 'martial', kind: 'melee', damage: '2d6', damageType: S, properties: ['Тяжёлое', 'Двуручное'], mastery: 'graze', weight: 6, cost: 50 },
  { id: 'halberd', name: 'Алебарда', category: 'martial', kind: 'melee', damage: '1d10', damageType: S, properties: ['Тяжёлое', 'Досягаемость', 'Двуручное'], mastery: 'cleave', weight: 6, cost: 20 },
  { id: 'lance', name: 'Кавалерийское копьё', category: 'martial', kind: 'melee', damage: '1d10', damageType: P, properties: ['Тяжёлое', 'Досягаемость', 'Двуручное (если не верхом)'], mastery: 'topple', weight: 6, cost: 10 },
  { id: 'longsword', name: 'Длинный меч', category: 'martial', kind: 'melee', damage: '1d8', damageType: S, properties: ['Универсальное (1d10)'], mastery: 'sap', weight: 3, cost: 15 },
  { id: 'maul', name: 'Молот', category: 'martial', kind: 'melee', damage: '2d6', damageType: B, properties: ['Тяжёлое', 'Двуручное'], mastery: 'topple', weight: 10, cost: 10 },
  { id: 'morningstar', name: 'Моргенштерн', category: 'martial', kind: 'melee', damage: '1d8', damageType: P, properties: [], mastery: 'sap', weight: 4, cost: 15 },
  { id: 'pike', name: 'Пика', category: 'martial', kind: 'melee', damage: '1d10', damageType: P, properties: ['Тяжёлое', 'Досягаемость', 'Двуручное'], mastery: 'push', weight: 18, cost: 5 },
  { id: 'rapier', name: 'Рапира', category: 'martial', kind: 'melee', damage: '1d8', damageType: P, properties: ['Фехтовальное'], mastery: 'vex', weight: 2, cost: 25 },
  { id: 'scimitar', name: 'Скимитар', category: 'martial', kind: 'melee', damage: '1d6', damageType: S, properties: ['Лёгкое', 'Фехтовальное'], mastery: 'nick', weight: 3, cost: 25 },
  { id: 'shortsword', name: 'Короткий меч', category: 'martial', kind: 'melee', damage: '1d6', damageType: P, properties: ['Лёгкое', 'Фехтовальное'], mastery: 'vex', weight: 2, cost: 10 },
  { id: 'trident', name: 'Трезубец', category: 'martial', kind: 'melee', damage: '1d8', damageType: P, properties: ['Метательное (дис. 20/60)', 'Универсальное (1d10)'], mastery: 'topple', weight: 4, cost: 5 },
  { id: 'warhammer', name: 'Боевой молот', category: 'martial', kind: 'melee', damage: '1d8', damageType: B, properties: ['Универсальное (1d10)'], mastery: 'push', weight: 5, cost: 15 },
  { id: 'war-pick', name: 'Клевец', category: 'martial', kind: 'melee', damage: '1d8', damageType: P, properties: ['Универсальное (1d10)'], mastery: 'sap', weight: 2, cost: 5 },
  { id: 'whip', name: 'Кнут', category: 'martial', kind: 'melee', damage: '1d4', damageType: S, properties: ['Фехтовальное', 'Досягаемость'], mastery: 'slow', weight: 3, cost: 2 },

  // Martial ranged
  { id: 'blowgun', name: 'Духовая трубка', category: 'martial', kind: 'ranged', damage: '1', damageType: P, properties: ['Боеприпасы (дис. 25/100; игла)', 'Перезарядка'], mastery: 'vex', weight: 1, cost: 10, ammunition: 'Иглы' },
  { id: 'hand-crossbow', name: 'Одноручный арбалет', category: 'martial', kind: 'ranged', damage: '1d6', damageType: P, properties: ['Боеприпасы (дис. 30/120; болт)', 'Лёгкое', 'Перезарядка'], mastery: 'vex', weight: 3, cost: 75, ammunition: 'Болты' },
  { id: 'heavy-crossbow', name: 'Тяжёлый арбалет', category: 'martial', kind: 'ranged', damage: '1d10', damageType: P, properties: ['Боеприпасы (дис. 100/400; болт)', 'Тяжёлое', 'Перезарядка', 'Двуручное'], mastery: 'push', weight: 18, cost: 50, ammunition: 'Болты' },
  { id: 'longbow', name: 'Длинный лук', category: 'martial', kind: 'ranged', damage: '1d8', damageType: P, properties: ['Боеприпасы (дис. 150/600; стрела)', 'Тяжёлое', 'Двуручное'], mastery: 'slow', weight: 2, cost: 50, ammunition: 'Стрелы' },
  { id: 'musket', name: 'Мушкет', category: 'martial', kind: 'ranged', damage: '1d12', damageType: P, properties: ['Боеприпасы (дис. 40/120; пуля)', 'Перезарядка', 'Двуручное'], mastery: 'slow', weight: 10, cost: 500, ammunition: 'Пули' },
  { id: 'pistol', name: 'Пистоль', category: 'martial', kind: 'ranged', damage: '1d10', damageType: P, properties: ['Боеприпасы (дис. 30/90; пуля)', 'Перезарядка'], mastery: 'vex', weight: 3, cost: 250, ammunition: 'Пули' },
];

// ------------------------------------------------------------------------------------------------
// Armour
// ------------------------------------------------------------------------------------------------

export const ARMOR: ArmorDef[] = [
  // Light
  { id: 'padded-armor', name: 'Стёганый доспех', category: 'light', baseAC: 11, dexModifier: true, maxDex: null, stealthDisadvantage: true, weight: 8, cost: 5 },
  { id: 'leather-armor', name: 'Кожаный доспех', category: 'light', baseAC: 11, dexModifier: true, maxDex: null, weight: 10, cost: 10 },
  { id: 'studded-leather-armor', name: 'Проклёпанный кожаный доспех', category: 'light', baseAC: 12, dexModifier: true, maxDex: null, weight: 13, cost: 45 },
  // Medium
  { id: 'hide-armor', name: 'Шкурный доспех', category: 'medium', baseAC: 12, dexModifier: true, maxDex: 2, weight: 12, cost: 10 },
  { id: 'chain-shirt', name: 'Кольчужная рубаха', category: 'medium', baseAC: 13, dexModifier: true, maxDex: 2, weight: 20, cost: 50 },
  { id: 'scale-mail', name: 'Чешуйчатый доспех', category: 'medium', baseAC: 14, dexModifier: true, maxDex: 2, stealthDisadvantage: true, weight: 45, cost: 50 },
  { id: 'breastplate', name: 'Кираса', category: 'medium', baseAC: 14, dexModifier: true, maxDex: 2, weight: 20, cost: 400 },
  { id: 'half-plate-armor', name: 'Полулаты', category: 'medium', baseAC: 15, dexModifier: true, maxDex: 2, stealthDisadvantage: true, weight: 40, cost: 750 },
  // Heavy
  { id: 'ring-mail', name: 'Колечный доспех', category: 'heavy', baseAC: 14, dexModifier: false, maxDex: 0, stealthDisadvantage: true, weight: 40, cost: 30 },
  { id: 'chain-mail', name: 'Кольчужный доспех', category: 'heavy', baseAC: 16, dexModifier: false, maxDex: 0, strength: 13, stealthDisadvantage: true, weight: 55, cost: 75 },
  { id: 'splint-armor', name: 'Пластинчатый доспех', category: 'heavy', baseAC: 17, dexModifier: false, maxDex: 0, strength: 15, stealthDisadvantage: true, weight: 60, cost: 200 },
  { id: 'plate-armor', name: 'Латный доспех', category: 'heavy', baseAC: 18, dexModifier: false, maxDex: 0, strength: 15, stealthDisadvantage: true, weight: 65, cost: 1500 },
  // Shield
  { id: 'shield', name: 'Щит', category: 'shield', baseAC: 2, dexModifier: false, maxDex: 0, weight: 6, cost: 10 },
];

// ------------------------------------------------------------------------------------------------
// Adventuring gear, tools, ammunition, foci and packs
// ------------------------------------------------------------------------------------------------

export const GEAR: GearDef[] = [
  // Ammunition: one entry is one piece; kits give a quantity (20 arrows).
  { id: 'arrows', name: 'Стрелы', kind: 'ammunition', weight: 0.05, cost: 0.05, description: 'Продаются по 20 штук за 1 зм (1 фнт.); хранятся в колчане.' },
  { id: 'bolts', name: 'Болты', kind: 'ammunition', weight: 0.075, cost: 0.05, description: 'Продаются по 20 штук за 1 зм (1,5 фнт.); хранятся в футляре для болтов.' },
  { id: 'firearm-bullets', name: 'Пули', kind: 'ammunition', weight: 0.2, cost: 0.3, description: 'Продаются по 10 штук за 3 зм (2 фнт.); хранятся в кошеле.' },
  { id: 'sling-bullets', name: 'Снаряды для пращи', kind: 'ammunition', weight: 0.075, cost: 0.002, description: 'Продаются по 20 штук за 4 мм (1,5 фнт.); хранятся в кошеле.' },
  { id: 'needles', name: 'Иглы', kind: 'ammunition', weight: 0.02, cost: 0.02, description: 'Продаются по 50 штук за 1 зм (1 фнт.); хранятся в кошеле.' },

  // Spellcasting foci
  { id: 'holy-symbol', name: 'Священный символ', kind: 'focus', weight: 1, cost: 5, description: 'Амулет, эмблема или реликварий с символом божества; фокусировка для заклинаний жреца и паладина.' },
  { id: 'arcane-focus', name: 'Магическая фокусировка', kind: 'focus', weight: 1, cost: 10, description: 'Кристалл, сфера, жезл, посох или палочка; фокусировка для заклинаний чародея, колдуна и волшебника.' },
  { id: 'druidic-focus', name: 'Друидическая фокусировка', kind: 'focus', weight: 0, cost: 1, description: 'Веточка омелы, деревянный посох или тисовая палочка; фокусировка для заклинаний друида и следопыта.' },
  { id: 'component-pouch', name: 'Мешочек с компонентами', kind: 'focus', weight: 2, cost: 25, description: 'Отделения с материальными компонентами без указанной стоимости.' },

  // Adventuring gear
  { id: 'backpack', name: 'Рюкзак', kind: 'gear', weight: 5, cost: 2, description: 'Вмещает до 30 фунтов в объёме 1 кубического фута.' },
  { id: 'bedroll', name: 'Спальник', kind: 'gear', weight: 7, cost: 1 },
  { id: 'blanket', name: 'Одеяло', kind: 'gear', weight: 3, cost: 0.5 },
  { id: 'book', name: 'Книга', kind: 'gear', weight: 5, cost: 25 },
  { id: 'book-prayers', name: 'Книга молитв', kind: 'gear', weight: 5, cost: 25, description: 'Сборник молитв и священных текстов.' },
  { id: 'book-philosophy', name: 'Книга о философии', kind: 'gear', weight: 5, cost: 25 },
  { id: 'book-history', name: 'Книга по истории', kind: 'gear', weight: 5, cost: 25 },
  { id: 'caltrops', name: 'Калтропы', kind: 'gear', weight: 2, cost: 1, description: 'Мешок шипов: покрывают квадрат 5 × 5 футов.' },
  { id: 'candle', name: 'Свеча', kind: 'gear', weight: 0, cost: 0.01 },
  { id: 'chain', name: 'Цепь', kind: 'gear', weight: 10, cost: 5 },
  { id: 'crowbar', name: 'Ломик', kind: 'gear', weight: 5, cost: 2, description: 'Даёт преимущество на проверки Силы там, где помогает рычаг.' },
  { id: 'costume', name: 'Костюм', kind: 'gear', weight: 4, cost: 5 },
  { id: 'fine-clothes', name: 'Отличная одежда', kind: 'gear', weight: 6, cost: 15 },
  { id: 'travelers-clothes', name: 'Дорожная одежда', kind: 'gear', weight: 4, cost: 2 },
  { id: 'flask', name: 'Фляга', kind: 'gear', weight: 1, cost: 0.02 },
  { id: 'healers-kit', name: 'Комплект целителя', kind: 'gear', weight: 3, cost: 5, description: '10 использований: стабилизировать существо с 0 хитов без проверки Мудрости (Медицина).' },
  { id: 'holy-water', name: 'Святая вода', kind: 'gear', weight: 1, cost: 25, description: 'Брошенная фляга: 2d8 урона излучением исчадию или нежити при провале спасброска Ловкости.' },
  { id: 'hooded-lantern', name: 'Закрытый фонарь', kind: 'gear', weight: 2, cost: 5 },
  { id: 'ink', name: 'Чернила', kind: 'gear', weight: 0, cost: 10 },
  { id: 'ink-pen', name: 'Писчее перо', kind: 'gear', weight: 0, cost: 0.02 },
  { id: 'iron-pot', name: 'Железный горшок', kind: 'gear', weight: 10, cost: 2 },
  { id: 'lamp', name: 'Лампа', kind: 'gear', weight: 1, cost: 0.5, description: 'Горит 1 час на одной фляге масла.' },
  { id: 'manacles', name: 'Кандалы', kind: 'gear', weight: 6, cost: 2 },
  { id: 'mirror', name: 'Зеркало', kind: 'gear', weight: 0.5, cost: 5 },
  { id: 'oil', name: 'Масло', kind: 'gear', weight: 1, cost: 0.1, description: 'Фляга масла для лампы или фонаря; можно поджечь.' },
  { id: 'paper', name: 'Бумага', kind: 'gear', weight: 0, cost: 0.2, description: 'Один лист.' },
  { id: 'parchment', name: 'Пергамент', kind: 'gear', weight: 0, cost: 0.1, description: 'Один лист.' },
  { id: 'perfume', name: 'Духи', kind: 'gear', weight: 0, cost: 5 },
  { id: 'pouch', name: 'Кошель', kind: 'gear', weight: 1, cost: 0.5 },
  { id: 'quiver', name: 'Колчан', kind: 'gear', weight: 1, cost: 1, description: 'Вмещает 20 стрел.' },
  { id: 'crossbow-bolt-case', name: 'Футляр для арбалетных болтов', kind: 'gear', weight: 1, cost: 1, description: 'Вмещает 20 болтов.' },
  { id: 'rations', name: 'Рационы', kind: 'gear', weight: 2, cost: 0.5, description: 'Еда на один день.' },
  { id: 'robe', name: 'Мантия', kind: 'gear', weight: 4, cost: 1 },
  { id: 'rope', name: 'Верёвка', kind: 'gear', weight: 5, cost: 1, description: '50 футов.' },
  { id: 'shovel', name: 'Лопата', kind: 'gear', weight: 5, cost: 2 },
  { id: 'tent', name: 'Палатка', kind: 'gear', weight: 20, cost: 2, description: 'Укрытие на двоих.' },
  { id: 'tinderbox', name: 'Трутница', kind: 'gear', weight: 1, cost: 0.5 },
  { id: 'torch', name: 'Факел', kind: 'gear', weight: 1, cost: 0.01, description: 'Горит 1 час: яркий свет в радиусе 20 футов и тусклый ещё на 20.' },
  { id: 'waterskin', name: 'Бурдюк', kind: 'gear', weight: 5, cost: 0.2 },

  // Packs
  {
    id: 'dungeoneers-pack',
    name: 'Набор исследователя подземелий',
    kind: 'pack',
    weight: 55,
    cost: 12,
    contents: ['Рюкзак', 'Калтропы', 'Ломик', 'Масло (2 фляги)', 'Рационы (10 дней)', 'Верёвка', 'Трутница', 'Факел (10)', 'Бурдюк'],
  },
  {
    id: 'explorers-pack',
    name: 'Набор путешественника',
    kind: 'pack',
    weight: 55,
    cost: 10,
    contents: ['Рюкзак', 'Спальник', 'Масло (2 фляги)', 'Рационы (10 дней)', 'Верёвка', 'Трутница', 'Факел (10)', 'Бурдюк'],
  },
  {
    id: 'priests-pack',
    name: 'Набор священника',
    kind: 'pack',
    weight: 29,
    cost: 33,
    contents: ['Рюкзак', 'Одеяло', 'Святая вода', 'Лампа', 'Рационы (7 дней)', 'Мантия', 'Трутница'],
  },

  // Tools: generic choices ("one of your choice") and the specific kinds
  { id: 'artisans-tools', name: 'Инструменты ремесленника', kind: 'tool', weight: 5, cost: 10, description: 'Один вид инструментов ремесленника на выбор; стоимость и вес зависят от вида.' },
  { id: 'gaming-set', name: 'Игровой набор', kind: 'tool', weight: 0, cost: 0.5, description: 'Один игровой набор на выбор: кости, драконьи шахматы, игральные карты или «Ставка трёх драконов».' },
  { id: 'musical-instrument', name: 'Музыкальный инструмент', kind: 'tool', weight: 2, cost: 30, description: 'Один музыкальный инструмент на выбор; стоимость и вес зависят от инструмента.' },

  { id: 'alchemists-supplies', name: 'Инструменты алхимика', kind: 'tool', weight: 8, cost: 50 },
  { id: 'brewers-supplies', name: 'Инструменты пивовара', kind: 'tool', weight: 9, cost: 20 },
  { id: 'calligraphers-supplies', name: 'Инструменты каллиграфа', kind: 'tool', weight: 5, cost: 10 },
  { id: 'carpenters-tools', name: 'Инструменты плотника', kind: 'tool', weight: 6, cost: 8 },
  { id: 'cartographers-tools', name: 'Инструменты картографа', kind: 'tool', weight: 6, cost: 15 },
  { id: 'cobblers-tools', name: 'Инструменты сапожника', kind: 'tool', weight: 5, cost: 5 },
  { id: 'cooks-utensils', name: 'Инструменты повара', kind: 'tool', weight: 8, cost: 1 },
  { id: 'glassblowers-tools', name: 'Инструменты стеклодува', kind: 'tool', weight: 5, cost: 30 },
  { id: 'jewelers-tools', name: 'Инструменты ювелира', kind: 'tool', weight: 2, cost: 25 },
  { id: 'leatherworkers-tools', name: 'Инструменты кожевника', kind: 'tool', weight: 5, cost: 5 },
  { id: 'masons-tools', name: 'Инструменты каменщика', kind: 'tool', weight: 8, cost: 10 },
  { id: 'painters-supplies', name: 'Инструменты художника', kind: 'tool', weight: 5, cost: 10 },
  { id: 'potters-tools', name: 'Инструменты гончара', kind: 'tool', weight: 3, cost: 10 },
  { id: 'smiths-tools', name: 'Инструменты кузнеца', kind: 'tool', weight: 8, cost: 20 },
  { id: 'tinkers-tools', name: 'Инструменты ремонтника', kind: 'tool', weight: 10, cost: 50 },
  { id: 'weavers-tools', name: 'Инструменты ткача', kind: 'tool', weight: 5, cost: 1 },
  { id: 'woodcarvers-tools', name: 'Инструменты резчика по дереву', kind: 'tool', weight: 5, cost: 1 },

  { id: 'disguise-kit', name: 'Набор для грима', kind: 'tool', weight: 3, cost: 25 },
  { id: 'forgery-kit', name: 'Набор для фальсификации', kind: 'tool', weight: 5, cost: 15 },
  { id: 'herbalism-kit', name: 'Набор травника', kind: 'tool', weight: 3, cost: 5 },
  { id: 'navigators-tools', name: 'Инструменты навигатора', kind: 'tool', weight: 2, cost: 25 },
  { id: 'poisoners-kit', name: 'Инструменты отравителя', kind: 'tool', weight: 2, cost: 50 },
  { id: 'thieves-tools', name: 'Воровские инструменты', kind: 'tool', weight: 1, cost: 25 },

  { id: 'dice-set', name: 'Кости', kind: 'tool', weight: 0, cost: 0.1 },
  { id: 'dragonchess-set', name: 'Драконьи шахматы', kind: 'tool', weight: 0, cost: 1 },
  { id: 'playing-cards', name: 'Игральные карты', kind: 'tool', weight: 0, cost: 0.5 },
  { id: 'three-dragon-ante', name: 'Ставка трёх драконов', kind: 'tool', weight: 0, cost: 1 },

  { id: 'bagpipes', name: 'Волынка', kind: 'tool', weight: 6, cost: 30 },
  { id: 'drum', name: 'Барабан', kind: 'tool', weight: 3, cost: 6 },
  { id: 'dulcimer', name: 'Дульцимер', kind: 'tool', weight: 10, cost: 25 },
  { id: 'flute', name: 'Флейта', kind: 'tool', weight: 1, cost: 2 },
  { id: 'horn', name: 'Рожок', kind: 'tool', weight: 2, cost: 3 },
  { id: 'lute', name: 'Лютня', kind: 'tool', weight: 2, cost: 35 },
  { id: 'lyre', name: 'Лира', kind: 'tool', weight: 2, cost: 30 },
  { id: 'pan-flute', name: 'Флейта Пана', kind: 'tool', weight: 2, cost: 12 },
  { id: 'shawm', name: 'Шалмей', kind: 'tool', weight: 1, cost: 2 },
  { id: 'viol', name: 'Виола да гамба', kind: 'tool', weight: 1, cost: 30 },
];

// ------------------------------------------------------------------------------------------------
// Class starting kits
// ------------------------------------------------------------------------------------------------

export const PALADIN_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'chain-mail' },
      { ref: 'shield' },
      { ref: 'longsword' },
      { ref: 'javelin', quantity: 6 },
      { ref: 'holy-symbol' },
      { ref: 'priests-pack' },
    ],
    gold: 9,
  },
  { id: 'b', label: 'B', items: [], gold: 150 },
];

export const FIGHTER_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'chain-mail' },
      { ref: 'greatsword' },
      { ref: 'flail' },
      { ref: 'javelin', quantity: 8 },
      { ref: 'dungeoneers-pack' },
    ],
    gold: 4,
  },
  {
    id: 'b',
    label: 'B',
    items: [
      { ref: 'studded-leather-armor' },
      { ref: 'scimitar' },
      { ref: 'shortsword' },
      { ref: 'longbow' },
      { ref: 'arrows', quantity: 20 },
      { ref: 'quiver' },
      { ref: 'dungeoneers-pack' },
    ],
    gold: 11,
  },
  { id: 'c', label: 'C', items: [], gold: 155 },
];

const ARTISAN_TOOL_IDS = [
  'alchemists-supplies', 'brewers-supplies', 'calligraphers-supplies', 'carpenters-tools', 'cartographers-tools',
  'cobblers-tools', 'cooks-utensils', 'glassblowers-tools', 'jewelers-tools', 'leatherworkers-tools', 'masons-tools',
  'painters-supplies', 'potters-tools', 'smiths-tools', 'tinkers-tools', 'weavers-tools', 'woodcarvers-tools',
];
const INSTRUMENT_IDS = ['bagpipes', 'drum', 'dulcimer', 'flute', 'horn', 'lute', 'lyre', 'pan-flute', 'shawm', 'viol'];
const namesOf = (ids: string[]) => ids.map((id) => GEAR.find((g) => g.id === id)!.name);

/** Names of the artisan's tools and musical instruments, for tool picks (Student of War, Musician). */
export const ARTISAN_TOOL_NAMES = namesOf(ARTISAN_TOOL_IDS);
export const MUSICAL_INSTRUMENT_NAMES = namesOf(INSTRUMENT_IDS);
