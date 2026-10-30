import type { BuildContext, CatalogEntryDef, Effect, FeatureDef, StanceDef } from '../../types';
import {
  BLOOD_MALEDICT,
  LYCAN,
  CRIMSON_RITE_GROUP,
  bloodPrice,
  hemocraftAtLeastOne,
  hemocraftDC,
  hemocraftDice,
  riteDice,
} from './hemocraft';

/**
 * What a Blood Hunter (Matthew Mercer, 2020 with the 2022 errata) picks from: crimson rites, blood
 * curses and the Mutant's mutagens. Descriptions are our own summaries of the rules.
 */

// ------------------------------------------------------------------------------------------------
// Crimson rites
// ------------------------------------------------------------------------------------------------

const RITE_TEXT =
  'Бонусным действием вы пробуждаете обряд в оружии, которое держите, платя хитами: одна кость гемокрафта некротического урона, который ничем нельзя уменьшить. До короткого или продолжительного отдыха атаки этим оружием магические и наносят дополнительно кость гемокрафта урона';

/** A crimson rite on the sheet: a stance that adds its die to weapon hits until any rest. */
export const crimsonRite = (
  id: string,
  name: string,
  damageType: string,
  damageName: string,
  iconName: string,
  extra: { description?: string; effects?: Effect[] } = {},
): FeatureDef => ({
  id,
  name,
  description: `${RITE_TEXT} ${damageName}.${extra.description ? `\n\n${extra.description}` : ''}\n\nНа листе действует на все атаки оружием; одновременно — один обряд.`,
  action: 'bonus',
  hpCost: bloodPrice,
  iconName,
  stance: {
    group: CRIMSON_RITE_GROUP,
    untilShortRest: true,
    // A Lycan may put the rite on the unarmed strikes of the hybrid form too.
    effects: (ctx) => [{ type: 'damageBonus', dice: riteDice(ctx), damageType, weapon: ctx.subclass !== LYCAN }, ...(extra.effects ?? [])],
  },
});

const rite = (entry: FeatureDef, level?: number): CatalogEntryDef => ({
  ...entry,
  catalog: 'crimsonRites',
  ...(level ? { prerequisite: { level, text: 'Эзотерический обряд' } } : {}),
});

export const CRIMSON_RITES: CatalogEntryDef[] = [
  rite(crimsonRite('rite-of-the-flame', 'Обряд пламени', 'Огонь', 'огнём', 'fire')),
  rite(crimsonRite('rite-of-the-frozen', 'Обряд стужи', 'Холод', 'холодом', 'snowflake-1')),
  rite(crimsonRite('rite-of-the-storm', 'Обряд бури', 'Электричество', 'электричеством', 'lightning-arc')),
  rite(crimsonRite('rite-of-the-dead', 'Обряд мертвецов', 'Некротический', 'некротической энергией', 'death-skull'), 14),
  rite(crimsonRite('rite-of-the-oracle', 'Обряд оракула', 'Психический', 'психической энергией', 'third-eye'), 14),
  rite(crimsonRite('rite-of-the-roar', 'Обряд рёва', 'Звук', 'звуком', 'screaming'), 14),
];

// ------------------------------------------------------------------------------------------------
// Blood curses
// ------------------------------------------------------------------------------------------------

const AMPLIFY_TEXT = 'Усиление: вы получаете кость гемокрафта некротического урона, который ничем нельзя уменьшить, и проклятие действует сильнее.';

/** A blood curse: it spends a use of Blood Maledict and may be amplified for a hemocraft die of blood. */
const curse = (entry: Omit<FeatureDef, 'usesResource' | 'amplify'> & { amplify: string }, level?: number, text?: string): CatalogEntryDef => ({
  ...entry,
  description: `${entry.description}\n\n**Усиление.** ${entry.amplify}`,
  usesResource: { id: BLOOD_MALEDICT },
  amplify: { description: `${AMPLIFY_TEXT} ${entry.amplify}`, hpCost: bloodPrice },
  catalog: 'bloodCurses',
  ...(level || text ? { prerequisite: { level, text } } : {}),
});

