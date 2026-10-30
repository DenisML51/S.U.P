import { FORM_GROUP } from '../../../rules/concentration';
import { byClassLevel } from '../../helpers';
import type { Amount, BeastFormDef, BuildContext, ClassDef, Effect, FeatureDef, GrantedAttackDef, KitOption, OptionDef, SkillId, SubclassDef } from '../../types';
import { beastSummary } from '../beasts';
import {
  ONCE_THEN_SACRIFICE,
  UNDYING_THIRST,
  conAtLeastOne,
  riteDC,
  riteDie,
  vitalSacrifice,
} from '../blood-hunter/alternate';
import { CLERIC } from './cleric';
import { abilityScoreImprovement, byTable } from './shared';

/**
 * Alternate Blood Hunter by laserllama, v2.2.0 (Альтернативный охотник на крови): a homebrew for 5e
 * built on Constitution and the Vital Sacrifice — a Rite Die off the current and maximum hit points
 * until a long rest. Descriptions are our own summaries of the rules.
 */

const SOURCE = 'Alternate Blood Hunter (laserllama)';
const RITES_POOL = 'blood-rites';
const STYLES_POOL = 'blood-hunter-styles';
const LATENT_POOL = 'latent-mutagens';
/** The free Crimson Offering of a rest, from Crimson Brand (level 6). */
const FREE_OFFERING = 'alt-blood-hunter.free-offering';
const OFFERING_GROUP = 'crimson-offering';
const PALE_MOON = 'order-of-the-pale-moon';

export const ALT_BLOOD_HUNTER_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'scale-mail' },
      { ref: 'longsword' },
      { ref: 'javelin', quantity: 4 },
      { ref: 'alchemists-supplies' },
      { ref: 'explorers-pack' },
    ],
    gold: 9,
  },
  { id: 'b', label: 'B', items: [], gold: 125 },
];

/** Something used once per rest for free and then for a Vital Sacrifice: its pool and the price. */
const onceThenSacrifice = (id: string, name: string, max: Amount = 1, recharge: 'shortOrLong' | 'long' = 'shortOrLong') =>
  ({
    resource: { id, name, max, recharge },
    usesResource: { id },
    hpCostWhenSpent: vitalSacrifice,
  }) satisfies Partial<FeatureDef>;

// ------------------------------------------------------------------------------------------------
// Crimson Offering
// ------------------------------------------------------------------------------------------------

const OFFERING_TEXT =
  'Бонусным действием вы совершаете Жизненную жертву и даёте крови стечь на оружие в руке: 1 час, нанося им урон, вы наносите дополнительно кость обряда урона';

/**
 * A Crimson Offering of one damage type, as a stance of the offering group. Until level 5 each costs a
 * Vital Sacrifice; from 6 (Crimson Brand) one a rest is free, the rest cost the sacrifice.
 */
const offering = (id: string, name: string, damageType: string, damageName: string, iconName: string, extra: { description?: string; effects?: Effect[] } = {}): FeatureDef[] => {
  const base: FeatureDef = {
    id,
    name,
    description: `${OFFERING_TEXT} ${damageName}.${extra.description ? `\n\n${extra.description}` : ''}\n\nНа листе действует на все атаки оружием; одновременно — одно подношение. С 6-го уровня одно подношение за короткий или продолжительный отдых — без жертвы.`,
    action: 'bonus',
    iconName,
    stance: {
      group: OFFERING_GROUP,
      // From level 7 a Pale Moon hunter's natural weapons and unarmed strikes take the offering too.
      effects: (ctx) => [{ type: 'damageBonus', dice: riteDie(ctx), damageType, weapon: !(ctx.subclass === PALE_MOON && ctx.classLevel >= 7) }, ...(extra.effects ?? [])],
    },
  };
  return [
    { ...base, maxLevel: 5, hpCost: vitalSacrifice },
    { ...base, minLevel: 6, usesResource: { id: FREE_OFFERING }, hpCostWhenSpent: vitalSacrifice },
  ];
};

const offeringOption = (id: string, name: string, damageType: string, damageName: string, iconName: string, minLevel?: number): OptionDef => ({
  id,
  name,
  description: `Подношение наносит урон ${damageName}.${minLevel ? ` С ${minLevel}-го уровня.` : ''}`,
  minLevel,
  iconName,
  features: offering(`alt-blood-hunter.offering-${id}`, `Багровое подношение: ${name.toLowerCase()}`, damageType, damageName, iconName),
});

const OFFERING_TYPES: OptionDef[] = [
  offeringOption('acid', 'Кислота', 'Кислота', 'кислотой', 'acid'),
  offeringOption('cold', 'Холод', 'Холод', 'холодом', 'snowflake-1'),
  offeringOption('fire', 'Огонь', 'Огонь', 'огнём', 'fire'),
  offeringOption('lightning', 'Электричество', 'Электричество', 'электричеством', 'lightning-arc'),
  offeringOption('poison', 'Яд', 'Яд', 'ядом', 'poison-bottle'),
  offeringOption('necrotic', 'Некротическая энергия', 'Некротический', 'некротической энергией', 'death-skull', 11),
  offeringOption('psychic', 'Психическая энергия', 'Психический', 'психической энергией', 'third-eye', 11),
  offeringOption('thunder', 'Звук', 'Звук', 'звуком', 'screaming', 11),
];

// ------------------------------------------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------------------------------------------

const SKILL_NAMES: Partial<Record<SkillId, string>> = { arcana: 'Магия', nature: 'Природа', religion: 'Религия' };

