import type { HitPointCost } from '@itd/schema';
import type { BuildContext, CatalogEntryDef, Effect, FeatureDef, SkillId, StanceDef } from '../../types';

/**
 * What laserllama's Alternate Blood Hunter (v2.2.0) is made of: the Rite Die, the Vital Sacrifice it
 * pays with, and the lists it picks from — Blood Rites, the Alchemists' Mutagens and its own fighting
 * styles. Descriptions are our own summaries of the rules.
 */

export const UNDYING_THIRST = 'order-of-undying-thirst';

/**
 * Sides of the Rite Die: d4 from level 2, d6 at 5, d8 at 11, d10 at 17; the Order of Undying Thirst
 * raises it to d6 at 3, d8 at 5, d10 at 11 and d12 at 17.
 */
export const riteSides = (ctx: BuildContext): number => {
  const step = ctx.classLevel >= 17 ? 3 : ctx.classLevel >= 11 ? 2 : ctx.classLevel >= 5 ? 1 : 0;
  const thirst = ctx.subclass === UNDYING_THIRST && ctx.classLevel >= 3 ? 1 : 0;
  return 4 + 2 * (step + thirst);
};

/** `count` Rite Dice: `1d6`, `4d8`. */
export const riteDie = (ctx: BuildContext, count = 1): string => `${count}d${riteSides(ctx)}`;

export const conAtLeastOne = (ctx: BuildContext): number => Math.max(1, ctx.modifier('constitution'));

/** Rite save DC: 8 + proficiency bonus + Constitution modifier. */
export const riteDC = (ctx: BuildContext): number => 8 + ctx.proficiencyBonus + ctx.modifier('constitution');

/**
 * A Vital Sacrifice: a Rite Die off both the current and the maximum hit points until a long rest.
 * Vital Control (level 11) rolls it twice and the lower is paid; Sanguine Mastery (20) takes the
 * Constitution modifier off it, down to 1.
 */
export const vitalSacrifice = (ctx: BuildContext): HitPointCost => ({
  dice: riteDie(ctx),
  lowersMax: true,
  ...(ctx.classLevel >= 11 ? { rollTwice: true } : {}),
  ...(ctx.classLevel >= 20 ? { minus: conAtLeastOne(ctx), min: 1 } : {}),
});

/** What a free use spent becomes: "once per rest, then a Vital Sacrifice for each use more". */
export const ONCE_THEN_SACRIFICE = 'Раз за короткий или продолжительный отдых бесплатно, затем — за Жизненную жертву.';

// ------------------------------------------------------------------------------------------------
// Blood Rites
// ------------------------------------------------------------------------------------------------

interface RiteSpec extends Omit<FeatureDef, 'amplify'> {
  /** What an empowered rite (one more Vital Sacrifice) does. */
  empowered?: string;
  /** Dice an empowered rite deals instead. */
  empoweredDamage?: FeatureDef['damage'];
  /** Class level it may be learnt from. */
  level?: number;
  /** Once per rest, and a Vital Sacrifice cannot buy another use (the rites of level 17). */
  capped?: boolean;
}

/** A Blood Rite: free once per rest, then paid with a Vital Sacrifice; empowered with one more. */
const bloodRite = ({ empowered, empoweredDamage, level, capped, ...rite }: RiteSpec): CatalogEntryDef => {
  const pool = `ll-rite.${rite.id}`;
  return {
    ...rite,
    description: [
      rite.description,
      empowered && `**Усиление (Жизненная жертва).** ${empowered}`,
      capped ? 'Раз за короткий или продолжительный отдых; жертвой это ограничение не обойти.' : ONCE_THEN_SACRIFICE,
    ]
      .filter(Boolean)
      .join('\n\n'),
    resource: { id: pool, name: rite.name, max: 1, recharge: 'shortOrLong' },
    usesResource: { id: pool },
    ...(capped ? {} : { hpCostWhenSpent: vitalSacrifice }),
    ...(empowered ? { amplify: { description: empowered, hpCost: vitalSacrifice, damage: empoweredDamage } } : {}),
    catalog: 'bloodRites',
    ...(level ? { prerequisite: { level } } : {}),
  };
};

