import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { SORCERY_POINTS } from '../metamagic';
import { FULL_CASTER_SLOTS, abilityScoreImprovement, byTable, epicBoon, subclassHeading } from './shared';

/** Чародей of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('charisma');

/** A once-per-long-rest feature whose use comes back for Sorcery Points (Dragon Wings, Trance of Order…). */
const restorable = (feature: Omit<FeatureDef, 'resource'> & { points: number }): FeatureDef => {
  const { points, ...rest } = feature;
  return {
    ...rest,
    description: `${rest.description}\n\nРаз в продолжительный отдых; использование можно вернуть, потратив ${points} очков чародейства (без действия).`,
    resource: { id: rest.id, name: rest.name, max: 1, recharge: 'long' },
  };
};

/** More Metamagic options on levels 10 and 17: the same pool, so nothing is offered twice. */
const moreMetamagic = (level: number): FeatureDef => ({
  id: `sorcerer.metamagic-${level}`,
  name: 'Метамагия',
  description: 'Вы получаете ещё два варианта Метамагии.',
  hidden: true,
  choices: [{ id: 'metamagic', label: 'Метамагия (2)', count: 2, pool: 'metamagic', options: { from: 'catalog', catalog: 'metamagic' } }],
});

// ------------------------------------------------------------------------------------------------
// Sorcerous origins
// ------------------------------------------------------------------------------------------------

const aberrant: SubclassDef = {
  id: 'aberrant-sorcery',
  name: 'Аберрантное чародейство',
  description: 'Чуждое влияние наделило ваш разум псионикой: телепатия, психические заклинания и плоть, меняющаяся по воле.',
  alwaysPrepared: {
    3: ['arms-of-hadar', 'calm-emotions', 'detect-thoughts', 'dissonant-whispers', 'mind-sliver'],
    5: ['hunger-of-hadar', 'sending'],
    7: ['evards-black-tentacles', 'summon-aberration'],
    9: ['rarys-telepathic-bond', 'telekinesis'],
  },
  levels: {
    3: [
      {
        id: 'aberrant.psionic-spells',
        name: 'Псионические заклинания',
        description:
          'Заклинания подкласса всегда подготовлены и не входят в число подготовленных: с 3-го уровня — «Диссонирующий шёпот», «Обнаружение мыслей», «Расщепление разума», «Руки Хадара», «Умиротворение»; с 5-го — «Голод Хадара», «Послание»; с 7-го — «Вызов аберрации», «Чёрные щупальца Эварда»; с 9-го — «Ментальная связь Рэри», «Телекинез».',
        iconName: 'brain-tentacle',
      },
      {
        id: 'aberrant.telepathic-speech',
        name: 'Телепатическая речь',
        description:
          'Бонусным действием вы связываетесь с существом, которое видите в пределах 30 футов: вы можете общаться телепатически, пока между вами не больше (модификатор Харизмы, минимум 1) миль. Нужен общий язык. Связь длится (уровень чародея) минут или пока вы не свяжетесь с другим существом.',
        action: 'bonus',
        iconName: 'psychic-waves',
      },
    ],
    6: [
      {
        id: 'aberrant.psionic-sorcery',
        name: 'Псионическое чародейство',
        description:
          'Псионическое заклинание 1-го круга и выше можно сотворить, потратив вместо ячейки очки чародейства, равные кругу заклинания. Так оно не требует вербального и соматического компонентов, а также материальных, если они не расходуются и не имеют цены.',
        action: 'passive',
        iconName: 'brain',
      },
      {
        id: 'aberrant.psychic-defenses',
        name: 'Психическая защита',
        description: 'Вы получаете сопротивление психическому урону и совершаете с преимуществом спасброски, чтобы избежать или прекратить состояния «Очарованный» и «Испуганный».',
        effects: [{ type: 'resistance', damageType: 'Психический' }],
        iconName: 'magic-shield',
      },
    ],
    14: [
      {
        id: 'aberrant.revelation-in-flesh',
        name: 'Откровение во плоти',
        description:
          'Бонусным действием вы тратите 1 или больше очков чародейства и на 10 минут меняете тело; за каждое очко выберите одно:\n\n- **Водная адаптация:** скорость плавания вдвое больше скорости, дыхание под водой.\n- **Блестящий полёт:** скорость полёта равна скорости, можно парить.\n- **Видеть невидимое:** вы видите невидимых существ в пределах 60 футов, кроме тех, что за полным укрытием.\n- **Червеобразное перемещение:** вы протискиваетесь в щель шириной 1 дюйм и тратите 5 футов перемещения, чтобы освободиться от немагических пут или захвата.',
        action: 'bonus',
        usesResource: { id: SORCERY_POINTS, cost: 1, max: 4 },
        iconName: 'tentacle-strike',
      },
    ],
    18: [
      restorable({
        id: 'aberrant.warping-implosion',
        name: 'Искажающий взрыв',
        description:
          'Действием «Магия» вы телепортируетесь в видимое незанятое пространство в пределах 120 футов. Каждое существо в пределах 30 футов от места, где вы были, совершает спасбросок Силы: при провале получает 3к10 урона силовым полем и притягивается к этому месту, при успехе — половину урона.',
        action: 'action',
        damage: '3d10',
        damageType: 'Силовой',
        saveAttribute: 'strength',
        saveDC: spellDC,
        iconName: 'vortex',
        color: '#8e6cc9',
        points: 5,
      }),
    ],
  },
};