/** Proficiency in a skill, or expertise when the hero already has it (Occult Lore, Heretical Knowledge). */
const loreOptions = (skills: SkillId[]): OptionDef[] =>
  skills.flatMap((skill) => [
    { id: skill, name: SKILL_NAMES[skill] ?? skill, description: 'Владение навыком.', effects: [{ type: 'skill', skill }], iconName: 'book-cover' },
    { id: `${skill}-expertise`, name: `${SKILL_NAMES[skill] ?? skill}: экспертиза`, description: 'Если вы уже владеете навыком — экспертиза в нём.', effects: [{ type: 'expertise', skill }], iconName: 'book-aura' },
  ]);

const moreRites = (level: number, count = 1): FeatureDef => ({
  id: `alt-blood-hunter.rites-${level}`,
  name: 'Новый кровавый обряд',
  description: 'Вы узнаёте ещё один кровавый обряд.',
  hidden: true,
  choices: [{ id: 'rite', label: 'Кровавый обряд', count, pool: RITES_POOL, options: { from: 'catalog', catalog: 'bloodRites' } }],
});

const PHYSICAL: Effect[] = ['Дробящий', 'Колющий', 'Рубящий'].map((damageType) => ({ type: 'resistance', damageType }));

// ------------------------------------------------------------------------------------------------
// Orders
// ------------------------------------------------------------------------------------------------

const MUTATE = 'alchemists.mutate';

const moreMutagens = (level: number): FeatureDef => ({
  id: `alchemists.mutagens-${level}`,
  name: 'Новые латентные мутагены',
  description: 'Вы узнаёте ещё два латентных мутагена.',
  hidden: true,
  choices: [{ id: 'mutagens', label: 'Латентные мутагены (2)', count: 2, pool: LATENT_POOL, onSheet: true, options: { from: 'catalog', catalog: 'latentMutagens' } }],
});

const alchemists: SubclassDef = {
  id: 'order-of-alchemists',
  name: 'Орден Алхимиков',
  source: SOURCE,
  description: 'Охотники, что вливают в себя эссенции чудовищ и на время перекраивают своё тело.',
  levels: {
    3: [
      {
        id: MUTATE,
        name: 'Мутация',
        description: `Бонусным действием вы на 10 минут мутируете (окончить — бонусным действием): включаются латентные мутагены, но не больше модификатора Телосложения (минимум 1) — выбор при мутации. Вы знаете 3 латентных мутагена (5 с 7-го уровня, 7 с 13-го, 9 с 18-го); за продолжительный отдых один можно заменить, потратив час с инструментами алхимика. ${ONCE_THEN_SACRIFICE}`,
        action: 'bonus',
        ...onceThenSacrifice(MUTATE, 'Мутация'),
        iconName: 'dna1',
        stance: { effects: [] },
        choices: [{ id: 'mutagens', label: 'Латентные мутагены (3)', count: 3, pool: LATENT_POOL, onSheet: true, options: { from: 'catalog', catalog: 'latentMutagens' } }],
      },
      {
        id: 'alchemists.monstrous-awareness',
        name: 'Чудовищная осведомлённость',
        description: 'Вы прибавляете кость обряда к проверкам с инструментами алхимика и к Зловещей проницательности против аберраций, чудовищ и слизей.',
        action: 'passive',
        iconName: 'bubbling-flask',
      },
    ],
    7: [
      {
        id: 'alchemists.enduring-mutation',
        name: 'Стойкая мутация',
        description: 'За продолжительный отдых, потратив час с инструментами алхимика, вы делаете один латентный мутаген постоянным: он действует и без Мутации, а при Мутации занимает одно из мест. Его можно сменить в следующий отдых.',
        action: 'passive',
        iconName: 'dna1',
      },
      moreMutagens(7),
    ],
    13: [
      {
        id: 'alchemists.noxious-strike',
        name: 'Ядовитый удар',
        description: `Раз в ход, попав рукопашной атакой, вы заставляете цель совершить спасбросок Телосложения: при провале 4 кости обряда урона кислотой, и она ослеплена или ошеломлена (на ваш выбор) на 1 минуту, повторяя спасбросок при каждом получении урона; при успехе — половина урона. Использований — модификатор Телосложения (минимум 1) за продолжительный отдых, дальше — за Жизненную жертву.`,
        action: 'passive',
        ...onceThenSacrifice('alchemists.noxious-strike', 'Ядовитый удар', conAtLeastOne, 'long'),
        damage: (ctx) => riteDie(ctx, 4),
        damageType: 'Кислота',
        saveAttribute: 'constitution',
        saveDC: riteDC,
        iconName: 'acid',
      },
      moreMutagens(13),
    ],
    18: [
      {
        id: 'alchemists.rapid-mutation',
        name: 'Быстрая мутация',
        description: 'Мутировав, вы можете бонусным действием заменить один активный мутаген одним из латентных.',
        action: 'bonus',
        iconName: 'dna1',
      },
      moreMutagens(18),
    ],
  },
};

/** The Channel Divinity options of level 3 of the cleric domains, for a heretic to take one of. */
const DOMAIN_CHANNELS: OptionDef[] = CLERIC.subclasses.flatMap((domain) =>
  (domain.levels[3] ?? [])
    .filter((f) => f.usesResource?.id === 'cleric.channel-divinity')
    .map((f): OptionDef => {
      const pool = `heretics.${f.id}`;
      return {
        id: f.id,
        name: `${domain.name}: ${f.name}`,
        description: f.description,
        iconName: f.iconName,
        features: [
          {
            ...f,
            id: `heretics.${f.id}`,
            description: `${f.description}\n\nУровень охотника на крови считается уровнем жреца, СЛ — СЛ обрядов. Раз в продолжительный отдых, затем — за Жизненную жертву; одно Проведение божественности за ход.`,
            ...onceThenSacrifice(pool, f.name, 1, 'long'),
            ...(f.saveAttribute ? { saveDC: riteDC } : {}),
          },
        ],
      };
    }),
);

