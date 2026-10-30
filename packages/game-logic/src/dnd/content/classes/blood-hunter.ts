import { byClassLevel } from '../../helpers';
import type { BuildContext, ClassDef, Effect, FeatureDef, GrantedAttackDef, KitOption, OptionDef, SubclassDef } from '../../types';
import { MUTAGENS, ORDER_CURSES, brandDamage, crimsonRite } from '../blood-hunter/classic';
import {
  BLOOD_MALEDICT,
  GHOSTSLAYER,
  LYCAN,
  hemocraftAtLeastOne,
  hemocraftDC,
  hemocraftDice,
} from '../blood-hunter/hemocraft';
import { FEATS } from '../feats';
import { abilityScoreImprovement, byTable } from './shared';

/**
 * Blood Hunter by Matthew Mercer (Охотник на крови): the 2020 class with the D&D Beyond errata of
 * 2022, a homebrew for 5e. It keeps its own table: ability score improvements at 4, 8, 12, 16 and 19,
 * no weapon mastery. Descriptions are our own summaries of the rules.
 */

const CURSES_POOL = 'blood-curses';
const RITES_POOL = 'crimson-rites';
const FORMULAS_POOL = 'mutagen-formulas';

export const BLOOD_HUNTER_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'studded-leather-armor' },
      { ref: 'longsword' },
      { ref: 'light-crossbow' },
      { ref: 'bolts', quantity: 20 },
      { ref: 'alchemists-supplies' },
      { ref: 'explorers-pack' },
    ],
    gold: 4,
  },
  { id: 'b', label: 'B', items: [], gold: 125 },
];

/** A curse more to know (one at 6, 10, 14 and 18). */
const moreCurses = (level: number): FeatureDef => ({
  id: `blood-hunter.curses-${level}`,
  name: 'Новое кровавое проклятие',
  description: 'Вы узнаёте ещё одно кровавое проклятие; заодно одно из известных можно заменить другим.',
  hidden: true,
  choices: [{ id: 'curse', label: 'Кровавое проклятие', count: 1, pool: CURSES_POOL, options: { from: 'catalog', catalog: 'bloodCurses' } }],
});

/** A crimson rite more to know (at 7 and 14). */
const moreRites = (level: number): FeatureDef => ({
  id: `blood-hunter.rites-${level}`,
  name: 'Новый багровый обряд',
  description: level >= 14 ? 'Вы узнаёте ещё один багровый обряд; теперь доступны и эзотерические: мертвецов, оракула и рёва.' : 'Вы узнаёте ещё один багровый обряд.',
  hidden: true,
  choices: [{ id: 'rite', label: 'Багровый обряд', count: 1, pool: RITES_POOL, options: { from: 'catalog', catalog: 'crimsonRites' } }],
});

/** The four fighting styles of the class, as the presets have them. */
const FIGHTING_STYLES: OptionDef[] = ['archery', 'dueling', 'great-weapon-fighting', 'two-weapon-fighting'].map((id) => {
  const feat = FEATS.find((f) => f.id === id)!;
  return { id, name: feat.name, description: feat.description, effects: feat.effects, iconName: feat.iconName };
});

// ------------------------------------------------------------------------------------------------
// Orders
// ------------------------------------------------------------------------------------------------