/** The saving throw of a rite against the Rite DC. */
const save = (saveAttribute: NonNullable<FeatureDef['saveAttribute']>) => ({ saveAttribute, saveDC: riteDC });

export const BLOOD_RITES: CatalogEntryDef[] = [
  bloodRite({
    id: 'rite-of-agony',
    name: 'Обряд агонии',
    description:
      'Бонусным действием — существо, которое вы видите в пределах 30 футов, совершает спасбросок Телосложения. При провале до конца вашего следующего хода у него помеха на проверки и спасброски Силы и Ловкости, а за каждую свою атаку оно получает некротический урон, равный кости обряда.',
    empowered: 'Длится 1 минуту; цель повторяет спасбросок в конце каждого своего хода, оканчивая эффект при успехе.',
    action: 'bonus',
    damage: riteDie,
    damageType: 'Некротический',
    ...save('constitution'),
    iconName: 'bleeding-wound',
  }),
  bloodRite({
    id: 'rite-of-anxiety',
    name: 'Обряд тревоги',
    description: 'Бонусным действием вы проклинаете существо, которое видите в пределах 30 футов (без спасброска). 1 минуту каждый, кто совершает проверку, чтобы повлиять на него, прибавляет кость обряда.',
    empowered: 'Цель вычитает кость обряда из первого спасброска Интеллекта, Мудрости или Харизмы до конца вашего следующего хода.',
    action: 'bonus',
    damage: riteDie,
    iconName: 'terror',
  }),
  bloodRite({
    id: 'rite-of-binding',
    name: 'Обряд оков',
    description: 'Бонусным действием — существо размера Большое или меньше в пределах 30 футов совершает спасбросок Силы, иначе до конца вашего следующего хода его скорость 0 и оно не может совершать реакции.',
    empowered: 'Любого размера; длится 1 минуту с повторным спасброском в конце каждого хода цели.',
    action: 'bonus',
    ...save('strength'),
    iconName: 'manacles',
  }),
  bloodRite({
    id: 'rite-of-blindness',
    name: 'Обряд слепоты',
    description: 'Реакцией, когда существо в пределах 30 футов попадает атакой (вы видите и его, и цель), оно вычитает кость обряда из броска атаки — попадание может стать промахом.',
    empowered: 'Кость вычитается из всех его бросков атаки до конца его следующего хода.',
    action: 'reaction',
    damage: riteDie,
    iconName: 'bleeding-eye',
  }),
  bloodRite({
    id: 'rite-of-confusion',
    name: 'Обряд смятения',
    description: 'Бонусным действием — существо в пределах 30 футов, концентрирующееся на заклинании, совершает спасбросок Мудрости или теряет концентрацию.',
    empowered: 'Цель вычитает кость обряда из этого спасброска.',
    action: 'bonus',
    ...save('wisdom'),
    iconName: 'brain',
  }),
  {
    id: 'rite-of-knowledge',
    name: 'Обряд знания',
    description:
      'Изучив обряд, вы узнаёте четыре заклинания-ритуала из любых списков, круг которых не выше бонуса мастерства. Вы творите их только ритуалом, и каждый раз — за Жизненную жертву; заклинательная характеристика — Телосложение.',
    action: 'passive',
    iconName: 'evil-book',
    catalog: 'bloodRites',
    choices: [
      {
        id: 'rituals',
        label: 'Ритуалы (4)',
        count: 4,
        spellAbility: 'constitution',
        options: { from: 'spells', lists: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'], minLevel: 1, maxLevel: (ctx) => ctx.proficiencyBonus, ritual: true },
      },
    ],
  },
  bloodRite({
    id: 'rite-of-revelation',
    name: 'Обряд откровения',
    description: 'Используя Зловещую проницательность, вы можете призвать этот обряд, и проверка удаётся автоматически.',
    empowered: 'На 1 минуту один иммунитет существа к урону становится сопротивлением или одно сопротивление пропадает; если их нет, вы узнаёте три сведения о нём.',
    action: 'passive',
    iconName: 'all-seeing-eye',
  }),
  bloodRite({
    id: 'rite-of-siphoning',
    name: 'Обряд высасывания',
    description: 'Действием — существо, которого вы касаетесь, совершает спасбросок Харизмы: при провале 2 кости обряда некротического урона, при успехе половина. Вы получаете временные хиты, равные нанесённому урону.',
    empowered: 'Урон — максимально возможный, без броска.',
    empoweredDamage: (ctx) => String(2 * riteSides(ctx)),
    action: 'action',
    damage: (ctx) => riteDie(ctx, 2),
    damageType: 'Некротический',
    tempHPFromDamage: 1,
    ...save('charisma'),
    iconName: 'heart-drop',
  }),
  bloodRite({
    id: 'rite-of-the-beast',
    name: 'Обряд зверя',
    level: 5,
    description:
      'Действием вы мажете своей кровью живого зверя, которого касаетесь. Он совершает спасбросок Харизмы или порабощён на 1 час: дружелюбен, подчиняется вам, действует в ваш ход и совершает только Уклонение, пока вы бонусным действием не прикажете иное; если на нём можно ехать, он — обученный скакун.',
    empowered: 'Порабощён до конца вашего следующего продолжительного отдыха.',
    action: 'action',
    ...save('charisma'),
    iconName: 'wolf-head',
  }),
  bloodRite({
    id: 'rite-of-bonding',
    name: 'Обряд уз',
    level: 5,
    description:
      'Действием вы смешиваете кровь с согласным существом, которого касаетесь. 1 час, пока оно в пределах 60 футов, у него сопротивление всему урону, но вы получаете столько же урона, сколько оно. Узы рвутся, если один из вас опускается до 0 хитов или вы дальше 60 футов дольше минуты. Одни узы за раз.',
    empowered: 'Длится 8 часов; рвутся при 0 хитов или если вы дальше мили друг от друга дольше часа.',
    action: 'action',
    iconName: 'chained-heart',
  }),
  bloodRite({
    id: 'rite-of-corrosion',
    name: 'Обряд разложения',
    level: 5,
    description: 'Бонусным действием — существо в пределах 30 футов совершает спасбросок Телосложения: при провале получает урон ядом, равный кости обряда, и отравлено на 1 минуту, повторяя спасбросок в конце каждого своего хода.',
    empowered: 'Эффект длится до успешного спасброска, и каждый проваленный наносит 2 кости обряда урона ядом.',
    empoweredDamage: (ctx) => riteDie(ctx, 2),
    action: 'bonus',
    damage: riteDie,
    damageType: 'Яд',
    ...save('constitution'),
    iconName: 'poison-bottle',
  }),
  bloodRite({
    id: 'rite-of-exposure',
    name: 'Обряд обнажения',
    level: 5,
    description: 'Бонусным действием вы проклинаете существо в пределах 30 футов (без спасброска): до конца вашего следующего хода урон по нему игнорирует его сопротивления, а иммунитеты к урону считаются сопротивлениями.',
    empowered: 'На то же время игнорируются и его иммунитеты к состояниям, но спасброски от них он совершает с преимуществом.',
    action: 'bonus',
    iconName: 'scar-wound',
  }),
  bloodRite({
    id: 'rite-of-marking',
    name: 'Обряд метки',
    level: 5,
    description: 'Бонусным действием вы метите существо в пределах 30 футов: до конца вашего следующего хода ваши броски атаки по нему совершаются с преимуществом.',
    empowered: 'Вы также прибавляете кость обряда к броскам атаки оружием по нему.',
    action: 'bonus',
    damage: riteDie,
    iconName: 'eye-target',
  }),
  bloodRite({
    id: 'rite-of-the-puppet',
    name: 'Обряд марионетки',
    level: 5,
    description: 'Реакцией, когда существо, которое вы видите в пределах 30 футов, убито: труп поднимается, проходит до своей скорости и совершает одну атаку оружием по существу на ваш выбор.',
    empowered: 'К броску атаки и урону марионетки прибавляется кость обряда.',
    action: 'reaction',
    damage: riteDie,
    iconName: 'cultist',
  }),
  bloodRite({
    id: 'rite-of-aggression',
    name: 'Обряд ярости',
    level: 9,
    description:
      'Действием — согласное существо, которого вы касаетесь, до 1 минуты получает ещё одну атаку в действии «Атака» или мультиатаке, «Рывок» бонусным действием, +2 к КД и спасброскам Ловкости. Закончив ход, не нанеся урона, оно оканчивает обряд или получает некротический урон, равный кости обряда. Когда обряд кончается, оно совершает спасбросок Телосложения или получает степень истощения.',
    action: 'action',
    damage: riteDie,
    damageType: 'Некротический',
    ...save('constitution'),
    iconName: 'rally-the-troops',
  }),
  bloodRite({
    id: 'rite-of-dread',
    name: 'Обряд ужаса',
    level: 9,
    description:
      'Бонусным действием — существо в пределах 30 футов, которое видит или слышит вас, совершает спасбросок Мудрости или испугано вами на 1 минуту и бежит прочь безопасным путём (иначе Уклоняется). Закончив ход, не видя вас, оно повторяет спасбросок.',
    empowered: 'Пока видит вас, оно ещё и ошеломлено; получив урон, оно может повторить спасбросок.',
    action: 'bonus',
    ...save('wisdom'),
    iconName: 'dread-skull',
  }),
  bloodRite({
    id: 'rite-of-the-open-grave',
    name: 'Обряд разверстой могилы',
    level: 9,
    description:
      'Действием — существо, умершее не больше минуты назад, которого вы касаетесь, оживает с 1 хитом, но получает постоянный провал спасброска от смерти (снимается «Снятием проклятия» или сильнее). Не возвращает умерших от старости и утраченные части тела.',
    empowered: 'Без постоянного провала: вместо него степень истощения, которая проходит после продолжительного отдыха.',
    action: 'action',
    iconName: 'grim-reaper',
  }),
  bloodRite({
    id: 'rite-of-the-senseless',
    name: 'Обряд бесчувствия',
    level: 9,
    description: 'Бонусным действием — существо в пределах 30 футов совершает спасбросок Телосложения или на 1 минуту ослеплено, оглушено и не может говорить и издавать звуки; оно повторяет спасбросок в конце каждого своего хода.',
    empowered: 'Его скорость также 0, и оно не может совершать реакции.',
    action: 'bonus',
    ...save('constitution'),
    iconName: 'blindfold',
  }),
  bloodRite({
    id: 'rite-of-decay',
    name: 'Обряд тления',
    level: 13,
    description:
      'Действием — существо в пределах 30 футов совершает спасбросок Телосложения. При провале оно получает 4 кости обряда некротического урона, его скорость вдвое меньше, и оно не может совершать реакции. Действием оно может повторить спасбросок: успех оканчивает эффект, провал — 2 кости обряда некротического урона и степень истощения.',
    empowered: 'Игнорирует сопротивление некротическому урону, иммунитет считает сопротивлением; убитый обращается в прах.',
    action: 'action',
    damage: (ctx) => riteDie(ctx, 4),
    damageType: 'Некротический',
    ...save('constitution'),
    iconName: 'death-zone',
  }),
  bloodRite({
    id: 'rite-of-nightmares',
    name: 'Обряд кошмаров',
    level: 13,
    description: 'Действием — существо в пределах 30 футов совершает спасбросок Мудрости. При провале — 4 кости обряда психического урона и испуг на 1 минуту; в конце каждого своего хода оно повторяет спасбросок: успех оканчивает эффект, провал — ещё 2 кости обряда психического урона.',
    empowered: 'На это время оно ещё и недееспособно, а его скорость 0.',
    action: 'action',
    damage: (ctx) => riteDie(ctx, 4),
    damageType: 'Психический',
    ...save('wisdom'),
    iconName: 'screaming',
  }),
  bloodRite({
    id: 'rite-of-thralldom',
    name: 'Обряд рабства',
    level: 13,
    description:
      'Действием вы мажете кровью лицо живого гуманоида, которого касаетесь. Он совершает спасбросок Харизмы или порабощён до 1 минуты: дружелюбен, подчиняется вам, действует в ваш ход и только Уклоняется, пока вы бонусным действием не прикажете иное.',
    empowered: 'Порабощён до 1 часа.',
    action: 'action',
    ...save('charisma'),
    iconName: 'drama-masks',
  }),
  bloodRite({
    id: 'rite-of-exsanguination',
    name: 'Обряд обескровливания',
    level: 17,
    capped: true,
    description:
      'Действием — существо в пределах 30 футов совершает спасбросок Телосложения: при провале 12 костей обряда некротического урона, при успехе половина. Существа, которым вы нанесли урон с начала своего прошлого хода, совершают его с помехой.',
    empowered: 'Игнорирует сопротивление некротическому урону, иммунитет считает сопротивлением; убитый обращается в прах.',
    action: 'action',
    damage: (ctx) => riteDie(ctx, 12),
    damageType: 'Некротический',
    ...save('constitution'),
    iconName: 'pouring-chalice',
  }),
  bloodRite({
    id: 'rite-of-reaping',
    name: 'Обряд жатвы',
    level: 17,
    capped: true,
    description:
      'Действием — выбранные существа в пределах 60 футов совершают спасбросок Телосложения: при провале 5 костей обряда некротического урона, при успехе половина. Существа, которым вы нанесли урон с начала своего прошлого хода, совершают его с помехой.',
    empowered: 'Игнорирует сопротивление некротическому урону, иммунитет считает сопротивлением; убитые обращаются в прах.',
    action: 'action',
    damage: (ctx) => riteDie(ctx, 5),
    damageType: 'Некротический',
    ...save('constitution'),
    iconName: 'reaper-scythe',
  }),
  bloodRite({
    id: 'rite-of-rejuvenation',
    name: 'Обряд омоложения',
    level: 17,
    capped: true,
    description:
      'Действием — другое живое согласное существо, которого вы касаетесь, сразу получает все выгоды короткого отдыха, включая трату костей хитов. Его наибольший срок жизни навсегда сокращается на 1 год и 1 день, и оно получает степень истощения.',
    action: 'action',
    iconName: 'regeneration',
  }),
];

// ------------------------------------------------------------------------------------------------
// Mutagens of the Order of Alchemists
// ------------------------------------------------------------------------------------------------

/** A latent mutagen: turned on as part of a Mutate (no action of its own), it gives its effects meanwhile. */
const latent = (id: string, name: string, description: string, effects: StanceDef['effects'], iconName: string, level?: number): CatalogEntryDef => ({
  id,
  name,
  description: `${description}\n\nДействует, пока вы мутировали: включите его вместе с Мутацией (не больше мутагенов, чем модификатор Телосложения).`,
  action: 'passive',
  iconName,
  stance: { effects },
  catalog: 'latentMutagens',
  ...(level ? { prerequisite: { level } } : {}),
});

const PHYSICAL = ['Дробящий', 'Колющий', 'Рубящий'];

export const LATENT_MUTAGENS: CatalogEntryDef[] = [
  latent('aberrant-sight', 'Аберрантное зрение', 'Тёмное зрение 60 футов (или +60 футов к имеющемуся); в этом радиусе вы видите и сквозь магическую тьму.', [{ type: 'darkvision', range: 60, extend: true }], 'beast-eye'),
  latent('aquatic-adaptation', 'Водная адаптация', 'Скорость плавания, равная скорости ходьбы; вы дышите воздухом и водой. Если скорость плавания уже была, в воде можно совершать «Рывок» бонусным действием.', [{ type: 'movement', mode: 'swim' }], 'wave-crest'),
  latent('enhanced-movement', 'Усиленное движение', 'Передвигаясь пешком, вы можете в каждый свой ход совершать «Рывок» бонусным действием.', [], 'sprint'),
  latent(
    'grappling-appendage',
    'Хватательный отросток',
    'У вас вырастает щупальце с досягаемостью 10 футов для безоружных ударов, толчка и захвата; удар наносит дробящий урон, равный кости обряда. Оружие и щиты оно держать не может. С 13-го уровня отростков два.',
    (ctx) => [{ type: 'attack', attack: { id: 'll-grappling-appendage', name: 'Хватательный отросток', description: 'Досягаемость 10 футов.', damage: riteDie(ctx), damageType: 'Дробящий', abilities: ['strength'], iconName: 'tentacle-strike' } }],
    'tentacle-strike',
  ),
  latent('knotted-flesh', 'Узловатая плоть', 'В доспехах КД считается с модификатором Телосложения вместо Ловкости; без доспехов КД = 13 + модификатор Телосложения (впишите бонус КД на листе).', [], 'armor-upgrade'),
  latent('monstrous-glide', 'Чудовищное планирование', 'Падая с высоты от 10 футов, вы уменьшаете высоту для урона до 100 футов и смещаетесь на 2 фута по горизонтали за каждый фут падения.', [], 'wing-cloak'),
  latent('oozing-form', 'Слизистая форма', 'Бонусным действием вы входите в студенистое состояние или выходите из него: протискиваетесь сквозь щели в дюйм шириной, но не можете атаковать.', [], 'slime'),
  latent('unnatural-physicality', 'Противоестественная стать', 'К проверкам Силы, Телосложения и Ловкости (Акробатика) прибавляется кость обряда.', (ctx) => [{ type: 'rollDice', on: ['check:strength', 'check:constitution', 'skill:acrobatics'], dice: riteDie(ctx) }], 'muscle-up'),
  latent('acidic-bile', 'Едкая желчь', 'Вы знаете заговор «Брызги кислоты» (Телосложение) и прибавляете к его урону модификатор Телосложения (минимум +1).', (ctx) => [{ type: 'spell', spell: 'acid-splash', alwaysPrepared: true, ability: 'constitution' }, { type: 'spellDamage', spell: 'acid-splash', amount: conAtLeastOne(ctx) }], 'acid', 7),
  latent('corrosive-blood', 'Едкая кровь', 'Реакцией, когда существо в пределах 15 футов попадает по вам атакой, оно получает урон кислотой: кость обряда + модификатор Телосложения.', [], 'droplets', 7),
  latent('dislocated-reach', 'Вывернутые руки', 'Руки вдвое длиннее: досягаемость рукопашных атак +5 футов.', [], 'grab', 7),
  latent('engorged-physique', 'Раздутое тело', 'Вы на размер больше (если хватает места): досягаемость +5 футов, вес ×8, рукопашные атаки оружием наносят дополнительно кость обряда урона.', (ctx) => [{ type: 'damageBonus', dice: riteDie(ctx), damageType: '', melee: true, weapon: true }], 'giant', 7),
  latent('inoculated-vigor', 'Привитая стойкость', 'Иммунитет к урону кислотой и ядом, к болезням и состоянию «отравлен».', [{ type: 'resistance', damageType: 'Кислота', level: 'immunity' }, { type: 'resistance', damageType: 'Яд', level: 'immunity' }], 'dna1', 7),
  latent('toxic-symbiosis', 'Ядовитый симбиоз', 'Попав рукопашной атакой по существу, кроме конструкта и нежити, вы можете бонусным действием получить временные хиты, равные модификатору Телосложения (минимум 1).', [], 'poison-gas', 7),
  latent('viscous-grip', 'Липкая хватка', 'Скорость лазания, равная скорости ходьбы, без проверок на сложных поверхностях; вырваться из вашего захвата — с помехой.', [{ type: 'movement', mode: 'climb' }], 'gecko', 7),
  latent('accelerated-physiology', 'Ускоренная физиология', 'Действием «Атака» вы совершаете на одну атаку больше. Закончив ход, не атаковав существо с конца прошлого хода, вы получаете некротический урон, равный кости обряда.', [{ type: 'extraAttack', attacks: 3 }], 'fire-dash', 13),
  latent('alchemical-intellect', 'Алхимический разум', 'Преимущество на спасброски Интеллекта, Мудрости и Харизмы; помеха на спасброски Силы, Ловкости и Телосложения.', [{ type: 'advantage', on: ['save:intelligence', 'save:wisdom', 'save:charisma'] }, { type: 'disadvantage', on: ['save:strength', 'save:dexterity', 'save:constitution'] }], 'brain-tentacle', 13),
  latent('hideous-regeneration', 'Отвратительная регенерация', 'Начиная ход с хитами меньше половины максимума (но не меньше 1), вы восстанавливаете хиты, равные модификатору Телосложения (минимум 1).', [], 'regeneration', 13),
  latent('monstrous-flight', 'Чудовищный полёт', 'Скорость полёта, равная скорости ходьбы.', [{ type: 'movement', mode: 'fly' }], 'bat', 13),
  latent('synthetic-carapace', 'Искусственный панцирь', '+2 к КД; сопротивление дробящему, колющему и рубящему урону от немагических атак не серебряным оружием.', [{ type: 'armorClass', amount: 2 }, ...PHYSICAL.map((damageType): Effect => ({ type: 'resistance', damageType }))], 'scarab-beetle', 13),
];

// ------------------------------------------------------------------------------------------------
// Fighting styles
// ------------------------------------------------------------------------------------------------

const style = (
  id: string,
  name: string,
  description: string,
  prerequisite: { attributes?: { list: ('strength' | 'dexterity')[]; min: number; all?: boolean }; skill?: SkillId; text?: string },
  effects: Effect[] = [],
): CatalogEntryDef => ({ id, name, description, effects, catalog: 'bloodHunterStyles', prerequisite, iconName: 'crossed-swords' });

export const BLOOD_HUNTER_STYLES: CatalogEntryDef[] = [
  style('archery', 'Стрельба', '+1 к броскам атаки дальнобойным оружием; такие атаки игнорируют укрытие на половину, а укрытие на три четверти считают укрытием на половину.', { attributes: { list: ['dexterity'], min: 13 } }, [{ type: 'attackBonus', kind: 'ranged', amount: 1 }]),
  style('balanced-fighting', 'Уравновешенный бой', 'С рукопашным оружием в одной руке и без другого оружия (щит можно) +2 к урону этим оружием.', {}, [{ type: 'weaponStyle', style: 'dueling' }]),
  style('dual-wielding', 'Бой двумя оружиями', 'Атаку второй рукой можно совершить частью действия «Атака» вместо бонусного действия (тогда без атаки бонусным действием в этот ход); к её урону прибавляется модификатор характеристики.', { attributes: { list: ['strength', 'dexterity'], min: 13 } }, [{ type: 'weaponStyle', style: 'twoWeapon' }]),
  style('featherweight-fighting', 'Лёгкий бой', 'Безоружным или только с лёгким оружием: скорость +10 футов и +1 к урону лёгким оружием и безоружными ударами. Не действует в средних и тяжёлых доспехах и со щитом.', { attributes: { list: ['dexterity'], min: 13 }, skill: 'acrobatics' }),
  style('great-weapon-fighting', 'Бой тяжёлым оружием', 'Нанося урон атакой тяжёлым рукопашным оружием, кость урона оружия ниже среднего считается средней: к4 — 2, к6 — 3, к8 — 4, к10 — 5, к12 — 6.', { attributes: { list: ['strength'], min: 13 } }),
  style('hurler', 'Метатель', 'Вы достаёте метательное оружие частью дальнобойной атаки им, а его дистанция удваивается. Держа только метательное оружие, вы можете бонусным действием раз в ход совершить им дальнобойную атаку.', { attributes: { list: ['strength', 'dexterity'], min: 11 } }),
  style('melee-marksman', 'Стрелок ближнего боя', 'Враг в пределах 5 футов не даёт помехи на ваши дальнобойные атаки по цели в пределах 5 футов; атакованное так существо до конца хода не может совершать по вам атаки по возможности.', { attributes: { list: ['dexterity'], min: 13 } }),
  style('polearm-fighting', 'Бой древковым оружием', '+1 к урону глефой, алебардой, пикой, боевым посохом или копьём, если вы держите только его и без щита; тогда существа провоцируют атаку по возможности, входя в вашу досягаемость или двигаясь в ней.', { attributes: { list: ['strength', 'dexterity'], min: 11, all: true } }),
  style('versatile-fighting', 'Универсальный бой', 'С одним универсальным оружием и без щита +1 к броскам атаки им; бонусным действием можно совершить захват, толчок или «Использование предмета».', { attributes: { list: ['strength', 'dexterity'], min: 11 } }),
];