const censure = (anathema: boolean): FeatureDef => ({
  id: 'heretics.censure-the-divine',
  name: 'Порицание божественного',
  description: `Действием небожители, исчадия и существа, способные к божественной магии (жрецы, паладины), на ваш выбор в пределах 30 футов совершают спасбросок Харизмы или опутаны и недееспособны 1 минуту, повторяя спасбросок в конце своих ходов и при получении урона. Раз в продолжительный отдых, затем — за Жизненную жертву.`,
  action: 'action',
  ...onceThenSacrifice('heretics.censure-the-divine', 'Порицание божественного', 1, 'long'),
  saveAttribute: 'charisma',
  saveDC: riteDC,
  iconName: 'church',
  ...(anathema
    ? {
        minLevel: 13,
        amplify: {
          description:
            'Божественная анафема: вместо обычного эффекта — выбранные существа в пределах 30 футов (не только божественные) совершают спасбросок Харизмы; провал — скорость −10 футов, повторный спасбросок в конце каждого хода: провал — ещё −10 футов, успех — +10. Потеряв всю скорость, существо окаменевает. Небожители и исчадия — с помехой; преуспевший неуязвим до рассвета.',
          hpCost: vitalSacrifice,
        },
      }
    : { maxLevel: 12 }),
});

const heretics: SubclassDef = {
  id: 'order-of-heretics',
  name: 'Орден Еретиков',
  source: SOURCE,
  description: 'Отлучённые жрецы, что соединили божественную силу с запретной магией крови.',
  levels: {
    3: [
      censure(false),
      censure(true),
      {
        id: 'heretics.blasphemous-prayer',
        name: 'Богохульная молитва',
        description: 'Вы получаете вариант Проведения божественности одного из жреческих доменов (2-го уровня в старых правилах).',
        hidden: true,
        choices: [{ id: 'domain', label: 'Проведение божественности домена', count: 1, options: { from: 'options', options: DOMAIN_CHANNELS } }],
      },
      {
        id: 'heretics.heretical-knowledge',
        name: 'Еретическое знание',
        description: 'Владение Религией (или экспертиза, если уже владеете), два заговора жреца (Телосложение); кость обряда прибавляется к Зловещей проницательности против небожителей, исчадий и нежити.',
        iconName: 'evil-book',
        choices: [
          { id: 'religion', label: 'Религия', count: 1, options: { from: 'options', options: loreOptions(['religion']) } },
          { id: 'cantrips', label: 'Заговоры жреца (2)', count: 2, spellAbility: 'constitution', options: { from: 'spells', lists: ['cleric'], maxLevel: 0 } },
        ],
      },
    ],
    7: [
      {
        id: 'heretics.unholy-restoration',
        name: 'Нечестивое восстановление',
        description:
          'Действием — существо в пределах 30 футов совершает спасбросок Телосложения (с помехой, если вы его касаетесь): при провале 4 кости обряда некротического урона, при успехе половина. Другое видимое существо в пределах 30 футов восстанавливает хиты, равные половине нанесённого урона. Использований — модификатор Телосложения (минимум 1) за продолжительный отдых, дальше — за Жизненную жертву.',
        action: 'action',
        ...onceThenSacrifice('heretics.unholy-restoration', 'Нечестивое восстановление', conAtLeastOne, 'long'),
        damage: (ctx) => riteDie(ctx, 4),
        damageType: 'Некротический',
        saveAttribute: 'constitution',
        saveDC: riteDC,
        iconName: 'skull-staff',
      },
    ],
    13: [
      {
        id: 'heretics.divine-anathema',
        name: 'Божественная анафема',
        description: 'Порицание божественного можно усилить Жизненной жертвой: оно действует на любых существ и постепенно обращает их в камень (см. «Порицание»).',
        action: 'passive',
        iconName: 'stone-bust',
      },
    ],
    18: [
      {
        id: 'heretics.utmost-transgression',
        name: 'Высшее прегрешение',
        description:
          'Действием вы творите «Призыв небожителя» 5-го круга (Телосложение) без материального компонента, длительностью 1 минута. Раз за короткий или продолжительный отдых бесплатно, затем — за столько Жизненных жертв, какова опасность призываемого небожителя.',
        action: 'action',
        resource: { id: 'heretics.utmost-transgression', name: 'Высшее прегрешение', max: 1, recharge: 'shortOrLong' },
        iconName: 'angel-wings',
      },
    ],
  },
};

const SHIFT = 'pale-moon.shift';

/** A shift of the Pale Moon: a Vital Sacrifice once its free use is spent, at will from level 18. */
const shiftCost = (unlimited: boolean): Partial<FeatureDef> => (unlimited ? { minLevel: 18 } : { maxLevel: 17, usesResource: { id: SHIFT }, hpCostWhenSpent: vitalSacrifice });

const SHIFT_TEXT = 'Облик держится до 1 часа (Жизненная жертва продлевает на час) и спадает, если вы недееспособны; закончить — бонусным действием.';