const ghostslayer: SubclassDef = {
  id: GHOSTSLAYER,
  name: 'Орден Охотников за призраками',
  source: 'Blood Hunter (Мэтт Мерсер)',
  description: 'Древнейший орден: охотники на нежить, что ступают за грань миров и несут в клинке свет рассвета.',
  levels: {
    3: [
      crimsonRite('rite-of-the-dawn', 'Обряд рассвета', 'Лучистый', 'излучением', 'sunrise', {
        description: 'Пока обряд действует, оружие излучает яркий свет на 20 футов, у вас сопротивление некротическому урону, а попадая им по нежити, вы бросаете ещё одну кость гемокрафта урона обряда.',
        effects: [{ type: 'resistance', damageType: 'Некротический' }],
      }),
      {
        id: 'ghostslayer.curse-specialist',
        name: 'Специалист по проклятиям',
        description: 'Вы получаете ещё одно использование Кровавой порчи, а ваши кровавые проклятия действуют на любых существ — с кровью или без.',
        action: 'passive',
        iconName: 'cursed-star',
      },
    ],
    7: [
      {
        id: 'ghostslayer.aether-walk',
        name: 'Эфирная поступь',
        description:
          'В начале своего хода, если вы дееспособны, вы ступаете на грань планов на число раундов, равное модификатору гемокрафта (минимум 1): проходите сквозь существ и предметы как по труднопроходимой местности, видите Эфирный план и воздействуете на него. Заканчивая ход внутри предмета, вы получаете 1к10 урона силовым полем; если эффект кончается внутри предмета, вас выталкивает в ближайшее свободное место с уроном силовым полем, равным удвоенному числу пройденных футов. Раз за короткий или продолжительный отдых (дважды с 15-го уровня).',
        action: 'passive',
        resource: { id: 'ghostslayer.aether-walk', name: 'Эфирная поступь', max: byClassLevel({ 7: 1, 15: 2 }), recharge: 'shortOrLong' },
        usesResource: { id: 'ghostslayer.aether-walk' },
        damage: '1d10',
        damageType: 'Силовой',
        iconName: 'floating-ghost',
      },
    ],
    11: [
      {
        id: 'ghostslayer.brand-of-sundering',
        name: 'Клеймо раскола',
        description:
          'Попадая по любому существу оружием с активным багровым обрядом, вы бросаете ещё одну кость гемокрафта урона обряда (на листе — уже в уроне обряда). Существо под вашим Клеймом, способное проходить сквозь предметы и существ, этого больше не может.',
        action: 'passive',
        iconName: 'scar-wound',
      },
    ],
    15: [ORDER_CURSES.exorcist],
    18: [
      {
        id: 'ghostslayer.rite-revival',
        name: 'Возрождение обрядом',
        description: 'Если при активном багровом обряде ваши хиты опускаются до 0, но вы не убиты сразу, вы можете окончить все свои обряды, и хиты становятся равны 1.',
        action: 'passive',
        iconName: 'sunrise',
      },
    ],
  },
};

const HYBRID = 'lycan.hybrid-transformation';

/** What the hybrid form gives at a level: Feral Might, Resilient Hide, Predatory Strikes and what grows of them. */
const hybridEffects = (ctx: BuildContext): Effect[] => {
  const might = ctx.classLevel >= 18 ? 3 : ctx.classLevel >= 11 ? 2 : 1;
  const strike: Omit<GrantedAttackDef, 'id' | 'name'> = {
    damage: ctx.classLevel >= 11 ? '1d8' : '1d6',
    damageType: 'Рубящий',
    abilities: ['strength', 'dexterity'],
    hitBonus: ctx.classLevel >= 7 ? might : 0,
    iconName: 'claw-slashes',
  };
  return [
    { type: 'advantage', on: ['check:strength', 'save:strength'] },
    { type: 'damageBonus', amount: might, melee: true },
    { type: 'resistance', damageType: 'Дробящий' },
    { type: 'resistance', damageType: 'Колющий' },
    { type: 'resistance', damageType: 'Рубящий' },
    { type: 'armorClass', amount: 1, noHeavyArmor: true },
    {
      type: 'attack',
      attack: { ...strike, id: 'lycan-predatory-strike', name: 'Хищный удар', description: 'Безоружный удар когтями гибридного облика (дробящий или рубящий урон на выбор).' },
    },
    {
      type: 'attack',
      attack: {
        ...strike,
        id: 'lycan-predatory-strike-bonus',
        name: 'Хищный удар: бонусное действие',
        description: 'Совершив действием «Атака» безоружный удар, вы можете бонусным действием ударить ещё раз.',
        actionType: 'bonus',
      },
    },
  ];
};