const ELEMENTS: { id: string; name: string; damageType: string }[] = [
  { id: 'acid', name: 'Кислота', damageType: 'Кислота' },
  { id: 'cold', name: 'Холод', damageType: 'Холод' },
  { id: 'fire', name: 'Огонь', damageType: 'Огонь' },
  { id: 'lightning', name: 'Электричество', damageType: 'Электричество' },
  { id: 'poison', name: 'Яд', damageType: 'Яд' },
];

const draconic: SubclassDef = {
  id: 'draconic-sorcery',
  name: 'Драконье чародейство',
  description: 'Магия дракона в вашей крови: чешуя вместо доспеха, родство со стихией и, со временем, крылья.',
  alwaysPrepared: {
    3: ['alter-self', 'chromatic-orb', 'command', 'dragons-breath'],
    5: ['fear', 'fly'],
    7: ['arcane-eye', 'charm-monster'],
    9: ['legend-lore', 'summon-dragon'],
  },
  levels: {
    3: [
      {
        id: 'draconic.draconic-spells',
        name: 'Драконьи заклинания',
        description:
          'Заклинания подкласса всегда подготовлены и не входят в число подготовленных: с 3-го уровня — «Дыхание дракона», «Приказ», «Смена обличья», «Хроматический шар»; с 5-го — «Полёт», «Ужас»; с 7-го — «Магический глаз», «Очарование монстра»; с 9-го — «Вызов дракона», «Знание легенд».',
        iconName: 'dragon-head',
      },
      {
        id: 'draconic.draconic-resilience',
        name: 'Драконья устойчивость',
        description:
          'Максимум хитов увеличивается на 3 и ещё на 1 с каждым следующим уровнем чародея. Без доспехов ваш базовый КД равен 10 + модификатор Ловкости + модификатор Харизмы (щит прибавляется).',
        effects: [
          { type: 'hpPerLevel', amount: 1 },
          { type: 'unarmoredDefense', attribute: 'charisma' },
        ],
        iconName: 'scales',
      },
    ],
    6: [
      {
        id: 'draconic.elemental-affinity',
        name: 'Родство со стихией',
        description:
          'Вы выбираете тип урона драконов: кислота, огонь, холод, электричество или яд. Вы получаете сопротивление ему, а сотворяя заклинание, наносящее урон этого типа, можете добавить модификатор Харизмы к одному броску урона.',
        iconName: 'dragon-breath',
        choices: [
          {
            id: 'element',
            label: 'Стихия',
            count: 1,
            options: {
              from: 'options',
              options: ELEMENTS.map((e) => ({
                id: e.id,
                name: e.name,
                description: `Сопротивление: ${e.name.toLowerCase()}; +модификатор Харизмы к одному броску урона заклинаний этого типа.`,
                effects: [
                  { type: 'resistance' as const, damageType: e.damageType },
                  { type: 'spellDamage' as const, list: 'sorcerer' as const, damageType: e.damageType, amount: (ctx: BuildContext) => ctx.modifier('charisma') },
                ],
              })),
            },
          },
        ],
      },
    ],
    14: [
      restorable({
        id: 'draconic.dragon-wings',
        name: 'Крылья дракона',
        description: 'Бонусным действием у вас вырастают драконьи крылья на 1 час (или пока вы их не уберёте, без действия): скорость полёта 60 футов.',
        action: 'bonus',
        stance: { effects: [{ type: 'movement', mode: 'fly', feet: 60 }] },
        iconName: 'angel-wings',
        points: 3,
      }),
    ],
    18: [
      {
        id: 'draconic.dragon-companion',
        name: 'Дракон-спутник',
        description:
          '«Вызов дракона» не требует от вас материального компонента. Раз в продолжительный отдых вы творите его без ячейки. Сотворяя его, вы можете отказаться от концентрации — тогда заклинание длится 1 минуту.',
        action: 'passive',
        resource: { id: 'draconic.dragon-companion', name: 'Дракон без ячейки', max: 1, recharge: 'long' },
        iconName: 'dragon-spiral',
      },
    ],
  },
};