/** What the hybrid form gives: speed, climbing and Savage Strikes; Lycan Warrior's resistances from 7. */
const hybridEffects = (ctx: BuildContext): Effect[] => {
  const strike: Omit<GrantedAttackDef, 'id' | 'name'> = { damage: riteDie(ctx), damageType: 'Рубящий', abilities: ['strength', 'dexterity'], iconName: 'claw-slashes' };
  return [
    { type: 'speed', amount: 10 },
    { type: 'movement', mode: 'climb' },
    { type: 'attack', attack: { ...strike, id: 'pale-moon-savage-strike', name: 'Дикий удар', description: 'Безоружный удар (фехтовальный): колющий или рубящий урон, равный кости обряда.' } },
    { type: 'attack', attack: { ...strike, id: 'pale-moon-savage-strike-bonus', name: 'Дикий удар: бонусное действие', description: 'Дикая ярость: бонусным действием каждый ход — безоружный удар или «Рывок» к видимому врагу.', actionType: 'bonus' } },
    ...(ctx.classLevel >= 7 ? PHYSICAL : []),
  ];
};

const hybridForm = (unlimited: boolean): FeatureDef => ({
  id: 'pale-moon.hybrid-form',
  name: 'Гибридный облик',
  description: `Бонусным действием вы принимаете гибридный облик, сохраняя свои характеристики: скорость +10 футов и лазание, безоружные удары — фехтовальные, урон костью обряда (колющий или рубящий), бонусным действием каждый ход — безоружный удар или «Рывок» к врагу. ${SHIFT_TEXT}${unlimited ? ' С 18-го уровня — по желанию и без ограничения времени.' : ` ${ONCE_THEN_SACRIFICE}`}`,
  action: 'bonus',
  ...shiftCost(unlimited),
  iconName: 'werewolf',
  stance: { effects: hybridEffects },
});

/** The beast of a Pale Moon curse as a shape to shift into. */
const beastForm = (beast: BeastFormDef): FeatureDef[] =>
  [false, true].map((unlimited) => ({
    id: `pale-moon.beast-${beast.id}`,
    name: `Облик зверя: ${beast.name}`,
    description: `${beastSummary(beast)}\n\nВы сохраняете свои хиты, Интеллект, Мудрость, Харизму, особенности (и Кровавые обряды, если зверь способен) и владения. Природное оружие зверя бьёт костью обряда и вашей СЛ обрядов, если они выше. ${SHIFT_TEXT}${unlimited ? '' : ` ${ONCE_THEN_SACRIFICE}`}`,
    action: 'bonus' as const,
    ...shiftCost(unlimited),
    iconName: beast.iconName,
    stance: { group: FORM_GROUP, effects: (ctx: BuildContext): Effect[] => [{ type: 'form', beast: beast.id }, ...(ctx.classLevel >= 7 ? PHYSICAL : [])] },
  }));

const paleMoon: SubclassDef = {
  id: PALE_MOON,
  name: 'Орден Бледной луны',
  source: SOURCE,
  description: 'Охотники на ликантропов, что носят их проклятие в себе и обращают зверя против чудовищ.',
  levels: {
    3: [
      {
        id: 'pale-moon.feral-senses',
        name: 'Звериные чувства',
        description: 'Кость обряда прибавляется к проверкам Восприятия и Выживания, полагающимся на зрение, слух или обоняние, и к Зловещей проницательности против зверей, чудовищ и оборотней.',
        action: 'passive',
        effects: (ctx) => [{ type: 'rollDice', on: ['skill:perception', 'skill:survival'], dice: riteDie(ctx) }],
        iconName: 'beast-eye',
      },
      {
        id: 'pale-moon.lycanthropic-curse',
        name: 'Ликантропическое проклятие',
        description: `Вы выбираете зверя с опасностью не выше 1 — это навсегда. Бонусным действием вы принимаете облик этого зверя или гибридный облик. ${ONCE_THEN_SACRIFICE}`,
        action: 'passive',
        resource: { id: SHIFT, name: 'Смена облика', max: 1, recharge: 'shortOrLong' },
        iconName: 'moon-claws',
        choices: [{ id: 'beast', label: 'Зверь проклятия', count: 1, options: { from: 'beasts', maxCR: 1, features: beastForm } }],
      },
      hybridForm(false),
      hybridForm(true),
    ],
    7: [
      {
        id: 'pale-moon.lycan-warrior',
        name: 'Воин-ликантроп',
        description: 'В изменённом облике ваши атаки магические, и у вас сопротивление дробящему, колющему и рубящему урону от немагических атак не серебряным оружием. Багровое подношение действует на природное оружие и безоружные удары; подношение с оружия в руке можно перенести на них при смене облика.',
        action: 'passive',
        iconName: 'wolf-howl',
      },
    ],
    13: [
      {
        id: 'pale-moon.feral-prowess',
        name: 'Звериная доблесть',
        description: 'Начиная ход в изменённом облике с хитами меньше половины максимума (но не меньше 1), вы восстанавливаете хиты, равные модификатору Телосложения (минимум 1).',
        action: 'passive',
        iconName: 'regeneration',
      },
    ],
    18: [
      {
        id: 'pale-moon.lycanthropic-mastery',
        name: 'Мастерство ликантропа',
        description: 'Вы меняете облик по желанию, без жертвы, и остаётесь в нём сколько угодно. В изменённом облике — преимущество на атаки по существу под Багровым клеймом и на спасброски, к которым оно вас вынуждает.',
        action: 'passive',
        iconName: 'direwolf',
      },
    ],
  },
};

const SPECTRAL = 'salt-and-iron.spectral-state';