const HYBRID_TEXT =
  'Бонусным действием вы на 1 час принимаете гибридный облик (обратно — бонусным действием; облик спадает, если вы теряете сознание или умираете). Вы говорите, пользуетесь снаряжением и носите доспехи. В облике:\n\n- **Звериная мощь:** преимущество на проверки и спасброски Силы; +1 к урону рукопашных атак (+2 с 11-го уровня, +3 с 18-го);\n- **Стойкая шкура:** сопротивление дробящему, колющему и рубящему урону от немагических атак не серебряным оружием; +1 к КД без тяжёлых доспехов;\n- **Хищные удары:** безоружные удары 1к6 (1к8 с 11-го уровня) рубящего или дробящего урона, Сила или Ловкость; после безоружного удара действием «Атака» — ещё один бонусным действием; на них можно наложить багровый обряд;\n- **Жажда крови:** начиная ход с хитами меньше половины максимума, совершите спасбросок Мудрости СЛ 8 (автоматический провал при концентрации), иначе двигаетесь к ближайшему существу и атакуете его.';

/** Hybrid Transformation: limited uses until level 17, unlimited and without end from 18. */
const hybridTransformation = (unlimited: boolean): FeatureDef => ({
  id: HYBRID,
  name: 'Гибридная трансформация',
  description: unlimited
    ? `${HYBRID_TEXT}\n\nС 18-го уровня — без ограничения использований и длительности.`
    : `${HYBRID_TEXT}\n\nРаз за короткий или продолжительный отдых (дважды с 11-го уровня).`,
  action: 'bonus',
  ...(unlimited
    ? { minLevel: 18 }
    : { maxLevel: 17, resource: { id: HYBRID, name: 'Гибридная трансформация', max: byClassLevel({ 3: 1, 11: 2 }), recharge: 'shortOrLong' as const } }),
  iconName: 'werewolf',
  stance: { effects: hybridEffects },
});

const lycan: SubclassDef = {
  id: LYCAN,
  name: 'Орден Ликантропов',
  source: 'Blood Hunter (Мэтт Мерсер)',
  description: 'Охотники, что приняли проклятие ликантропии и учатся держать зверя в узде, обращая его ярость против чудовищ.',
  levels: {
    3: [
      {
        id: 'lycan.heightened-senses',
        name: 'Обострённые чувства',
        description: 'Преимущество на проверки Мудрости (Восприятие), полагающиеся на слух или обоняние.',
        action: 'passive',
        iconName: 'wolf-head',
      },
      hybridTransformation(false),
      hybridTransformation(true),
    ],
    7: [
      {
        id: 'lycan.stalkers-prowess',
        name: 'Мастерство преследователя',
        description:
          'Скорость +10 футов, прыжок в длину +10 футов, в высоту +3 фута. В гибридном облике безоружные удары получают +1 к броскам атаки (+2 с 11-го уровня, +3 с 18-го), а с багровым обрядом считаются магическими.',
        action: 'passive',
        effects: [{ type: 'speed', amount: 10 }],
        iconName: 'paw',
      },
    ],
    11: [
      {
        id: 'lycan.advanced-transformation',
        name: 'Продвинутая трансформация',
        description:
          'Гибридная трансформация — дважды за короткий или продолжительный отдых. В гибридном облике в начале хода, если у вас есть хотя бы 1 хит, но меньше половины максимума, вы восстанавливаете 1 + модификатор Телосложения хитов (минимум 1) — до спасброска Жажды крови.',
        action: 'passive',
        iconName: 'regeneration',
      },
    ],
    15: [
      {
        id: 'lycan.brand-of-the-voracious',
        name: 'Клеймо ненасытности',
        description: 'В гибридном облике у вас преимущество на спасбросок Жажды крови и на броски атаки по существу под вашим Клеймом.',
        action: 'passive',
        iconName: 'bestial-fangs',
      },
    ],
    18: [
      {
        id: 'lycan.hybrid-transformation-mastery',
        name: 'Мастерство гибридной трансформации',
        description: 'Гибридная трансформация без ограничения использований; облик держится, пока вы его не сбросите, не потеряете сознание или не умрёте. Вы получаете Проклятие воя.',
        action: 'passive',
        iconName: 'direwolf',
      },
      ORDER_CURSES.howl,
    ],
  },
};