const clockwork: SubclassDef = {
  id: 'clockwork-sorcery',
  name: 'Заводное чародейство',
  description: 'Сила Механуса, плана абсолютного порядка: вы гасите случайность, ставите щиты закона и призываете духов-модронов.',
  alwaysPrepared: {
    3: ['aid', 'alarm', 'lesser-restoration', 'protection-from-evil-and-good'],
    5: ['dispel-magic', 'protection-from-energy'],
    7: ['freedom-of-movement', 'summon-construct'],
    9: ['greater-restoration', 'wall-of-force'],
  },
  levels: {
    3: [
      {
        id: 'clockwork.clockwork-spells',
        name: 'Заводные заклинания',
        description:
          'Заклинания подкласса всегда подготовлены и не входят в число подготовленных: с 3-го уровня — «Защита от зла и добра», «Малое восстановление», «Подмога», «Сигнал тревоги»; с 5-го — «Защита от энергии», «Рассеивание магии»; с 7-го — «Вызов конструкта», «Свобода перемещения»; с 9-го — «Высшее восстановление», «Силовая стена». Ваша магия проявляется знаками порядка: шестерёнками, тиканьем, медным блеском кожи.',
        iconName: 'cog',
      },
      {
        id: 'clockwork.restore-balance',
        name: 'Восстановление баланса',
        description:
          'Реакцией, когда видимое вами существо в пределах 60 футов собирается совершить бросок к20 с преимуществом или помехой, вы отменяете их для этого броска. Использований — модификатор Харизмы (минимум 1) за продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'clockwork.restore-balance', name: 'Восстановление баланса', max: modifierOf('charisma'), recharge: 'long' },
        iconName: 'yin-yang',
      },
    ],
    6: [
      {
        id: 'clockwork.bastion-of-law',
        name: 'Бастион закона',
        description:
          'Действием «Магия» вы тратите от 1 до 5 очков чародейства и окружаете себя или видимое существо в пределах 30 футов защитой из стольких же к8. Получая урон, существо может бросить любое число этих костей и уменьшить урон на сумму. Защита держится до вашего продолжительного отдыха или до нового использования умения.',
        action: 'action',
        usesResource: { id: SORCERY_POINTS, cost: 1, max: 5, perPoint: '1d8' },
        iconName: 'energy-shield',
      },
    ],
    14: [
      restorable({
        id: 'clockwork.trance-of-order',
        name: 'Транс упорядоченности',
        description: 'Бонусным действием вы на 1 минуту входите в транс: атаки по вам не получают преимущества, а в своих тестах к20 вы считаете результат «9» и ниже на кости равным «10».',
        action: 'bonus',
        iconName: 'gears',
        points: 5,
      }),
    ],
    18: [
      restorable({
        id: 'clockwork.clockwork-cavalcade',
        name: 'Заводная кавалькада',
        description:
          'Действием «Магия» вы призываете неуязвимых духов порядка в 30-футовом кубе от себя. Они восстанавливают до 100 хитов, распределённых между существами в кубе по вашему выбору; оканчивают заклинания 6-го круга и ниже на выбранных существах и предметах в кубе; полностью чинят повреждённые предметы, целиком находящиеся в кубе. Затем духи исчезают.',
        action: 'action',
        iconName: 'robot-golem',
        points: 7,
      }),
    ],
  },
};