const saltAndIron: SubclassDef = {
  id: 'order-of-salt-and-iron',
  name: 'Орден Соли и Железа',
  source: SOURCE,
  description: 'Экзорцисты, что охотятся на нежить и сами наполовину призраки.',
  levels: {
    3: [
      {
        id: SPECTRAL,
        name: 'Призрачное состояние',
        description:
          'Бонусным действием вы становитесь полупризрачным до конца хода (1 минуту с 7-го уровня, 1 час с 13-го, без ограничения с 18-го; закончить — бонусным действием): сопротивление дробящему, колющему и рубящему урону от немагических атак не серебряным оружием, сквозь существ и предметы вы проходите как по труднопроходимой местности. Закончив движение внутри, вас выталкивает с 1к10 урона силовым полем за каждые 5 футов. С 18-го уровня в этом состоянии у вас скорость полёта. Вам нужно вдвое меньше сна, еды и питья. Использований — модификатор Телосложения (минимум 1) за продолжительный отдых, дальше — за Жизненную жертву.',
        action: 'bonus',
        ...onceThenSacrifice(SPECTRAL, 'Призрачное состояние', conAtLeastOne, 'long'),
        damage: '1d10',
        damageType: 'Силовой',
        iconName: 'floating-ghost',
        stance: { effects: (ctx) => [...PHYSICAL, ...(ctx.classLevel >= 18 ? [{ type: 'movement', mode: 'fly' } as Effect] : [])] },
      },
      ...offering('salt-and-iron.dawn-offering', 'Багровое подношение: рассвет', 'Лучистый', 'излучением', 'sunrise', {
        description: 'Воин рассвета: подношение наполнено магией ордена — оружие излучает яркий свет на 30 футов, у вас сопротивление некротическому урону. Кость обряда прибавляется к Зловещей проницательности против нежити.',
        effects: [{ type: 'resistance', damageType: 'Некротический' }],
      }),
    ],
    7: [
      {
        id: 'salt-and-iron.curse-specialist',
        name: 'Специалист по проклятиям',
        description: 'Ваши Кровавые обряды действуют на любых существ, даже без крови. Заканчивая продолжительный отдых, вы выбираете известный обряд: до следующего отдыха его можно призвать бесплатно ещё раз (отметьте вручную).',
        action: 'passive',
        iconName: 'cursed-star',
      },
    ],
    13: [
      {
        id: 'salt-and-iron.warrior-exorcist',
        name: 'Воин-экзорцист',
        description: `Бонусным действием — согласное существо в пределах 30 футов, которое слышит вас и очаровано, испугано или под магическим контролем: один такой эффект оканчивается. Если его источник в пределах 30 футов, он совершает спасбросок Мудрости: при провале 4 кости обряда урона излучением, при успехе половина. ${ONCE_THEN_SACRIFICE}`,
        action: 'bonus',
        ...onceThenSacrifice('salt-and-iron.warrior-exorcist', 'Воин-экзорцист'),
        damage: (ctx) => riteDie(ctx, 4),
        damageType: 'Лучистый',
        saveAttribute: 'wisdom',
        saveDC: riteDC,
        iconName: 'holy-symbol',
      },
    ],
    18: [
      {
        id: 'salt-and-iron.sacrificial-offering',
        name: 'Жертвенное подношение',
        description: 'Когда ваши хиты опускаются до 0, но вы не убиты сразу, вы можете совершить особую Жизненную жертву, снижающую только максимум хитов, и остаться с 1 хитом.',
        action: 'passive',
        iconName: 'sacrificial-dagger',
      },
      {
        id: 'salt-and-iron.spectral-mastery',
        name: 'Призрачное мастерство',
        description: 'Вы стареете на год за каждые десять, не нуждаетесь во сне, еде и питье и получаете выгоды продолжительного отдыха за 6 часов лёгкой деятельности. В Призрачном состоянии у вас скорость полёта, равная скорости ходьбы, и вы можете парить.',
        action: 'passive',
        iconName: 'ghost',
      },
    ],
  },
};

const fangs = (ctx: BuildContext, bonus: boolean): Effect => ({
  type: 'attack',
  attack: {
    id: bonus ? 'undying-fangs-bonus' : 'undying-fangs',
    name: bonus ? 'Клыки: бонусное действие' : 'Клыки',
    description: bonus
      ? 'Иссушение сути: попав атакой, вы можете бонусным действием укусить ту же цель; при попадании ваш максимум хитов восстанавливается на нанесённый урон (верните его в окне хитов).'
      : 'Безоружный удар: некротический урон, равный кости обряда + модификатор Силы.',
    damage: riteDie(ctx),
    damageType: 'Некротический',
    abilities: ['strength'],
    iconName: 'fangs',
    ...(bonus ? { actionType: 'bonus' as const } : {}),
  },
});