export const BLOOD_CURSES: CatalogEntryDef[] = [
  curse({
    id: 'curse-of-the-anxious',
    name: 'Проклятие тревоги',
    description: 'Бонусным действием вы проклинаете существо в пределах 30 футов: до конца вашего следующего хода проверки Харизмы (Запугивание) против него совершаются с преимуществом.',
    amplify: 'Следующий спасбросок Мудрости цели до конца проклятия совершается с помехой.',
    action: 'bonus',
    iconName: 'terror',
  }),
  curse({
    id: 'curse-of-binding',
    name: 'Проклятие оков',
    description:
      'Бонусным действием — существо размера Большое или меньше, которое вы видите в пределах 30 футов. Оно совершает спасбросок Силы против СЛ гемокрафта или до конца вашего следующего хода его скорость 0 и оно не может совершать реакции.',
    amplify: 'Действует 1 минуту на существо любого размера; в конце каждого своего хода цель повторяет спасбросок Силы, оканчивая проклятие при успехе.',
    action: 'bonus',
    saveAttribute: 'strength',
    saveDC: hemocraftDC,
    iconName: 'manacles',
  }),
  curse({
    id: 'curse-of-bloated-agony',
    name: 'Проклятие вздутой агонии',
    description:
      'Бонусным действием — существо, которое вы видите в пределах 30 футов. До конца вашего следующего хода оно совершает с помехой проверки Силы и Ловкости, а совершив за свой ход больше одной атаки, получает 1к8 некротического урона.',
    amplify: 'Длится 1 минуту; в конце каждого своего хода цель совершает спасбросок Телосложения, оканчивая проклятие при успехе.',
    action: 'bonus',
    damage: '1d8',
    damageType: 'Некротический',
    saveAttribute: 'constitution',
    saveDC: hemocraftDC,
    iconName: 'bleeding-wound',
  }),
  curse({
    id: 'curse-of-exposure',
    name: 'Проклятие уязвимости',
    description:
      'Реакцией, когда существо, которое вы видите в пределах 30 футов, получает урон от атаки или заклинания: до конца его следующего хода оно теряет сопротивление к видам урона этой атаки или заклинания (включая её саму).',
    amplify: 'Вместо этого цель теряет иммунитет к этим видам урона, но имеет к ним сопротивление до конца своего следующего хода.',
    action: 'reaction',
    iconName: 'scar-wound',
  }),
  curse({
    id: 'curse-of-the-eyeless',
    name: 'Проклятие безглазия',
    description:
      'Реакцией, когда существо, которое вы видите в пределах 30 футов, совершает атаку: бросьте кость гемокрафта и вычтите результат из броска атаки (можно решить после броска, но до объявления попадания). Существа с иммунитетом к ослеплению неуязвимы для проклятия.',
    amplify: 'Кость вычитается из всех бросков атаки цели до конца её хода, отдельным броском для каждой.',
    action: 'reaction',
    damage: (ctx) => hemocraftDice(ctx),
    iconName: 'bleeding-eye',
  }),
  curse({
    id: 'curse-of-the-fallen-puppet',
    name: 'Проклятие павшей марионетки',
    description:
      'Реакцией, когда существо, которое вы видите в пределах 30 футов, опускается до 0 хитов: оно сразу совершает одну атаку оружием по цели на ваш выбор в пределах своей досягаемости.',
    amplify: 'Сначала вы можете переместить его на половину его скорости, а к его броску атаки прибавляется ваш модификатор гемокрафта (минимум +1).',
    action: 'reaction',
    iconName: 'cultist',
  }),
  curse({
    id: 'curse-of-the-marked',
    name: 'Проклятие метки',
    description:
      'Бонусным действием вы метите существо, которое видите в пределах 30 футов. До конца хода, попадая по нему оружием с активным багровым обрядом, вы бросаете ещё одну кость гемокрафта урона обряда.',
    amplify: 'Ваш следующий бросок атаки по цели до конца хода совершается с преимуществом.',
    action: 'bonus',
    damage: (ctx) => hemocraftDice(ctx),
    iconName: 'eye-target',
  }),
  curse({
    id: 'curse-of-the-muddled-mind',
    name: 'Проклятие смятения',
    description:
      'Бонусным действием — существо в пределах 30 футов, которое концентрируется на заклинании или особенности. Его следующий спасбросок Телосложения для сохранения концентрации до конца вашего следующего хода совершается с помехой.',
    amplify: 'С помехой — все такие спасброски до конца вашего следующего хода.',
    action: 'bonus',
    iconName: 'brain',
  }),
];

