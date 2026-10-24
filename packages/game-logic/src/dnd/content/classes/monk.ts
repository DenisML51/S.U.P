import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { ARTISAN_TOOL_NAMES, MUSICAL_INSTRUMENT_NAMES } from '../equipment';
import { abilityScoreImprovement, epicBoon, subclassHeading } from './shared';

/** Монах of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const FOCUS = 'monk.focus';

/** Martial Arts die size by monk level: d6, d8 from 5, d10 from 11, d12 from 17. */
const martialDie = byClassLevel({ 1: 6, 5: 8, 11: 10, 17: 12 });
/** `n` Martial Arts dice, written as dice (`2d8`). */
const martialDice = (ctx: BuildContext, n = 1) => `${n}d${martialDie(ctx)}`;
const plus = (value: number) => (value === 0 ? '' : value > 0 ? `+${value}` : `${value}`);

/** Save DC of the monk's focus features: 8 + Wisdom modifier + proficiency bonus. */
const focusDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('wisdom');

const DIE_TEXT = 'Кость боевых искусств: к6, к8 с 5-го уровня, к10 с 11-го, к12 с 17-го.';

const MONK_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [{ ref: 'spear' }, { ref: 'dagger', quantity: 5 }, { ref: 'artisans-tools' }, { ref: 'explorers-pack' }],
    gold: 11,
  },
  { id: 'b', label: 'B', items: [], gold: 50 },
];

// ------------------------------------------------------------------------------------------------
// Subclasses
// ------------------------------------------------------------------------------------------------

const mercy: SubclassDef = {
  id: 'warrior-of-mercy',
  name: 'Воин милосердия',
  description: 'Странствующий целитель, управляющий чужой жизненной силой: одной рукой лечит, другой несёт быстрый конец.',
  levels: {
    3: [
      {
        id: 'mercy.implements-of-mercy',
        name: 'Орудия милосердия',
        description: 'Вы получаете владение навыками Медицина и Проницательность, а также набором травника.',
        effects: [
          { type: 'skill', skill: 'medicine' },
          { type: 'skill', skill: 'insight' },
          { type: 'proficiency', category: 'tool', value: 'Набор травника' },
        ],
        iconName: 'medical-pack',
      },
      {
        id: 'mercy.hand-of-healing',
        name: 'Исцеляющая рука',
        description:
          'Действием «Магия» вы тратите 1 очко сосредоточенности, касаетесь существа и восстанавливаете ему хиты, равные броску Кости боевых искусств + модификатор Мудрости. Используя Шквал ударов, можно заменить один из ударов этим умением без траты очка.',
        action: 'action',
        usesResource: { id: FOCUS },
        damage: (ctx) => `${martialDice(ctx)}${plus(ctx.modifier('wisdom'))}`,
        damageType: 'Лечение',
        iconName: 'glowing-hands',
        color: '#7fb069',
      },
      {
        id: 'mercy.hand-of-harm',
        name: 'Повреждающая рука',
        description:
          'Раз в ход, попав Безоружным ударом и нанеся урон, вы можете потратить 1 очко сосредоточенности: цель получает дополнительный некротический урон, равный броску Кости боевых искусств + модификатор Мудрости.',
        action: 'passive',
        usesResource: { id: FOCUS },
        damage: (ctx) => `${martialDice(ctx)}${plus(ctx.modifier('wisdom'))}`,
        damageType: 'Некротический',
        iconName: 'death-skull',
        color: '#6b4f8a',
      },
    ],
    6: [
      {
        id: 'mercy.physicians-touch',
        name: 'Прикосновение целителя',
        description:
          '**Исцеляющая рука** также снимает с цели одно из состояний: «Оглохший», «Ослеплённый», «Отравленный», «Ошеломлённый» или «Парализованный».\n\n**Повреждающая рука** также делает цель отравленной до конца вашего следующего хода.',
        action: 'passive',
        iconName: 'bandage-roll',
      },
    ],
    11: [
      {
        id: 'mercy.flurry-of-healing-and-harm',
        name: 'Шквал исцеления и повреждения',
        description:
          'Используя Шквал ударов, вы можете заменить каждый удар Исцеляющей рукой без траты очков, а к удару Шквала, нанёсшему урон, применить Повреждающую руку без траты очка (по-прежнему раз в ход). Таких бесплатных применений — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'passive',
        resource: { id: 'mercy.flurry-of-healing-and-harm', name: 'Шквал исцеления и повреждения', max: modifierOf('wisdom'), recharge: 'long', iconName: 'crowned-heart' },
        iconName: 'crowned-heart',
      },
    ],
    17: [
      {
        id: 'mercy.hand-of-ultimate-mercy',
        name: 'Рука абсолютного милосердия',
        description:
          'Действием «Магия» вы касаетесь трупа существа, умершего не более 24 часов назад, и тратите 5 очков сосредоточенности: оно оживает с хитами 4к10 + модификатор Мудрости и без состояний «Оглохший», «Ослеплённый», «Отравленный», «Ошеломлённый» и «Парализованный». Раз в продолжительный отдых.',
        action: 'action',
        resource: { id: 'mercy.hand-of-ultimate-mercy', name: 'Рука абсолютного милосердия', max: 1, recharge: 'long', iconName: 'angel-outfit' },
        damage: (ctx) => `4d10${plus(ctx.modifier('wisdom'))}`,
        damageType: 'Лечение',
        iconName: 'angel-outfit',
        color: '#7fb069',
      },
    ],
  },
};