const wildMagic: SubclassDef = {
  id: 'wild-magic-sorcery',
  name: 'Чародейство дикой магии',
  description: 'Магия хаоса, что лежит в основе мироздания: непредсказуемые всплески и умение играть удачей.',
  levels: {
    3: [
      {
        id: 'wild-magic.wild-magic-surge',
        name: 'Всплеск дикой магии',
        description: [
          'Раз в ход, сразу после сотворения заклинания чародея с ячейкой, вы можете бросить к20; при «20» бросьте к100 по таблице всплесков. Если всплеск — заклинание, к нему нельзя применить Метамагию. Кратко (к100):',
          '- **01–04** — минуту бросайте по таблице в начале каждого хода (игнорируя 01–04);',
          '- **05–08** — рядом на 1 минуту появляется дружелюбное существо (к4: дуодрон, фламф, монодрон, единорог);',
          '- **09–12** — минуту восстанавливаете 5 хитов в начале хода;',
          '- **13–16** — спасброски от вашего следующего заклинания в течение минуты с помехой;',
          '- **17–20** — безобидный причудливый эффект на минуту (к8: музыка, рост на категорию, перьевая борода, крик, бабочки, третий глаз с преимуществом на Восприятие, пузыри, синяя кожа на 24 часа);',
          '- **21–24** — минуту заклинания со временем «действие» творятся бонусным действием;',
          '- **25–28** — вы на Астральном плане до конца следующего хода;',
          '- **29–32** — следующее заклинание урона за минуту наносит максимальный урон;',
          '- **33–36** — минуту сопротивление всему урону;',
          '- **37–40** — до начала следующего хода вы растение в горшке (недееспособны, уязвимы ко всему урону);',
          '- **41–44** — минуту бонусным действием телепорт на 20 футов;',
          '- **45–48** — вы и до трёх существ в 30 футах невидимы минуту (до атаки или заклинания);',
          '- **49–52** — минуту +2 к КД и иммунитет к «Волшебной стреле»;',
          '- **53–56** — одно дополнительное действие в этот ход;',
          '- **57–60** — случайное заклинание без концентрации (к10: смятение, огненный шар, туманное облако, полёт, смазывание, левитация, волшебная стрела 5-го круга, отражения, превращение себя в козла, видение невидимого);',
          '- **61–64** — минуту немагические горючие предметы от вашего касания загораются (1к4 огнём);',
          '- **65–68** — умерев в течение часа, вы возвращаетесь как от «Реинкарнации»;',
          '- **69–72** — вы испуганы до конца следующего хода;',
          '- **73–76** — телепорт в видимое пространство в пределах 60 футов;',
          '- **77–80** — случайное существо в 60 футах отравлено на 1к4 часа;',
          '- **81–84** — минуту яркий свет на 30 футов, закончившие ход в 5 футах от вас ослеплены;',
          '- **85–88** — до трёх существ в 30 футах получают 1к10 некротического урона, вы лечитесь на сумму;',
          '- **89–92** — до трёх существ в 30 футах получают 4к10 урона электричеством;',
          '- **93–96** — вы и все в 30 футах уязвимы к колющему урону минуту;',
          '- **97–00** — к6: вы или союзник лечитесь на 2к10, вы или союзник восстанавливаете низшую потраченную ячейку, вы восстанавливаете все очки чародейства, или на вас разом действуют все эффекты 17–20.',
        ].join('\n'),
        iconName: 'dice-fire',
      },
      {
        id: 'wild-magic.tides-of-chaos',
        name: 'Волны хаоса',
        description:
          'Перед тестом к20 вы можете дать себе преимущество. Использование возвращается после продолжительного отдыха или когда вы творите заклинание чародея с ячейкой — тогда вы автоматически бросаете по таблице всплесков дикой магии.',
        action: 'passive',
        resource: { id: 'wild-magic.tides-of-chaos', name: 'Волны хаоса', max: 1, recharge: 'long' },
        iconName: 'perspective-dice-six-faces-random',
      },
    ],
    6: [
      {
        id: 'wild-magic.bend-luck',
        name: 'Искривление удачи',
        description: 'Реакцией сразу после того, как другое видимое вами существо бросило к20 для теста к20, вы тратите 1 очко чародейства, бросаете 1к4 и прибавляете или вычитаете результат.',
        action: 'reaction',
        usesResource: { id: SORCERY_POINTS, cost: 1 },
        iconName: 'cursed-star',
      },
    ],
    14: [
      {
        id: 'wild-magic.controlled-chaos',
        name: 'Контролируемый хаос',
        description: 'Бросая по таблице всплесков дикой магии, вы бросаете дважды и выбираете любой из результатов.',
        iconName: 'rolling-dices',
      },
    ],
    18: [
      {
        id: 'wild-magic.tamed-surge',
        name: 'Укрощённый всплеск дикой магии',
        description:
          'Сразу после сотворения заклинания чародея с ячейкой вы можете вместо броска выбрать эффект таблицы всплесков (любой, кроме последней строки; если эффект требует броска — бросьте). Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'wild-magic.tamed-surge', name: 'Укрощённый всплеск', max: 1, recharge: 'long' },
        iconName: 'star-swirl',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Sorcerous origins of the supplement books
// ------------------------------------------------------------------------------------------------

const spellfire: SubclassDef = {
  id: 'spellfire-sorcery',
  name: 'Чародейство чаропламени',
  description: 'Ваша сила течёт прямо из Плетения: всплески сырой магии лечат союзников, жгут врагов и поглощают чужие заклинания.',
  source: 'Forgotten Realms: Heroes of Faerûn',
  alwaysPrepared: {
    3: ['cure-wounds', 'guiding-bolt', 'lesser-restoration', 'scorching-ray'],
    5: ['aura-of-vitality', 'dispel-magic'],
    7: ['fire-shield', 'wall-of-fire'],
    9: ['flame-strike', 'greater-restoration'],
  },
  levels: {
    3: [
      {
        id: 'spellfire.spellfire-spells',
        name: 'Заклинания чаропламени',
        description:
          'Заклинания подкласса всегда подготовлены и не входят в число подготовленных: с 3-го уровня — «Лечение ран», «Малое восстановление», «Направляющий снаряд», «Палящий луч»; с 5-го — «Аура живучести», «Рассеивание магии»; с 7-го — «Огненная стена», «Огненный щит»; с 9-го — «Высшее восстановление», «Небесный огонь».',
        iconName: 'fire',
      },
      {
        id: 'spellfire.spellfire-burst',
        name: 'Прорыв чаропламени',
        description:
          'Раз в ход, потратив хотя бы 1 очко чародейства при действии «Магия» или бонусном действии, вы можете вызвать один эффект:\n\n- **Поддерживающие огни.** Вы или видимое существо в пределах 30 футов получаете временные хиты: 1к4 + модификатор Харизмы (с 14-го уровня ещё + уровень чародея).\n- **Сияющее пламя.** Видимое существо в пределах 30 футов получает 1к4 урона огнём или излучением на ваш выбор (1к8 с 14-го уровня).',
        action: 'passive',
        damage: (ctx) => (ctx.classLevel >= 14 ? '1d8' : '1d4'),
        damageType: 'Огонь',
        iconName: 'fire-zone',
        color: '#e8a33d',
      },
    ],
    6: [
      {
        id: 'spellfire.absorb-spells',
        name: 'Поглощение заклинаний',
        description: '«Контрзаклинание» у вас всегда подготовлено. Каждый раз, когда цель проваливает спасбросок от вашего «Контрзаклинания», вы восстанавливаете 1к4 очков чародейства.',
        action: 'passive',
        damage: '1d4',
        effects: [{ type: 'spell', spell: 'counterspell', alwaysPrepared: true }],
        iconName: 'bolt-shield',
      },
    ],
    14: [
      {
        id: 'spellfire.honed-spellfire',
        name: 'Освоенное чаропламя',
        description: 'Урон Сияющего пламени Прорыва чаропламени растёт до 1к8, а к временным хитам Поддерживающих огней добавляется уровень чародея.',
        iconName: 'sunbeams',
      },
    ],
    18: [
      restorable({
        id: 'spellfire.crown-of-spellfire',
        name: 'Корона чаропламени',
        description:
          'Активируя Врождённое чародейство, вы можете наполнить себя чаропламенем и на время его действия получить:\n\n- **Горящая жизнь.** Раз в ход, когда по вам попадают атакой, вы тратите кости хитов — не больше модификатора Харизмы (минимум 1), бросаете их и уменьшаете урон на сумму.\n- **Полёт.** Скорость полёта 60 футов, вы можете парить.\n- **Избежание заклятий.** Если заклинание или магический эффект позволяют спасброском получить половину урона, при успехе вы не получаете урона, а при провале — половину. Не работает, пока вы недееспособны.',
        action: 'passive',
        iconName: 'laurel-crown',
        color: '#e8a33d',
        points: 5,
      }),
    ],
  },
};

const shadow: SubclassDef = {
  id: 'shadow-sorcery',
  name: 'Теневое чародейство',
  description: 'Магия Царства Теней в вашей сути: вы видите во тьме, отказываетесь умирать и шагаете из тени в тень.',
  source: 'Ravenloft: The Horrors Within',
  alwaysPrepared: {
    3: ['bane', 'darkness', 'inflict-wounds', 'pass-without-trace'],
    5: ['hunger-of-hadar', 'nondetection'],
    7: ['greater-invisibility', 'phantasmal-killer'],
    9: ['contagion', 'creation'],
  },
  levels: {
    3: [
      {
        id: 'shadow.shadow-spells',
        name: 'Заклинания теней',
        description:
          'Заклинания подкласса всегда подготовлены и не входят в число подготовленных: с 3-го уровня — «Бесследное передвижение», «Нанесение ран», «Порча», «Тьма»; с 5-го — «Голод Хадара», «Необнаружимость»; с 7-го — «Воображаемый убийца», «Высшая невидимость»; с 9-го — «Заражение», «Сотворение».',
        iconName: 'evil-book',
      },
      {
        id: 'shadow.strength-of-shadow',
        name: 'Сила тени',
        description:
          '**Глаза тьмы.** Тёмное зрение на 120 футов и слепое зрение на 10 футов. Вы видите сквозь Темноту, созданную вашими заклинаниями.\n\n**Сила могилы.** Если ваши хиты опускаются до 0, но вы не убиты мгновенно, вы можете совершить спасбросок Харизмы (СЛ 5 + полученный урон). При успехе хиты становятся равны модификатору Харизмы + уровень чародея. После успеха умение недоступно до продолжительного отдыха.',
        action: 'passive',
        effects: [{ type: 'darkvision', range: 120 }],
        resource: { id: 'shadow.strength-of-the-grave', name: 'Сила могилы', max: 1, recharge: 'long', iconName: 'death-skull' },
        iconName: 'evil-eyes',
      },
    ],
    6: [
      {
        id: 'shadow.hound-of-ill-omen',
        name: 'Звери дурных знамений',
        description:
          'Бонусным действием вы тратите 3 очка чародейства и творите «Вызов зверя» без ячейки, материальных компонентов и подготовки. Зверь соткан из теней; враги в пределах 5 футов от него совершают спасброски от ваших заклинаний с помехой. Сотворяя так заклинание, можно отказаться от концентрации — тогда оно длится 1 минуту и кончается, если вы сотворите его снова.',
        action: 'bonus',
        usesResource: { id: SORCERY_POINTS, cost: 3 },
        iconName: 'wolf-head',
      },
    ],
    14: [
      {
        id: 'shadow.shadow-walk',
        name: 'Хождение по теням',
        description: 'Находясь в тусклом свете или темноте, вы можете бонусным действием телепортироваться в видимое незанятое пространство в пределах 120 футов, тоже находящееся в тусклом свете или темноте.',
        action: 'bonus',
        iconName: 'magic-portal',
      },
    ],
    18: [
      restorable({
        id: 'shadow.umbral-form',
        name: 'Форма абсолютной тени',
        description:
          'Активируя Врождённое чародейство, вы можете принять сумрачный облик на время его действия (или пока не прекратите его без действия):\n\n- **Теневая устойчивость.** Сопротивление всему урону, кроме силового и излучения.\n- **Бестелесное перемещение.** Вы проходите сквозь существ и предметы как по труднопроходимой местности; закончив ход внутри них, получаете 1к10 силового урона.',
        action: 'passive',
        iconName: 'shadow-grasp',
        points: 6,
      }),
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

export const SORCERER_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [{ ref: 'spear' }, { ref: 'dagger', quantity: 2 }, { ref: 'arcane-focus' }, { ref: 'dungeoneers-pack' }],
    gold: 28,
  },
  { id: 'b', label: 'B', items: [], gold: 50 },
];

export const SORCERER: ClassDef = {
  id: 'sorcerer',
  name: 'Чародей',
  description: 'Маг, чья сила врождённая: очки чародейства превращаются в ячейки, а Метамагия перекраивает заклинания на лету.',
  hitDie: 6,
  primary: ['charisma'],
  saves: ['constitution', 'charisma'],
  skillChoices: { count: 2, list: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  proficiencies: [{ type: 'proficiency', category: 'weapon', value: 'Простое оружие' }],
  subclassLevel: 3,
  subclasses: [aberrant, clockwork, draconic, wildMagic, spellfire, shadow],
  startingEquipment: SORCERER_KITS,
  spellcasting: {
    ability: 'charisma',
    list: 'sorcerer',
    slots: FULL_CASTER_SLOTS,
    mode: 'known',
    prepared: byTable([2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]),
    cantrips: byClassLevel({ 1: 4, 4: 5, 10: 6 }),
  },
  replaceable: [{ pool: 'metamagic', label: 'Замена метамагии' }],
  levels: {
    1: [
      {
        id: 'sorcerer.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания чародея Харизмой (СЛ = 8 + бонус мастерства + модификатор Харизмы; бонус атаки = бонус мастерства + модификатор Харизмы); фокусировка — магическая. Заговоров 4 (5 с 4-го уровня, 6 с 10-го); число подготовленных заклинаний растёт по таблице класса. С каждым уровнем чародея можно заменить один заговор и одно подготовленное заклинание.',
        action: 'passive',
        iconName: 'bolt-spell-cast',
      },
      {
        id: 'sorcerer.innate-sorcery',
        name: 'Врождённое чародейство',
        description: 'Бонусным действием вы на 1 минуту высвобождаете врождённую магию: СЛ спасбросков ваших заклинаний чародея +1, а броски атаки ими совершаются с преимуществом. Дважды за продолжительный отдых.',
        action: 'bonus',
        resource: { id: 'sorcerer.innate-sorcery', name: 'Врождённое чародейство', max: 2, recharge: 'long', iconName: 'glowing-hands' },
        stance: { effects: [{ type: 'spellSaveDC', amount: 1 }, { type: 'advantage', on: ['attack:spell'] }] },
        iconName: 'glowing-hands',
        color: '#b36ad9',
      },
    ],
    2: [
      {
        id: 'sorcerer.font-of-magic',
        name: 'Источник магии',
        description: [
          'У вас есть очки чародейства, равные уровню чародея; все возвращаются после продолжительного отдыха.',
          '- **Ячейка → очки** (без действия): потратьте ячейку и получите очки, равные её кругу.',
          '- **Очки → ячейка** (бонусное действие): 1 круг — 2 очка (с 2-го уровня), 2 круг — 3 очка (с 3-го), 3 круг — 5 очков (с 5-го), 4 круг — 6 очков (с 7-го), 5 круг — 7 очков (с 9-го). Ячейки выше 5-го круга создать нельзя; созданные ячейки пропадают после продолжительного отдыха.',
        ].join('\n'),
        // The pool itself; the two ways of turning it are their own abilities below.
        action: 'passive',
        resource: { id: SORCERY_POINTS, name: 'Очки чародейства', max: (ctx) => ctx.classLevel, recharge: 'long', iconName: 'energise', color: '#b36ad9' },
        iconName: 'energise',
      },
      {
        id: 'sorcerer.font-slot-to-points',
        name: 'Ячейка → очки чародейства',
        description: 'Без действия вы тратите ячейку заклинаний и получаете очки чародейства, равные её кругу (не больше максимума).',
        action: 'passive',
        usesResource: { id: SORCERY_POINTS },
        convert: 'slotToPoints',
        iconName: 'energise',
        color: '#b36ad9',
      },
      {
        id: 'sorcerer.font-points-to-slot',
        name: 'Очки чародейства → ячейка',
        description:
          'Бонусным действием вы превращаете очки чародейства в ячейку: 1 круг — 2 очка, 2 — 3, 3 — 5, 4 — 6, 5 — 7. Ячейка не выше 5-го круга и только того круга, ячейки которого у вас уже есть; созданная исчезает после продолжительного отдыха.',
        action: 'bonus',
        usesResource: { id: SORCERY_POINTS },
        convert: 'pointsToSlot',
        iconName: 'magic-swirl',
        color: '#b36ad9',
      },
      {
        id: 'sorcerer.metamagic',
        name: 'Метамагия',
        description:
          'Вы знаете два варианта Метамагии (ещё два на 10-м и 17-м уровнях) и платите за них очками чародейства. К одному заклинанию применяется только один вариант, если в описании не сказано иное. С каждым уровнем чародея один вариант можно заменить другим.',
        iconName: 'divided-spiral',
        choices: [{ id: 'metamagic', label: 'Метамагия (2)', count: 2, pool: 'metamagic', options: { from: 'catalog', catalog: 'metamagic' } }],
      },
    ],
    3: [subclassHeading('sorcerer', 'Подкласс чародея', 'Источник вашей врождённой магии определяет умения подкласса.')],
    4: [abilityScoreImprovement('sorcerer', 4)],
    5: [
      {
        id: 'sorcerer.sorcerous-restoration',
        name: 'Чародейское восстановление',
        description: 'Завершив короткий отдых, вы восстанавливаете потраченные очки чародейства — не больше половины уровня чародея (с округлением вниз). Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'sorcerer.sorcerous-restoration', name: 'Чародейское восстановление', max: 1, recharge: 'long' },
        iconName: 'regeneration',
      },
    ],
    7: [
      {
        id: 'sorcerer.sorcery-incarnate',
        name: 'Воплощение чародейства',
        description:
          'Если использований Врождённого чародейства не осталось, вы можете активировать его, потратив тем же бонусным действием 2 очка чародейства. Пока Врождённое чародейство действует, к одному заклинанию можно применить до двух вариантов Метамагии.',
        action: 'bonus',
        usesResource: { id: SORCERY_POINTS, cost: 2 },
        iconName: 'aura',
      },
    ],
    8: [abilityScoreImprovement('sorcerer', 8)],
    10: [moreMetamagic(10)],
    12: [abilityScoreImprovement('sorcerer', 12)],
    16: [abilityScoreImprovement('sorcerer', 16)],
    17: [moreMetamagic(17)],
    19: [epicBoon('sorcerer')],
    20: [
      {
        id: 'sorcerer.arcane-apotheosis',
        name: 'Апофеоз чародейства',
        description: 'Пока действует Врождённое чародейство, раз в каждый свой ход вы можете применить один вариант Метамагии, не тратя очков чародейства.',
        action: 'passive',
        iconName: 'sun-radiations',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const SORCERER_ICONS = {
  class: 'fire-ray',
  subclasses: {
    'aberrant-sorcery': 'brain-tentacle',
    'clockwork-sorcery': 'cog',
    'draconic-sorcery': 'dragon-head',
    'wild-magic-sorcery': 'dice-fire',
    'spellfire-sorcery': 'fire-bowl',
    'shadow-sorcery': 'night-sky',
  } as Record<string, string>,
};