const moreFormulas = (level: number): FeatureDef => ({
  id: `mutant.formulas-${level}`,
  name: 'Новая формула',
  description: 'Вы узнаёте ещё одну формулу мутагена; одну из известных можно заменить.',
  hidden: true,
  choices: [{ id: 'formula', label: 'Формула мутагена', count: 1, pool: FORMULAS_POOL, options: { from: 'catalog', catalog: 'mutagens' } }],
});

const mutant: SubclassDef = {
  id: 'order-of-the-mutant',
  name: 'Орден Мутантов',
  source: 'Blood Hunter (Мэтт Мерсер)',
  description: 'Алхимики плоти: они пьют мутагены, что делают тело сильнее чудовищ, расплачиваясь побочными эффектами.',
  levels: {
    3: [
      {
        id: 'mutant.mutagencraft',
        name: 'Мутагенное ремесло',
        description:
          'Заканчивая короткий или продолжительный отдых, вы варите мутагены: 1 (2 с 7-го уровня, 3 с 15-го). Бонусным действием вы выпиваете мутаген; его эффект и побочный эффект длятся до следующего отдыха. Мутагены не действуют на других и выдыхаются к следующему отдыху. Вы знаете 4 формулы и узнаёте новые на 7, 11, 15 и 18-м уровнях.',
        action: 'passive',
        resource: { id: MUTAGENS, name: 'Мутагены', max: byClassLevel({ 3: 1, 7: 2, 15: 3 }), recharge: 'shortOrLong', iconName: 'bubbling-flask' },
        iconName: 'bubbling-flask',
        choices: [{ id: 'formulas', label: 'Формулы мутагенов (4)', count: 4, pool: FORMULAS_POOL, options: { from: 'catalog', catalog: 'mutagens' } }],
      },
      {
        id: 'mutant.flush',
        name: 'Очищение от мутагенов',
        description: 'Действием вы выводите из организма все мутагены, оканчивая их эффекты и побочные эффекты (выключите их на листе).',
        action: 'action',
        iconName: 'vial',
      },
    ],
    7: [
      {
        id: 'mutant.strange-metabolism',
        name: 'Странный метаболизм',
        description:
          'У вас иммунитет к урону ядом и состоянию «отравлен». Раз в продолжительный отдых бонусным действием вы игнорируете побочный эффект одного мутагена на 1 минуту.',
        action: 'bonus',
        resource: { id: 'mutant.strange-metabolism', name: 'Странный метаболизм', max: 1, recharge: 'long' },
        effects: [{ type: 'resistance', damageType: 'Яд', level: 'immunity' }],
        iconName: 'dna1',
      },
      moreFormulas(7),
    ],
    11: [
      {
        id: 'mutant.brand-of-axiom',
        name: 'Клеймо аксиомы',
        description:
          'Заклеймённое вами существо теряет иллюзии и невидимость и не может ими пользоваться, пока на нём Клеймо. Если оно в чужом облике (превращение, смена формы, Дикий облик), то совершает спасбросок Мудрости или возвращается в истинный облик и ошеломлено до конца вашего следующего хода; так же — при каждой попытке сменить облик.',
        action: 'passive',
        saveAttribute: 'wisdom',
        saveDC: hemocraftDC,
        iconName: 'mirror-mirror',
      },
      moreFormulas(11),
    ],
    15: [moreFormulas(15), ORDER_CURSES.corrosion],
    18: [
      {
        id: 'mutant.exalted-mutation',
        name: 'Высшая мутация',
        description: 'Бонусным действием вы прекращаете действие одного мутагена и сразу принимаете любой известный вам мутаген без готовой дозы. Использований — модификатор гемокрафта (минимум 1) за продолжительный отдых.',
        action: 'bonus',
        resource: { id: 'mutant.exalted-mutation', name: 'Высшая мутация', max: hemocraftAtLeastOne, recharge: 'long' },
        iconName: 'dna1',
      },
      moreFormulas(18),
    ],
  },
};