const undyingThirst: SubclassDef = {
  id: UNDYING_THIRST,
  name: 'Орден Неутолимой жажды',
  source: SOURCE,
  description: 'Охотники на вампиров, несущие в крови их проклятие: клыки, туман и власть над кровью.',
  levels: {
    3: [
      {
        id: 'undying-thirst.blood-magic-specialist',
        name: 'Мастер магии крови',
        description: 'Вы узнаёте ещё один кровавый обряд (сверх известных). Кость обряда: к6, к8 с 5-го уровня, к10 с 11-го, к12 с 17-го. Багровое подношение может наносить некротический урон.',
        action: 'passive',
        iconName: 'chalice-drops',
        choices: [{ id: 'rite', label: 'Кровавый обряд', count: 1, pool: RITES_POOL, options: { from: 'catalog', catalog: 'bloodRites' } }],
      },
      ...offering('undying-thirst.necrotic-offering', 'Багровое подношение: некротическая энергия', 'Некротический', 'некротической энергией', 'death-skull'),
      {
        id: 'undying-thirst.vampiric-nature',
        name: 'Вампирская природа',
        description: 'У вас клыки — безоружный удар с некротическим уроном, равным кости обряда + модификатор Силы. Кость обряда прибавляется к Зловещей проницательности против нежити.',
        action: 'passive',
        effects: (ctx) => [fangs(ctx, false)],
        iconName: 'vampire-dracula',
      },
    ],
    7: [
      {
        id: 'undying-thirst.essence-drain',
        name: 'Иссушение сути',
        description: 'Попав по существу атакой, вы можете бонусным действием атаковать его клыками; попав, вы восстанавливаете максимум хитов на нанесённый урон — и снимаете снижение от Жизненных жертв. Восстановлений максимума — модификатор Телосложения (минимум 1) за продолжительный отдых.',
        action: 'passive',
        resource: { id: 'undying-thirst.essence-drain', name: 'Иссушение сути', max: conAtLeastOne, recharge: 'long' },
        usesResource: { id: 'undying-thirst.essence-drain' },
        effects: (ctx) => [fangs(ctx, true)],
        iconName: 'bestial-fangs',
      },
      {
        id: 'undying-thirst.sinister-resilience',
        name: 'Зловещая стойкость',
        description: 'Нанося некротический урон, вы можете получить временные хиты, равные половине нанесённого. Пока они есть, у вас сопротивление некротическому урону, яду и немагическому дробящему, колющему и рубящему урону не серебряным оружием. Урон излучением снимает эти хиты и проходит по обычным.',
        action: 'passive',
        iconName: 'vampire-cape',
      },
    ],
    13: [
      {
        id: 'undying-thirst.misty-escape',
        name: 'Туманное бегство',
        description: `Реакцией, когда видимое существо попадает по вам атакой, вы обращаетесь туманом: атака промахивается, а вы появляетесь в видимом свободном месте в пределах 30 футов. ${ONCE_THEN_SACRIFICE}`,
        action: 'reaction',
        ...onceThenSacrifice('undying-thirst.misty-escape', 'Туманное бегство'),
        iconName: 'smoking-orb',
      },
    ],
    18: [
      {
        id: 'undying-thirst.crimson-lord',
        name: 'Багровый владыка',
        description: 'Скорость полёта, равная скорости ходьбы. Существо, раненное вашими клыками, совершает с помехой спасброски от ваших Кровавых обрядов до конца вашего следующего хода. Вы стареете на год за каждые десять.',
        action: 'passive',
        effects: [{ type: 'movement', mode: 'fly' }],
        iconName: 'vampire-dracula',
      },
    ],
  },
};