/** Curses an order gives for free; they do not count against the curses known. */
export const ORDER_CURSES = {
  corrosion: curse({
    id: 'curse-of-corrosion',
    name: 'Проклятие разложения',
    description:
      'Бонусным действием — существо в пределах 30 футов: оно отравлено. В конце каждого своего хода оно совершает спасбросок Телосложения против СЛ гемокрафта, оканчивая проклятие при успехе.',
    amplify: 'Цель сразу получает 4к6 некротического урона и снова 4к6 при каждом проваленном спасброске.',
    action: 'bonus',
    damageType: 'Некротический',
    saveAttribute: 'constitution',
    saveDC: hemocraftDC,
    iconName: 'acid',
  }),
  exorcist: curse({
    id: 'curse-of-the-exorcist',
    name: 'Проклятие экзорциста',
    description: 'Бонусным действием — существо, которое вы видите в пределах 30 футов и которое очаровано, испугано или одержимо: эффект с него снимается.',
    amplify: 'Существо, наложившее эффект, получает 3к6 психического урона и совершает спасбросок Мудрости против СЛ гемокрафта, иначе ошеломлено до конца вашего следующего хода.',
    action: 'bonus',
    damageType: 'Психический',
    saveAttribute: 'wisdom',
    saveDC: hemocraftDC,
    iconName: 'holy-symbol',
  }),
  howl: curse({
    id: 'curse-of-the-howl',
    name: 'Проклятие воя',
    description:
      'Действием вы издаёте вой: каждое существо в пределах 30 футов, которое слышит вас (кроме выбранных), совершает спасбросок Мудрости против СЛ гемокрафта. При провале оно испугано вами до конца вашего следующего хода, а провалив на 5 и более — ещё и ошеломлено, пока испугано. Преуспевшее неуязвимо к вою на 24 часа.',
    amplify: 'Дистанция — 60 футов.',
    action: 'action',
    saveAttribute: 'wisdom',
    saveDC: hemocraftDC,
    iconName: 'wolf-howl',
  }),
  soulEater: curse({
    id: 'curse-of-the-soul-eater',
    name: 'Проклятие пожирателя душ',
    description:
      'Реакцией, когда существо (не конструкт и не нежить) в пределах 30 футов опускается до 0 хитов: до конца вашего следующего хода ваши атаки совершаются с преимуществом, и у вас сопротивление всему урону.',
    amplify: 'Вы также восстанавливаете одну потраченную ячейку договора. Повторно усилить это проклятие можно только после продолжительного отдыха.',
    action: 'reaction',
    iconName: 'soul',
  }),
};

// ------------------------------------------------------------------------------------------------
// Mutagens (Order of the Mutant)
// ------------------------------------------------------------------------------------------------

/** Doses of mutagens concocted on every rest, shared by all formulas. */
export const MUTAGENS = 'mutant.mutagens';

const disadvantage = (...on: string[]): Effect => ({ type: 'disadvantage', on });

/** A mutagen: a bonus action drinks a dose; its effect and side effect last until a rest. */
const mutagen = (
  id: string,
  name: string,
  effect: string,
  side: string,
  effects: StanceDef['effects'],
  iconName: string,
  level?: number,
): CatalogEntryDef => ({
  id,
  name,
  description: `**Эффект.** ${effect}\n\n**Побочный эффект.** ${side}\n\nБонусным действием вы выпиваете дозу; действует до короткого или продолжительного отдыха.`,
  action: 'bonus',
  usesResource: { id: MUTAGENS },
  iconName,
  stance: { untilShortRest: true, effects },
  catalog: 'mutagens',
  ...(level ? { prerequisite: { level } } : {}),
});

/** A score raised by Celerity, Potency or Sagacity: +3, +4 if drunk at level 11, +5 at 18; its maximum too. */
const raised = (attribute: 'strength' | 'dexterity' | 'intelligence') => (ctx: BuildContext): Effect[] => {
  const amount = ctx.classLevel >= 18 ? 5 : ctx.classLevel >= 11 ? 4 : 3;
  return [{ type: 'attribute', attribute, amount, max: 20 + amount }];
};