/** A patron of the Profane Soul: its Rite Focus benefit, Revealed Arcana (7) and Unsealed Arcana (15). */
const patron = (id: string, name: string, focus: Omit<FeatureDef, 'id' | 'name'>, revealed: string, unsealed: string, iconName: string): OptionDef => ({
  id,
  name,
  iconName,
  description: focus.description,
  features: [
    { id: `profane.${id}.focus`, name: `Фокус обряда: ${name}`, iconName, action: 'passive', ...focus },
    {
      id: `profane.${id}.revealed-arcana`,
      name: 'Раскрытая тайна',
      description: 'Раз в продолжительный отдых вы можете сотворить заклинание покровителя ячейкой Магии договора, на её круге.',
      action: 'passive',
      minLevel: 7,
      resource: { id: 'profane.revealed-arcana', name: 'Раскрытая тайна', max: 1, recharge: 'long' },
      usesResource: { id: 'profane.revealed-arcana' },
      effects: [{ type: 'spell', spell: revealed, alwaysPrepared: true }],
      iconName: 'book-aura',
    },
    {
      id: `profane.${id}.unsealed-arcana`,
      name: 'Распечатанная тайна',
      description: 'Раз в продолжительный отдых вы творите заклинание покровителя без траты ячейки.',
      action: 'passive',
      minLevel: 15,
      resource: { id: 'profane.unsealed-arcana', name: 'Распечатанная тайна', max: 1, recharge: 'long' },
      effects: [{ type: 'spell', spell: unsealed, alwaysPrepared: true, resourceId: 'profane.unsealed-arcana' }],
      iconName: 'burning-book',
    },
  ],
});

const PATRONS: OptionDef[] = [
  patron('archfey', 'Архифея', { description: 'Существо, раненное вашим оружием с обрядом, слабо светится до конца вашего следующего хода и не получает выгоды от укрытия и невидимости.' }, 'blur', 'slow', 'fairy'),
  patron(
    'celestial',
    'Небожитель',
    {
      description: 'Бонусным действием, потратив использование Кровавой порчи, вы восстанавливаете существу в пределах 60 футов хиты: кость гемокрафта + модификатор гемокрафта (минимум +1).',
      action: 'bonus',
      usesResource: { id: BLOOD_MALEDICT },
      damage: (ctx) => `${hemocraftDice(ctx)}+${hemocraftAtLeastOne(ctx)}`,
      damageType: 'Лечение',
    },
    'lesser-restoration',
    'revivify',
    'angel-wings',
  ),
  patron('fathomless', 'Бездонный', { description: 'Вы дышите под водой. Раз в ход, раня существо оружием с обрядом, вы можете уменьшить его скорость на 10 футов до начала вашего следующего хода.' }, 'gust-of-wind', 'lightning-bolt', 'tentacle-strike'),
  patron('fiend', 'Исчадие', { description: 'При Обряде пламени, выбросив 1 или 2 на кости урона обряда, вы можете перебросить её и выбрать любой результат.' }, 'scorching-ray', 'fireball', 'imp'),
  patron(
    'genie',
    'Гений',
    {
      description: 'Бонусным действием, потратив использование Кровавой порчи, вы получаете скорость полёта 30 футов на число раундов, равное модификатору гемокрафта (минимум 1).',
      action: 'bonus',
      usesResource: { id: BLOOD_MALEDICT },
      stance: { effects: [{ type: 'movement', mode: 'fly', feet: 30 }] },
    },
    'phantasmal-force',
    'protection-from-energy',
    'whirlwind',
  ),
  patron('great-old-one', 'Великий Древний', { description: 'Нанеся критическое попадание, вы пугаете цель и выбранных существ в пределах 10 футов от неё до конца вашего следующего хода.' }, 'detect-thoughts', 'haste', 'tentacles-skull'),
  patron('hexblade', 'Ведьмовской клинок', { description: 'Когда вы успешно накладываете на существо кровавое проклятие, ваше следующее попадание по нему, пока проклятие действует, наносит дополнительный урон, равный бонусу мастерства.', damage: (ctx) => String(ctx.proficiencyBonus) }, 'branding-smite', 'blink', 'rune-sword'),
  patron('undead', 'Нежить', { description: 'Получая некротический урон, вы можете реакцией уменьшить его вдвое (кроме платы хитами за обряды и усиление).', action: 'reaction' }, 'blindness-deafness', 'speak-with-dead', 'grim-reaper'),
  patron('undying', 'Бессмертный', { description: 'Опустив до 0 хитов враждебное существо, представлявшее хоть какую-то угрозу, вы восстанавливаете хиты, равные броску кости гемокрафта.', damage: (ctx) => hemocraftDice(ctx), damageType: 'Лечение' }, 'silence', 'bestow-curse', 'heart-plus'),
];