const witchKnights: SubclassDef = {
  id: 'order-of-witch-knights',
  name: 'Орден Ведьмовских рыцарей',
  source: SOURCE,
  description: 'Воины-чародеи, заключившие договор ради магии, что течёт по клинку вместе с кровью.',
  spellcasting: {
    ability: 'constitution',
    list: 'witchKnight',
    progression: 'pact',
    pact: [
      { count: 0, level: 1 }, { count: 0, level: 1 }, { count: 1, level: 1 }, { count: 2, level: 1 }, { count: 2, level: 1 },
      { count: 2, level: 1 }, { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 2 },
      { count: 2, level: 2 }, { count: 2, level: 2 }, { count: 2, level: 3 }, { count: 2, level: 3 }, { count: 2, level: 3 },
      { count: 2, level: 3 }, { count: 2, level: 3 }, { count: 2, level: 3 }, { count: 2, level: 4 }, { count: 2, level: 4 },
    ],
    mode: 'known',
    prepared: byTable([0, 0, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7]),
    cantrips: byClassLevel({ 3: 2, 13: 3 }),
  },
  levels: {
    3: [
      {
        id: 'witch-knights.pact-magic',
        name: 'Магия договора',
        description: 'Вы творите заклинания из списка Ведьмовских рыцарей Телосложением (СЛ = СЛ обрядов; бонус атаки = бонус мастерства + модификатор Телосложения). Все ячейки одного круга и возвращаются после короткого или продолжительного отдыха. Повышая уровень, одно известное заклинание можно заменить.',
        action: 'passive',
        iconName: 'witch-face',
      },
      {
        id: 'witch-knights.crimson-blade',
        name: 'Багровый клинок',
        description: 'Оружие с Багровым подношением служит вам заклинательной фокусировкой. Тратя ячейку договора, вы можете наделить подношением оружие в руке; если оно уже с подношением, следующая его атака наносит дополнительно по кости обряда за каждый круг ячейки.',
        action: 'passive',
        iconName: 'rune-sword',
      },
    ],
    7: [
      {
        id: 'witch-knights.sanguine-warrior',
        name: 'Кровавый воин',
        description: 'Действием сотворив заклинание (или управляя заклинанием с концентрацией), вы можете бонусным действием совершить одну атаку оружием. Творя через оружие с подношением, вы можете сменить вид урона заклинания на вид урона подношения.',
        action: 'passive',
        iconName: 'sword-spin',
      },
    ],
    13: [
      {
        id: 'witch-knights.bewitched-strikes',
        name: 'Заколдованные удары',
        description: 'Попав по существу атакой оружием, вы заставляете его совершить с помехой следующий спасбросок от вашего Кровавого обряда или заклинания до конца вашего следующего хода.',
        action: 'passive',
        iconName: 'cursed-star',
      },
    ],
    18: [
      {
        id: 'witch-knights.profane-sacrifice',
        name: 'Нечестивая жертва',
        description: 'Реакцией, когда враждебное существо умирает в пределах 30 футов: вы восстанавливаете одну ячейку договора или получаете временные хиты, равные кости обряда + уровень охотника на крови. Раз за короткий или продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'witch-knights.profane-sacrifice', name: 'Нечестивая жертва', max: 1, recharge: 'shortOrLong' },
        damage: (ctx) => `${riteDie(ctx)}+${ctx.classLevel}`,
        iconName: 'soul-vessel',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

export const ALT_BLOOD_HUNTER: ClassDef = {
  id: 'alt-blood-hunter',
  name: 'Альтернативный охотник на крови',
  source: 'laserllama',
  description:
    'Мастер чудовищной магии крови, черпающий силу в Телосложении: Кровавые обряды за Жизненную жертву, багровое подношение на клинке и тайные ордена — от алхимиков до ведьмовских рыцарей.',
  hitDie: 12,
  primary: ['constitution', 'strength'],
  saves: ['constitution', 'charisma'],
  skillChoices: { count: 2, list: ['athletics', 'acrobatics', 'arcana', 'history', 'insight', 'investigation', 'nature', 'religion', 'survival'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
    { type: 'proficiency', category: 'tool', value: 'Инструменты алхимика' },
  ],
  subclassLevel: 3,
  subclasses: [alchemists, heretics, paleMoon, saltAndIron, undyingThirst, witchKnights],
  replaceable: [
    { pool: STYLES_POOL, label: 'Замена боевого стиля' },
    { pool: RITES_POOL, label: 'Замена обряда' },
  ],
  startingEquipment: ALT_BLOOD_HUNTER_KITS,
  levels: {
    1: [
      {
        id: 'alt-blood-hunter.fighting-style',
        name: 'Боевой стиль',
        description: 'Вы изучаете боевой стиль охотника на крови, требованиям которого соответствуете; повышая уровень, его можно заменить.',
        iconName: 'crossed-swords',
        choices: [{ id: 'style', label: 'Боевой стиль', count: 1, pool: STYLES_POOL, options: { from: 'catalog', catalog: 'bloodHunterStyles' } }],
      },
      {
        id: 'alt-blood-hunter.occult-lore',
        name: 'Оккультное знание',
        description: 'Владение Магией, Природой или Религией на выбор; если вы уже владеете выбранным навыком — экспертиза в нём.',
        iconName: 'book-aura',
        choices: [{ id: 'skill', label: 'Оккультное знание', count: 1, options: { from: 'options', options: loreOptions(['arcana', 'nature', 'religion']) } }],
      },
      {
        id: 'alt-blood-hunter.sinister-insight',
        name: 'Зловещая проницательность',
        description:
          'Бонусным действием — существо, которое вы видите в пределах 30 футов: проверка Телосложения с навыком по его виду (Магия — аберрации, драконы, чудовища; Природа — звери, элементали, слизи, растения; Религия — небожители, феи, исчадия, нежить) против СЛ 8 + его опасность. Успех — вы узнаёте одно: КД, наибольшую или наименьшую характеристику, особые чувства, сопротивления и иммунитеты или одно умение. Провал — снова на нём только после продолжительного отдыха или когда вы раните его оружием или обрядом.',
        action: 'bonus',
        iconName: 'hunter-eyes',
      },
    ],
    2: [
      {
        id: 'alt-blood-hunter.blood-rites',
        name: 'Кровавые обряды',
        description:
          'Вы знаете кровавые обряды (2, затем 3 на 5-м уровне, 4 на 9-м, 5 на 13-м, 6 на 17-м; повышая уровень, один можно заменить). Каждый — раз за короткий или продолжительный отдых бесплатно, затем за Жизненную жертву: бросьте кость обряда и уменьшите на результат текущие и максимальные хиты до продолжительного отдыха. Ещё одна жертва при призыве усиливает обряд. Без усиления обряды действуют лишь на существ с кровью. СЛ обрядов = 8 + бонус мастерства + модификатор Телосложения.',
        action: 'passive',
        iconName: 'chalice-drops',
        choices: [{ id: 'rites', label: 'Кровавые обряды (2)', count: 2, pool: RITES_POOL, options: { from: 'catalog', catalog: 'bloodRites' } }],
      },
      {
        id: 'alt-blood-hunter.crimson-offering',
        name: 'Багровое подношение',
        description: 'Бонусным действием, совершив Жизненную жертву, вы на 1 час наделяете оружие в руке кровью: его урон получает кость обряда выбранного вида — кислота, холод, огонь, электричество или яд (с 11-го уровня — также некротическая энергия, психическая энергия или звук). Вид меняется на листе.',
        // Not used itself: the offering of the chosen type is; here the type is changed.
        action: 'passive',
        iconName: 'dripping-sword',
        choices: [{ id: 'type', label: 'Вид урона подношения', count: 1, onSheet: true, options: { from: 'options', options: OFFERING_TYPES } }],
      },
    ],
    3: [{ id: 'alt-blood-hunter.subclass', name: 'Тайный орден', description: 'Вы вступаете в тайный орден охотников на крови.', hidden: true }],
    4: [abilityScoreImprovement('alt-blood-hunter', 4)],
    5: [
      {
        id: 'alt-blood-hunter.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая действие «Атака», вы атакуете дважды. Призвав действием Кровавый обряд, вы можете в этот ход бонусным действием совершить одну атаку оружием.',
        action: 'passive',
        iconName: 'crossed-swords',
        effects: [{ type: 'extraAttack', attacks: 2 }],
      },
      {
        id: 'alt-blood-hunter.grim-psychometry',
        name: 'Мрачная психометрия',
        description: 'Вы творите «Опознание» ритуалом с инструментами алхимика вместо материальных компонентов и узнаёте, проклят ли предмет и как.',
        action: 'passive',
        iconName: 'crystal-ball',
        effects: [{ type: 'spell', spell: 'identify', alwaysPrepared: true, ability: 'constitution', note: 'Только ритуалом' }],
      },
      moreRites(5),
    ],
    6: [
      {
        id: 'alt-blood-hunter.crimson-brand',
        name: 'Багровое клеймо',
        description:
          'Раз за короткий или продолжительный отдых Багровое подношение — без жертвы. Раня существо оружием с подношением, вы можете заклеймить его душу (раз за отдых, затем — за Жизненную жертву): вы знаете направление к нему на этом плане, Зловещая проницательность против него — с преимуществом, а каждый раз, раня вас или дружественное существо в пределах 15 футов от вас, оно получает некротический урон, равный кости обряда (двум с 14-го уровня). Клеймо держится до смерти существа или нового клейма; его снимает «Снятие проклятия».',
        action: 'passive',
        ...onceThenSacrifice('alt-blood-hunter.crimson-brand', 'Багровое клеймо'),
        damage: (ctx) => riteDie(ctx, ctx.classLevel >= 14 ? 2 : 1),
        damageType: 'Некротический',
        iconName: 'scar-wound',
      },
      {
        id: 'alt-blood-hunter.free-offering',
        name: 'Бесплатное подношение',
        description: 'Одно Багровое подношение за короткий или продолжительный отдых — без Жизненной жертвы.',
        hidden: true,
        resource: { id: FREE_OFFERING, name: 'Подношение без жертвы', max: 1, recharge: 'shortOrLong', iconName: 'dripping-sword' },
      },
    ],
    8: [abilityScoreImprovement('alt-blood-hunter', 8)],
    9: [
      {
        id: 'alt-blood-hunter.improved-psychometry',
        name: 'Улучшенная психометрия',
        description: 'С инструментами алхимика вы творите «Знание легенд» о предмете или существе, которого касаетесь, или о месте, где вы находитесь — для зловещего, жестокого или проклятого прошлого; вместо ячейки — Жизненная жертва.',
        action: 'action',
        hpCost: vitalSacrifice,
        iconName: 'crystal-ball',
      },
      moreRites(9),
    ],
    10: [
      {
        id: 'alt-blood-hunter.dark-augmentation',
        name: 'Тёмное усиление',
        description: 'К проверкам и спасброскам Силы, Ловкости и Телосложения прибавляется кость обряда.',
        action: 'passive',
        iconName: 'muscle-up',
        effects: (ctx) => [
          {
            type: 'rollDice',
            on: ['check:strength', 'check:dexterity', 'check:constitution', 'save:strength', 'save:dexterity', 'save:constitution'],
            dice: riteDie(ctx),
          },
        ],
      },
    ],
    11: [
      {
        id: 'alt-blood-hunter.improved-crimson-offering',
        name: 'Улучшенное подношение',
        description: 'Багровое подношение может наносить некротический, психический урон или урон звуком.',
        action: 'passive',
        iconName: 'dripping-sword',
      },
      {
        id: 'alt-blood-hunter.vital-control',
        name: 'Власть над жизнью',
        description:
          'Совершая Жизненную жертву, вы бросаете кость обряда дважды и выбираете результат (лист берёт меньший). Раз в продолжительный отдых особенность, требующая жертвы, обходится без неё (одна из двух, если их нужно две) — отметьте здесь.',
        action: 'passive',
        resource: { id: 'alt-blood-hunter.vital-control', name: 'Власть над жизнью', max: 1, recharge: 'long' },
        usesResource: { id: 'alt-blood-hunter.vital-control' },
        iconName: 'heart-plus',
      },
    ],
    12: [abilityScoreImprovement('alt-blood-hunter', 12)],
    13: [moreRites(13)],
    14: [
      {
        id: 'alt-blood-hunter.crimson-anchor',
        name: 'Багровый якорь',
        description: 'Существо под вашим Багровым клеймом, пытаясь телепортироваться или переместиться магией, сначала совершает спасбросок Харизмы против СЛ обрядов: при провале попытка не удаётся, и оно получает 4 кости обряда некротического урона. Урон клейма — две кости обряда.',
        action: 'passive',
        damage: (ctx) => riteDie(ctx, 4),
        damageType: 'Некротический',
        saveAttribute: 'charisma',
        saveDC: riteDC,
        iconName: 'chained-heart',
      },
    ],
    15: [
      {
        id: 'alt-blood-hunter.hardened-soul',
        name: 'Закалённая душа',
        description: 'К спасброскам Интеллекта, Мудрости и Харизмы прибавляется кость обряда.',
        action: 'passive',
        iconName: 'cold-heart',
        effects: (ctx) => [{ type: 'rollDice', on: ['save:intelligence', 'save:wisdom', 'save:charisma'], dice: riteDie(ctx) }],
      },
    ],
    16: [abilityScoreImprovement('alt-blood-hunter', 16)],
    17: [moreRites(17)],
    19: [abilityScoreImprovement('alt-blood-hunter', 19)],
    20: [
      {
        id: 'alt-blood-hunter.sanguine-mastery',
        name: 'Кровавое мастерство',
        description: 'Бросая кость обряда для обряда или другой особенности, вы бросаете её дважды и выбираете результат. Жизненная жертва уменьшается на модификатор Телосложения (минимум 1), но не ниже 1 (лист учитывает это сам).',
        action: 'passive',
        iconName: 'heart-drop',
      },
    ],
  },
};

export const ALT_BLOOD_HUNTER_ICONS = {
  class: 'bleeding-heart',
  subclasses: {
    'order-of-alchemists': 'vial',
    'order-of-heretics': 'cultist',
    [PALE_MOON]: 'moon-claws',
    'order-of-salt-and-iron': 'salt-shaker',
    [UNDYING_THIRST]: 'vampire-dracula',
    'order-of-witch-knights': 'witch-face',
  } as Record<string, string>,
};