const shadow: SubclassDef = {
  id: 'warrior-of-shadow',
  name: 'Воин тени',
  description: 'Мастер скрытности, черпающий силу в Царстве теней: призывает тьму, шагает из тени в тень и сам становится тенью.',
  levels: {
    3: [
      {
        id: 'shadow.shadow-arts',
        name: 'Тёмные искусства',
        description:
          '**Тьма.** Потратив 1 очко сосредоточенности, вы сотворяете «Тьму» без компонентов. Вы видите сквозь неё, и в начале каждого своего хода можете переместить её область в точку в пределах 60 футов.\n\n**Тёмное зрение.** Вы получаете тёмное зрение на 60 футов (или +60 футов к имеющемуся).\n\n**Теневые обманки.** Вы знаете заговор «Малая иллюзия»; заклинательная характеристика — Мудрость.',
        effects: [
          { type: 'spell', spell: 'darkness', alwaysPrepared: true, ability: 'wisdom', resourceId: FOCUS, note: '1 очко сосредоточенности, без компонентов' },
          { type: 'spell', spell: 'minor-illusion', alwaysPrepared: true, ability: 'wisdom' },
        ],
        iconName: 'shadow-grasp',
      },
    ],
    6: [
      {
        id: 'shadow.shadow-step',
        name: 'Шаг в тень',
        description:
          'Находясь в темноте или тусклом свете, вы бонусным действием телепортируетесь на расстояние до 60 футов в видимое свободное пространство, тоже в темноте или тусклом свете. Следующая рукопашная атака в этот ход совершается с преимуществом.',
        action: 'bonus',
        iconName: 'shadow-follower',
      },
    ],
    11: [
      {
        id: 'shadow.improved-shadow-step',
        name: 'Улучшенный шаг в тень',
        description:
          'Потратив 1 очко сосредоточенности, вы используете Шаг в тень без требований к темноте или тусклому свету в начальной и конечной точке, а сразу после телепортации частью того же бонусного действия можете совершить Безоружный удар.',
        action: 'bonus',
        usesResource: { id: FOCUS },
        iconName: 'teleport',
      },
    ],
    17: [
      {
        id: 'shadow.cloak-of-shadows',
        name: 'Покров теней',
        description:
          'Находясь в темноте или тусклом свете, вы бонусным действием тратите 3 очка сосредоточенности и на 1 минуту окутываетесь тьмой (она рассеивается, если вы недееспособны или заканчиваете ход на ярком свету). Пока она действует:\n\n- вы невидимы;\n- можете проходить сквозь занятые пространства как сквозь труднопроходимую местность (закончив там ход, возвращаетесь в последнее свободное);\n- используете Шквал ударов без траты очков.',
        action: 'bonus',
        usesResource: { id: FOCUS, cost: 3 },
        iconName: 'invisible',
      },
    ],
  },
};