export const MUTAGEN_FORMULAS: CatalogEntryDef[] = [
  mutagen('mutagen-aether', 'Эфир', 'Скорость полёта 20 футов на 1 час.', 'Помеха на проверки Силы и Ловкости на это время.', [{ type: 'movement', mode: 'fly', feet: 20 }, disadvantage('check:strength', 'check:dexterity')], 'feathered-wing', 11),
  mutagen('mutagen-alluring', 'Очарование', 'Преимущество на проверки Харизмы.', 'Помеха на броски инициативы.', [{ type: 'advantage', on: ['check:charisma'] }, disadvantage('initiative')], 'charm'),
  mutagen('mutagen-celerity', 'Проворство', 'Ловкость и её максимум +3 (+4, если выпит на 11-м уровне, +5 — на 18-м).', 'Помеха на спасброски Мудрости.', (ctx) => [...raised('dexterity')(ctx), disadvantage('save:wisdom')], 'sprint'),
  mutagen('mutagen-conversant', 'Красноречие', 'Преимущество на проверки Интеллекта.', 'Помеха на проверки Мудрости.', [{ type: 'advantage', on: ['check:intelligence'] }, disadvantage('check:wisdom')], 'gift-of-knowledge'),
  mutagen('mutagen-cruelty', 'Жестокость', 'Совершая действие «Атака», вы можете совершить бонусным действием одну атаку оружием.', 'Помеха на спасброски Интеллекта, Мудрости и Харизмы.', [disadvantage('save:intelligence', 'save:wisdom', 'save:charisma')], 'knife-thrust', 11),
  mutagen('mutagen-deftness', 'Ловкачество', 'Преимущество на проверки Ловкости.', 'Помеха на проверки Мудрости.', [{ type: 'advantage', on: ['check:dexterity'] }, disadvantage('check:wisdom')], 'dodging'),
  mutagen('mutagen-embers', 'Угли', 'Сопротивление урону огнём.', 'Уязвимость к урону холодом.', [{ type: 'resistance', damageType: 'Огонь' }, { type: 'resistance', damageType: 'Холод', level: 'vulnerability' }], 'fire-bowl'),
  mutagen('mutagen-gelid', 'Лёд', 'Сопротивление урону холодом.', 'Уязвимость к урону огнём.', [{ type: 'resistance', damageType: 'Холод' }, { type: 'resistance', damageType: 'Огонь', level: 'vulnerability' }], 'ice-cube'),
  mutagen('mutagen-impermeable', 'Непроницаемость', 'Сопротивление колющему урону.', 'Уязвимость к рубящему урону.', [{ type: 'resistance', damageType: 'Колющий' }, { type: 'resistance', damageType: 'Рубящий', level: 'vulnerability' }], 'armor-upgrade'),
  mutagen('mutagen-mobility', 'Подвижность', 'Иммунитет к состояниям «схвачен» и «опутан»; с 11-го уровня — и «парализован».', 'Помеха на проверки Силы.', [disadvantage('check:strength')], 'run'),
  mutagen('mutagen-nighteye', 'Ночное око', 'Тёмное зрение 60 футов (или +60 футов к имеющемуся).', 'Помеха на броски атаки и проверки Мудрости (Восприятие), полагающиеся на зрение, если вы, цель или то, что вы пытаетесь увидеть, на прямом солнечном свету.', [{ type: 'darkvision', range: 60, extend: true }], 'beast-eye'),
  mutagen('mutagen-percipient', 'Проницательность', 'Преимущество на проверки Мудрости.', 'Помеха на проверки Харизмы.', [{ type: 'advantage', on: ['check:wisdom'] }, disadvantage('check:charisma')], 'all-seeing-eye'),
  mutagen('mutagen-potency', 'Мощь', 'Сила и её максимум +3 (+4, если выпит на 11-м уровне, +5 — на 18-м).', 'Помеха на спасброски Ловкости.', (ctx) => [...raised('strength')(ctx), disadvantage('save:dexterity')], 'muscle-up'),
  mutagen('mutagen-precision', 'Точность', 'Ваши атаки оружием — критические попадания при 19–20 на кости.', 'Помеха на спасброски Силы.', [{ type: 'critRange', min: 19 }, disadvantage('save:strength')], 'crosshair', 11),
  mutagen('mutagen-rapidity', 'Быстрота', 'Скорость +10 футов (+15 футов с 15-го уровня).', 'Помеха на проверки Интеллекта.', (ctx) => [{ type: 'speed', amount: ctx.classLevel >= 15 ? 15 : 10 }, disadvantage('check:intelligence')], 'fire-dash'),
  mutagen('mutagen-reconstruction', 'Восстановление', 'На 1 час: в начале каждого вашего хода, если у вас не меньше 1 хита, но меньше половины максимума, вы восстанавливаете хиты, равные бонусу мастерства.', 'Скорость −10 футов на это время.', [{ type: 'speed', amount: -10 }], 'regeneration', 7),
  mutagen('mutagen-sagacity', 'Мудрость веков', 'Интеллект и его максимум +3 (+4, если выпит на 11-м уровне, +5 — на 18-м).', 'Помеха на спасброски Харизмы.', (ctx) => [...raised('intelligence')(ctx), disadvantage('save:charisma')], 'brain'),
  mutagen('mutagen-shielded', 'Защищённость', 'Сопротивление рубящему урону.', 'Уязвимость к дробящему урону.', [{ type: 'resistance', damageType: 'Рубящий' }, { type: 'resistance', damageType: 'Дробящий', level: 'vulnerability' }], 'checked-shield'),
  mutagen('mutagen-unbreakable', 'Несокрушимость', 'Сопротивление дробящему урону.', 'Уязвимость к колющему урону.', [{ type: 'resistance', damageType: 'Дробящий' }, { type: 'resistance', damageType: 'Колющий', level: 'vulnerability' }], 'stone-bust'),
  mutagen('mutagen-vermillion', 'Киноварь', 'Ещё одно использование Кровавой порчи (отметьте его на листе вручную).', 'Помеха на спасброски от смерти.', [disadvantage('deathSave')], 'chalice-drops'),
];

/** Psychic damage of Brand of Castigation: the hemocraft modifier (min 1), doubled by Brand of Tethering (min 2). */
export const brandDamage = (ctx: BuildContext): string =>
  String(ctx.classLevel >= 13 ? Math.max(2, 2 * hemocraftAtLeastOne(ctx)) : hemocraftAtLeastOne(ctx));