const profaneSoul: SubclassDef = {
  id: 'order-of-the-profane-soul',
  name: 'Орден Осквернённой души',
  source: 'Blood Hunter (Мэтт Мерсер)',
  description: 'Охотники, заключившие договор с потусторонней силой, чтобы бить врага его же оружием: магией договора.',
  spellcasting: {
    ability: 'key',
    list: 'warlock',
    progression: 'pact',
    pact: [
      { count: 0, level: 1 }, { count: 0, level: 1 }, { count: 1, level: 1 }, { count: 1, level: 1 }, { count: 1, level: 1 },
      { count: 2, level: 1 }, { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 2 },
      { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 3 }, { count: 2, level: 3 }, { count: 2, level: 3 },
      { count: 2, level: 3 }, { count: 2, level: 3 }, { count: 2, level: 3 }, { count: 2, level: 4 }, { count: 2, level: 4 },
    ],
    mode: 'known',
    prepared: byTable([0, 0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11]),
    cantrips: byClassLevel({ 3: 2, 10: 3 }),
  },
  levels: {
    3: [
      {
        id: 'profane.otherworldly-patron',
        name: 'Потусторонний покровитель',
        description: 'Вы заключаете договор с покровителем; он меняет лишь особенности ордена, а не даёт особенностей колдуна.',
        hidden: true,
        choices: [{ id: 'patron', label: 'Покровитель', count: 1, options: { from: 'options', options: PATRONS } }],
      },
      {
        id: 'profane.pact-magic',
        name: 'Магия договора',
        description:
          'Вы творите заклинания колдуна характеристикой гемокрафта (СЛ = 8 + бонус мастерства + модификатор; бонус атаки = бонус мастерства + модификатор). Все ячейки одного круга и возвращаются после короткого или продолжительного отдыха. Повышая уровень, одно известное заклинание можно заменить.',
        action: 'passive',
        iconName: 'warlock-eye',
      },
      {
        id: 'profane.rite-focus',
        name: 'Фокус обряда',
        description: 'Пока на оружии действует багровый обряд, оно служит вам заклинательной фокусировкой для заклинаний колдуна и даёт выгоду покровителя.',
        action: 'passive',
        iconName: 'rune-sword',
      },
    ],
    7: [
      {
        id: 'profane.mystic-frenzy',
        name: 'Мистическое неистовство',
        description: 'Действием сотворив заговор, вы можете сразу совершить бонусным действием одну атаку оружием.',
        action: 'passive',
        iconName: 'sword-spin',
      },
    ],
    11: [
      {
        id: 'profane.brand-of-the-sapping-scar',
        name: 'Клеймо иссушающего шрама',
        description: 'Существо под вашим Клеймом совершает с помехой спасброски от ваших заклинаний колдуна.',
        action: 'passive',
        iconName: 'scar-wound',
      },
    ],
    18: [ORDER_CURSES.soulEater],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

export const BLOOD_HUNTER: ClassDef = {
  id: 'blood-hunter',
  name: 'Охотник на крови',
  source: 'Мэтт Мерсер',
  description:
    'Охотник на чудовищ, что платит собственной кровью за запретную магию гемокрафта: обряды зажигают клинок, проклятия ломают врага, а ордена превращают в зверя, мутанта или проводника потусторонней силы.',
  hitDie: 10,
  primary: ['strength', 'dexterity', 'intelligence'],
  saves: ['dexterity', 'intelligence'],
  skillChoices: { count: 3, list: ['acrobatics', 'arcana', 'athletics', 'history', 'insight', 'investigation', 'religion', 'survival'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
    { type: 'proficiency', category: 'tool', value: 'Инструменты алхимика' },
  ],
  keyAbility: {
    label: 'Гемокрафт',
    description: 'Характеристика гемокрафта: от неё СЛ ваших особенностей, урон Клейма и магия Осквернённой души. Интеллект — по правилам, Мудрость — вариант с согласия мастера.',
    options: ['intelligence', 'wisdom'],
    notes: { intelligence: 'По правилам класса.', wisdom: 'Вариант правил — с согласия мастера.' },
  },
  subclassLevel: 3,
  subclasses: [ghostslayer, lycan, mutant, profaneSoul],
  replaceable: [
    { pool: CURSES_POOL, label: 'Замена проклятия' },
    { pool: FORMULAS_POOL, label: 'Замена формулы' },
  ],
  startingEquipment: BLOOD_HUNTER_KITS,
  levels: {
    1: [
      {
        id: 'blood-hunter.hunters-bane',
        name: 'Бич охотника',
        description:
          'Преимущество на проверки Мудрости (Выживание), чтобы выследить фей, исчадий и нежить, и на проверки Интеллекта, чтобы вспомнить о них сведения. СЛ спасбросков ваших особенностей — СЛ гемокрафта: 8 + бонус мастерства + модификатор гемокрафта.',
        action: 'passive',
        iconName: 'hunter-eyes',
      },
      {
        id: 'blood-hunter.blood-maledict',
        name: 'Кровавая порча',
        description:
          'Вы знаете кровавые проклятия (1, новые — на 6, 10, 14 и 18-м уровнях) и накладываете их, тратя использование порчи: 1 за короткий или продолжительный отдых (2 с 6-го уровня, 3 с 13-го, 4 с 17-го). Проклятие можно усилить, получив кость гемокрафта некротического урона, который ничем нельзя уменьшить. Бескровные существа неуязвимы для неусиленных проклятий.',
        action: 'passive',
        resource: {
          id: BLOOD_MALEDICT,
          name: 'Кровавая порча',
          // Curse Specialist of the Ghostslayer adds a use.
          max: (ctx) => byClassLevel({ 1: 1, 6: 2, 13: 3, 17: 4 })(ctx) + (ctx.subclass === GHOSTSLAYER && ctx.classLevel >= 3 ? 1 : 0),
          recharge: 'shortOrLong',
          iconName: 'cursed-star',
        },
        iconName: 'cursed-star',
        choices: [{ id: 'curse', label: 'Кровавое проклятие', count: 1, pool: CURSES_POOL, options: { from: 'catalog', catalog: 'bloodCurses' } }],
      },
    ],
    2: [
      {
        id: 'blood-hunter.fighting-style',
        name: 'Боевой стиль',
        description: 'Вы выбираете боевой стиль: Стрельба, Дуэлянт, Сражение большим оружием или Сражение двумя оружиями.',
        iconName: 'crossed-swords',
        choices: [{ id: 'style', label: 'Боевой стиль', count: 1, options: { from: 'options', options: FIGHTING_STYLES } }],
      },
      {
        id: 'blood-hunter.crimson-rite',
        name: 'Багровый обряд',
        description:
          'Бонусным действием вы пробуждаете известный обряд в оружии, платя костью гемокрафта некротического урона, который ничем нельзя уменьшить. До короткого или продолжительного отдыха атаки этим оружием магические и наносят дополнительно кость гемокрафта урона обряда. Обрядов — 1, ещё по одному на 7 и 14-м уровнях; эзотерические — с 14-го.',
        action: 'passive',
        iconName: 'bloody-sword',
        choices: [{ id: 'rite', label: 'Багровый обряд', count: 1, pool: RITES_POOL, options: { from: 'catalog', catalog: 'crimsonRites' } }],
      },
    ],
    3: [{ id: 'blood-hunter.subclass', name: 'Орден охотников на крови', description: 'Вы вступаете в орден, определяющий ваш путь.', hidden: true }],
    4: [abilityScoreImprovement('blood-hunter', 4)],
    5: [
      {
        id: 'blood-hunter.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая действие «Атака» в свой ход, вы атакуете дважды вместо одного раза.',
        action: 'passive',
        iconName: 'crossed-swords',
        effects: [{ type: 'extraAttack', attacks: 2 }],
      },
    ],
    6: [
      {
        id: 'blood-hunter.brand-of-castigation',
        name: 'Клеймо кары',
        description:
          'Раня существо оружием с активным обрядом, вы можете заклеймить его (без действия). Вы знаете направление к нему, пока вы на одном плане. Каждый раз, нанося урон вам или существу, которое вы видите в пределах 5 футов от себя, оно получает психический урон, равный модификатору гемокрафта (минимум 1). Клеймо держится, пока вы не снимете его или не заклеймите другое существо; «Рассеивание магии» снимает его как заклинание круга, равного половине вашего уровня. Раз за короткий или продолжительный отдых.',
        action: 'passive',
        resource: { id: 'blood-hunter.brand', name: 'Клеймо', max: 1, recharge: 'shortOrLong', iconName: 'scar-wound' },
        usesResource: { id: 'blood-hunter.brand' },
        damage: brandDamage,
        damageType: 'Психический',
        iconName: 'scar-wound',
      },
      moreCurses(6),
    ],
    7: [moreRites(7)],
    8: [abilityScoreImprovement('blood-hunter', 8)],
    9: [
      {
        id: 'blood-hunter.grim-psychometry',
        name: 'Мрачная психометрия',
        description: 'Преимущество на проверки Интеллекта (История), чтобы вспомнить зловещее или трагическое прошлое предмета, которого вы касаетесь, или места, где вы находитесь. Высокий результат может принести видения.',
        action: 'passive',
        iconName: 'crystal-ball',
      },
    ],
    10: [
      {
        id: 'blood-hunter.dark-augmentation',
        name: 'Тёмное усиление',
        description: 'Скорость +5 футов. К спасброскам Силы, Ловкости и Телосложения прибавляется модификатор гемокрафта (минимум +1).',
        action: 'passive',
        iconName: 'muscle-up',
        effects: (ctx) => [
          { type: 'speed', amount: 5 },
          { type: 'saveBonus', attributes: ['strength', 'dexterity', 'constitution'], amount: hemocraftAtLeastOne(ctx) },
        ],
      },
      moreCurses(10),
    ],
    12: [abilityScoreImprovement('blood-hunter', 12)],
    13: [
      {
        id: 'blood-hunter.brand-of-tethering',
        name: 'Клеймо привязи',
        description:
          'Урон Клейма кары — удвоенный модификатор гемокрафта (минимум 2). Заклеймённое существо не может совершать действие «Рывок»; пытаясь телепортироваться или покинуть план, оно получает 4к6 психического урона и совершает спасбросок Мудрости против СЛ гемокрафта — при провале попытка не удаётся.',
        action: 'passive',
        damage: '4d6',
        damageType: 'Психический',
        saveAttribute: 'wisdom',
        saveDC: hemocraftDC,
        iconName: 'chained-heart',
      },
    ],
    14: [
      {
        id: 'blood-hunter.hardened-soul',
        name: 'Закалённая душа',
        description: 'Преимущество на спасброски от очарования и испуга.',
        action: 'passive',
        iconName: 'cold-heart',
      },
      moreRites(14),
      moreCurses(14),
    ],
    16: [abilityScoreImprovement('blood-hunter', 16)],
    18: [moreCurses(18)],
    19: [abilityScoreImprovement('blood-hunter', 19)],
    20: [
      {
        id: 'blood-hunter.sanguine-mastery',
        name: 'Кровавое мастерство',
        description:
          'Раз в ход, бросая кость гемокрафта для особенности охотника на крови, вы можете перебросить её и выбрать любой результат (плату хитами лист бросает дважды и берёт меньшее). Нанеся критическое попадание оружием с активным обрядом, вы восстанавливаете одно использование Кровавой порчи.',
        action: 'passive',
        iconName: 'heart-drop',
      },
    ],
  },
};

export const BLOOD_HUNTER_ICONS = {
  class: 'dripping-sword',
  subclasses: {
    [GHOSTSLAYER]: 'floating-ghost',
    [LYCAN]: 'werewolf',
    'order-of-the-mutant': 'bubbling-flask',
    'order-of-the-profane-soul': 'warlock-eye',
  } as Record<string, string>,
};