const elements: SubclassDef = {
  id: 'warrior-of-the-elements',
  name: 'Воин стихий',
  description: 'Монах, укрощающий энергию Стихийных планов: удары дотягиваются дальше, бьют огнём, холодом и молнией, а выбросы стихий накрывают толпы.',
  levels: {
    3: [
      {
        id: 'elements.elemental-attunement',
        name: 'Сродство со стихиями',
        description:
          'В начале своего хода вы можете потратить 1 очко сосредоточенности и на 10 минут (или пока не станете недееспособны) наполниться энергией стихий:\n\n- **Досягаемость.** Досягаемость ваших Безоружных ударов увеличивается на 10 футов.\n- **Удары стихий.** Попав Безоружным ударом, вы можете сделать его урон звуком, кислотой, огнём, холодом или электричеством. Нанося такой урон, можете потребовать спасбросок Силы: при провале цель перемещается на 10 футов к вам или от вас.',
        action: 'passive',
        usesResource: { id: FOCUS },
        saveAttribute: 'strength',
        saveDC: focusDC,
        iconName: 'lightning-arc',
      },
      {
        id: 'elements.manipulate-elements',
        name: 'Управление стихиями',
        description: 'Вы знаете заговор «Элементализм»; заклинательная характеристика — Мудрость.',
        effects: [{ type: 'spell', spell: 'elementalism', alwaysPrepared: true, ability: 'wisdom' }],
        iconName: 'magic-swirl',
      },
    ],
    6: [
      {
        id: 'elements.elemental-burst',
        name: 'Стихийный выброс',
        description:
          'Действием «Магия» вы тратите 2 очка сосредоточенности и вызываете взрыв в сфере радиусом 20 футов с центром в точке в пределах 120 футов. Выберите тип урона: звук, кислота, огонь, холод или электричество. Существа в сфере совершают спасбросок Ловкости и получают три Кости боевых искусств урона при провале или половину при успехе.',
        action: 'action',
        usesResource: { id: FOCUS, cost: 2 },
        damage: (ctx) => martialDice(ctx, 3),
        damageType: 'Огонь',
        saveAttribute: 'dexterity',
        saveDC: focusDC,
        iconName: 'fire-zone',
        color: '#e07a3f',
      },
    ],
    11: [
      {
        id: 'elements.stride-of-the-elements',
        name: 'Поступь стихий',
        description: 'Пока действует Сродство со стихиями, у вас есть скорость полёта и скорость плавания, равные скорости ходьбы.',
        action: 'passive',
        iconName: 'feathered-wing',
      },
    ],
    17: [
      {
        id: 'elements.elemental-epitome',
        name: 'Воплощение стихий',
        description:
          'Пока действует Сродство со стихиями:\n\n- **Сопротивление.** Сопротивление одному типу урона на выбор (звук, кислота, огонь, холод или электричество); выбор можно менять в начале каждого хода.\n- **Разрушительная поступь.** Используя Поступь ветра, вы получаете +20 футов скорости до конца хода, а входя в пространство в пределах 5 футов от существа, можете нанести ему урон в одну Кость боевых искусств (звук, кислота, огонь, холод или электричество; каждому существу — раз в ход).\n- **Усиленные удары.** Раз в свой ход, попав Безоружным ударом, вы наносите дополнительно одну Кость боевых искусств урона того же типа.',
        action: 'passive',
        damage: (ctx) => martialDice(ctx),
        iconName: 'star-swirl',
      },
    ],
  },
};

const openHand: SubclassDef = {
  id: 'warrior-of-the-open-hand',
  name: 'Воин открытой ладони',
  description: 'Мастер безоружного боя: каждым ударом Шквала толкает, роняет и сбивает врагов, исцеляет себя и знает смертельную Дрожащую ладонь.',
  levels: {
    3: [
      {
        id: 'open-hand.open-hand-technique',
        name: 'Техники открытой ладони',
        description:
          'Попав по существу атакой Шквала ударов, вы можете применить к нему один эффект:\n\n- **Запутать.** Цель не может совершать провоцированные атаки до начала своего следующего хода.\n- **Толкнуть.** Цель отталкивается на расстояние до 15 футов, если не преуспеет в спасброске Силы.\n- **Опрокинуть.** Цель сбита с ног, если не преуспеет в спасброске Ловкости.',
        action: 'passive',
        saveDC: focusDC,
        iconName: 'grab',
      },
    ],
    6: [
      {
        id: 'open-hand.wholeness-of-body',
        name: 'Целостность тела',
        description:
          'Бонусным действием вы бросаете Кость боевых искусств и восстанавливаете хиты, равные результату + модификатор Мудрости (минимум 1). Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'bonus',
        resource: { id: 'open-hand.wholeness-of-body', name: 'Целостность тела', max: modifierOf('wisdom'), recharge: 'long', iconName: 'healing' },
        damage: (ctx) => `${martialDice(ctx)}${plus(ctx.modifier('wisdom'))}`,
        damageType: 'Лечение',
        iconName: 'healing',
        color: '#7fb069',
      },
    ],
    11: [
      {
        id: 'open-hand.fleet-step',
        name: 'Быстрые ноги',
        description: 'Совершив любое бонусное действие, кроме Поступи ветра, вы можете сразу после него использовать Поступь ветра.',
        action: 'passive',
        iconName: 'walking-boot',
      },
    ],
    17: [
      {
        id: 'open-hand.quivering-palm',
        name: 'Дрожащая ладонь',
        description:
          'Попав Безоружным ударом, вы можете потратить 4 очка сосредоточенности и вызвать в цели смертельные колебания на число дней, равное уровню монаха. Действием (или вместо одной из атак действия «Атака») вы прекращаете их, если вы с целью на одном плане: она совершает спасбросок Телосложения и получает 10к12 урона силовым полем при провале или половину при успехе. Колебания могут быть только в одном существе; безвредно прекратить их можно без действия.',
        action: 'action',
        usesResource: { id: FOCUS, cost: 4 },
        damage: '10d12',
        damageType: 'Силовой',
        saveAttribute: 'constitution',
        saveDC: focusDC,
        iconName: 'magic-palm',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

const focusAbility = (id: string, name: string, description: string, extra: Partial<FeatureDef> = {}): FeatureDef => ({
  id,
  name,
  description,
  action: 'bonus',
  usesResource: { id: FOCUS },
  ...extra,
});

export const MONK: ClassDef = {
  id: 'monk',
  name: 'Монах',
  description: 'Мастер боевых искусств исключительной сосредоточенности: бьёт быстрее всех без оружия и доспехов, питая приёмы внутренней энергией.',
  hitDie: 8,
  primary: ['dexterity', 'wisdom'],
  saves: ['strength', 'dexterity'],
  skillChoices: { count: 2, list: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  proficiencies: [
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие (лёгкое)' },
  ],
  mentalStrength: 65,
  subclassLevel: 3,
  subclasses: [mercy, shadow, elements, openHand],
  startingEquipment: MONK_KITS,
  levels: {
    1: [
      {
        id: 'monk.tool-proficiency',
        name: 'Владение инструментами',
        description: 'Вы владеете одним видом инструментов ремесленника или одним музыкальным инструментом.',
        hidden: true,
        choices: [
          { id: 'tool', label: 'Инструменты', count: 1, options: { from: 'tools', list: [...ARTISAN_TOOL_NAMES, ...MUSICAL_INSTRUMENT_NAMES] } },
        ],
      },
      {
        id: 'monk.martial-arts',
        name: 'Боевые искусства',
        description: `Монашеское оружие — простое рукопашное и воинское рукопашное оружие со свойством «Лёгкое». Пока вы без доспехов и щита и безоружны или держите только монашеское оружие:\n\n- **Бонусный безоружный удар.** Бонусным действием вы совершаете один Безоружный удар.\n- **Кость боевых искусств.** Урон Безоружных ударов и монашеского оружия может быть равен Кости боевых искусств вместо обычного. ${DIE_TEXT}\n- **Ловкие атаки.** Для бросков атаки и урона Безоружными ударами и монашеским оружием можно использовать Ловкость вместо Силы; Ловкость можно использовать и для СЛ захвата и толчка.`,
        action: 'passive',
        effects: (ctx) => [
          {
            type: 'attack',
            attack: {
              id: 'monk.unarmed-strike',
              name: 'Безоружный удар',
              description: 'Удар рукой, ногой, головой и т. п. с Костью боевых искусств. Бонусным действием можно совершить ещё один.',
              damage: (ctx) => martialDice(ctx),
              damageType: 'Дробящий',
              abilities: ['strength', 'dexterity'],
              iconName: 'fist',
            },
          },
          { type: 'weaponAbility', ability: 'dexterity', weapons: 'monk' },
          { type: 'weaponDie', die: martialDice(ctx), weapons: 'monk' },
        ],
        iconName: 'punch',
      },
      {
        id: 'monk.unarmored-defense',
        name: 'Защита без доспехов',
        description: 'Пока вы не носите ни доспехов, ни щита, ваш КД равен 10 + модификатор Ловкости + модификатор Мудрости.',
        effects: [{ type: 'unarmoredDefense', attribute: 'wisdom', noShield: true }],
        iconName: 'eye-shield',
      },
    ],
    2: [
      {
        id: 'monk.monks-focus',
        name: 'Монашеская сосредоточенность',
        description:
          'У вас есть очки сосредоточенности в количестве, равном уровню монаха; потраченные очки возвращаются после короткого или продолжительного отдыха. Они питают Шквал ударов, Терпеливую защиту, Поступь ветра и другие умения. СЛ спасбросков от умений монаха = 8 + бонус мастерства + модификатор Мудрости.',
        action: 'passive',
        resource: {
          id: FOCUS,
          name: 'Очки сосредоточенности',
          max: (ctx) => ctx.classLevel,
          recharge: 'shortOrLong',
          description: 'Очки сосредоточенности монаха: столько, каков уровень монаха.',
          iconName: 'yin-yang',
        },
        iconName: 'meditation',
      },
      focusAbility(
        'monk.flurry-of-blows',
        'Шквал ударов',
        'Потратив 1 очко сосредоточенности, вы бонусным действием совершаете два Безоружных удара (три с 10-го уровня).',
        { iconName: 'high-kick' },
      ),
      focusAbility(
        'monk.patient-defense',
        'Терпеливая защита',
        'Бонусным действием вы совершаете Отход бесплатно, а за 1 очко сосредоточенности — Отход и Уклонение. С 10-го уровня очко также даёт временные хиты, равные броску двух Костей боевых искусств.',
        { iconName: 'dodge' },
      ),
      focusAbility(
        'monk.step-of-the-wind',
        'Поступь ветра',
        'Бонусным действием вы совершаете Рывок бесплатно, а за 1 очко сосредоточенности — Отход и Рывок, и дальность ваших прыжков в этот ход удваивается. С 10-го уровня, тратя очко, можно взять с собой согласное существо Большого или меньшего размера в пределах 5 футов (его перемещение не провоцирует атак).',
        { iconName: 'sprint' },
      ),
      {
        id: 'monk.unarmored-movement',
        name: 'Движение без доспехов',
        description: 'Пока вы не носите ни доспехов, ни щита, ваша скорость увеличивается: +10 футов, +15 с 6-го уровня, +20 с 10-го, +25 с 14-го, +30 с 18-го.',
        effects: (ctx) => [{ type: 'speed', amount: byClassLevel({ 2: 10, 6: 15, 10: 20, 14: 25, 18: 30 })(ctx) }],
        iconName: 'run',
      },
      {
        id: 'monk.uncanny-metabolism',
        name: 'Феноменальный метаболизм',
        description:
          'Совершая бросок инициативы, вы можете восстановить все потраченные очки сосредоточенности и восстановить хиты, равные броску Кости боевых искусств + уровень монаха. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'monk.uncanny-metabolism', name: 'Феноменальный метаболизм', max: 1, recharge: 'long', iconName: 'regeneration' },
        damage: (ctx) => `${martialDice(ctx)}+${ctx.classLevel}`,
        damageType: 'Лечение',
        iconName: 'regeneration',
        color: '#7fb069',
      },
    ],
    3: [
      subclassHeading('monk', 'Подкласс монаха', 'Вы выбираете подкласс: Воин милосердия, Воин тени, Воин стихий или Воин открытой ладони.'),
      {
        id: 'monk.deflect-attacks',
        name: 'Отражение атак',
        description:
          'Когда по вам попадает атака с дробящим, колющим или рубящим уроном (с 13-го уровня — с любым), вы можете реакцией уменьшить урон на 1к10 + модификатор Ловкости + уровень монаха. Если урон снижен до 0, можете потратить 1 очко сосредоточенности и перенаправить удар: существо в пределах 5 футов (для рукопашной атаки) или 60 футов (для дальнобойной, не за полным укрытием) совершает спасбросок Ловкости и при провале получает урон того же типа — две Кости боевых искусств + модификатор Ловкости.',
        action: 'reaction',
        damage: (ctx) => `${martialDice(ctx, 2)}${plus(ctx.modifier('dexterity'))}`,
        saveAttribute: 'dexterity',
        saveDC: focusDC,
        iconName: 'shield-reflect',
      },
    ],
    4: [
      abilityScoreImprovement('monk', 4),
      {
        id: 'monk.slow-fall',
        name: 'Медленное падение',
        description: 'Падая, вы можете реакцией уменьшить урон от падения на величину, равную пятикратному уровню монаха.',
        action: 'reaction',
        iconName: 'falling',
      },
    ],
    5: [
      {
        id: 'monk.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая действие «Атака» в свой ход, вы атакуете дважды вместо одного раза.',
        action: 'passive',
        iconName: 'crossed-swords',
      },
      {
        id: 'monk.stunning-strike',
        name: 'Ошеломляющий удар',
        description:
          'Раз в ход, попав Безоружным ударом или монашеским оружием, вы можете потратить 1 очко сосредоточенности: цель совершает спасбросок Телосложения. При провале она ошеломлена до начала вашего следующего хода; при успехе её скорость уменьшается вдвое, а следующая атака по ней до начала вашего следующего хода совершается с преимуществом.',
        action: 'passive',
        usesResource: { id: FOCUS },
        saveAttribute: 'constitution',
        saveDC: focusDC,
        iconName: 'knocked-out-stars',
      },
    ],
    6: [
      {
        id: 'monk.empowered-strikes',
        name: 'Усиленные удары',
        description: 'Урон ваших Безоружных ударов может быть, на ваш выбор, обычного типа или урона силовым полем.',
        action: 'passive',
        iconName: 'mailed-fist',
      },
    ],
    7: [
      {
        id: 'monk.evasion',
        name: 'Увёртливость',
        description:
          'Если эффект позволяет спасбросок Ловкости для половины урона, при успехе вы не получаете урона, а при провале получаете половину. Не действует, если вы недееспособны.',
        action: 'passive',
        iconName: 'dodging',
      },
    ],
    8: [abilityScoreImprovement('monk', 8)],
    9: [
      {
        id: 'monk.acrobatic-movement',
        name: 'Движение акробата',
        description: 'Пока вы не носите ни доспехов, ни щита, в свой ход вы можете перемещаться по вертикальным поверхностям и по жидкостям, не падая во время движения.',
        action: 'passive',
        iconName: 'footprint',
      },
    ],
    10: [
      {
        id: 'monk.heightened-focus',
        name: 'Повышенная сосредоточенность',
        description:
          '**Шквал ударов** даёт три Безоружных удара вместо двух.\n\n**Терпеливая защита** за очко также даёт временные хиты, равные броску двух Костей боевых искусств.\n\n**Поступь ветра** за очко позволяет взять с собой согласное существо Большого или меньшего размера в пределах 5 футов до конца хода; его перемещение не провоцирует атак.',
        action: 'passive',
        damage: (ctx) => martialDice(ctx, 2),
        iconName: 'third-eye',
      },
      {
        id: 'monk.self-restoration',
        name: 'Восстановление себя',
        description: 'В конце каждого своего хода вы можете окончить на себе одно из состояний: «Испуганный», «Отравленный» или «Очарованный». Недостаток еды и воды не вызывает у вас истощения.',
        action: 'passive',
        iconName: 'lotus',
      },
    ],
    12: [abilityScoreImprovement('monk', 12)],
    13: [
      {
        id: 'monk.deflect-energy',
        name: 'Отражение энергии',
        description: 'Отражение атак действует против атак с уроном любого типа, а не только дробящим, колющим или рубящим.',
        action: 'passive',
        iconName: 'bolt-shield',
      },
    ],
    14: [
      {
        id: 'monk.disciplined-survivor',
        name: 'Дисциплина сохранения',
        description: 'Вы владеете спасбросками всех характеристик. Провалив спасбросок, вы можете потратить 1 очко сосредоточенности, чтобы перебросить его, и должны использовать новый результат.',
        action: 'passive',
        usesResource: { id: FOCUS },
        effects: [
          { type: 'save', attribute: 'strength' },
          { type: 'save', attribute: 'dexterity' },
          { type: 'save', attribute: 'constitution' },
          { type: 'save', attribute: 'intelligence' },
          { type: 'save', attribute: 'wisdom' },
          { type: 'save', attribute: 'charisma' },
        ],
        iconName: 'wisdom',
      },
    ],
    15: [
      {
        id: 'monk.perfect-focus',
        name: 'Полная сосредоточенность',
        description: 'Совершая бросок инициативы без Феноменального метаболизма, если у вас 3 очка сосредоточенности или меньше, вы восстанавливаете их до 4.',
        action: 'passive',
        iconName: 'energise',
      },
    ],
    16: [abilityScoreImprovement('monk', 16)],
    18: [
      {
        id: 'monk.superior-defense',
        name: 'Совершенная защита',
        description:
          'В начале своего хода вы можете потратить 3 очка сосредоточенности: на 1 минуту (или пока не станете недееспособны) у вас сопротивление всему урону, кроме урона силовым полем.',
        action: 'passive',
        usesResource: { id: FOCUS, cost: 3 },
        iconName: 'energy-shield',
      },
    ],
    19: [epicBoon('monk')],
    20: [
      {
        id: 'monk.body-and-mind',
        name: 'Тело и разум',
        description: 'Ваши Ловкость и Мудрость увеличиваются на 4, но не выше 25.',
        effects: [
          { type: 'attribute', attribute: 'dexterity', amount: 4, max: 25 },
          { type: 'attribute', attribute: 'wisdom', amount: 4, max: 25 },
        ],
        iconName: 'ninja-heroic-stance',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const MONK_ICONS = {
  class: 'monk-face',
  subclasses: {
    'warrior-of-mercy': 'life-in-the-balance',
    'warrior-of-shadow': 'ninja-mask',
    'warrior-of-the-elements': 'fire-punch',
    'warrior-of-the-open-hand': 'open-palm',
  } as Record<string, string>,
};
