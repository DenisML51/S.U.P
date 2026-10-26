import { byClassLevel } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { abilityScoreImprovement, epicBoon, subclassHeading, weaponMasteryChoice } from './shared';

/** Варвар of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const RAGE = 'barbarian.rage';

/** Rage Damage column of the class table: +2, +3 from level 9, +4 from level 16. */
const rageDamage = byClassLevel({ 1: 2, 9: 3, 16: 4 });

/** Save DC of the barbarian's Strength features: 8 + Strength modifier + proficiency bonus. */
const strengthDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('strength');

/** Barbarian Weapon Mastery: simple or martial melee weapons, sharing the common mastery pool. */
const mastery = (count: number, label?: string) => ({
  ...weaponMasteryChoice(count, label),
  options: { from: 'weapons' as const, filter: 'melee' as const },
});

const BARBARIAN_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [{ ref: 'greataxe' }, { ref: 'handaxe', quantity: 4 }, { ref: 'explorers-pack' }],
    gold: 15,
  },
  { id: 'b', label: 'B', items: [], gold: 75 },
];

// ------------------------------------------------------------------------------------------------
// Subclasses
// ------------------------------------------------------------------------------------------------

const berserker: SubclassDef = {
  id: 'path-of-the-berserker',
  name: 'Путь берсерка',
  description: 'Ярость как чистое насилие: неистовство, которое добавляет урона, не знает страха и отвечает ударом на удар.',
  levels: {
    3: [
      {
        id: 'berserker.frenzy',
        name: 'Бешенство',
        description:
          'Если вы используете Безрассудную атаку во время Ярости, первая цель, по которой вы попадаете в этот ход атакой с использованием Силы, получает дополнительный урон: столько к6, каков ваш бонус Урона ярости (2к6, 3к6 с 9-го уровня, 4к6 с 16-го). Тип урона — как у оружия или Безоружного удара.',
        action: 'passive',
        damage: (ctx) => `${rageDamage(ctx)}d6`,
        iconName: 'spiky-explosion',
      },
    ],
    6: [
      {
        id: 'berserker.mindless-rage',
        name: 'Бездумная ярость',
        description:
          'Во время Ярости у вас иммунитет к состояниям «Очарованный» и «Испуганный». Если они уже действуют на вас, когда вы впадаете в Ярость, они заканчиваются.',
        action: 'passive',
        iconName: 'screaming',
      },
    ],
    10: [
      {
        id: 'berserker.retaliation',
        name: 'Ответный удар',
        description: 'Получив урон от существа в пределах 5 футов, вы можете реакцией совершить по нему одну рукопашную атаку оружием или Безоружным ударом.',
        action: 'reaction',
        iconName: 'sword-clash',
      },
    ],
    14: [
      {
        id: 'berserker.intimidating-presence',
        name: 'Устрашающее присутствие',
        description:
          'Бонусным действием выбранные вами существа в 30-футовой эманации совершают спасбросок Мудрости (СЛ = 8 + модификатор Силы + бонус мастерства); при провале они испуганы на 1 минуту и повторяют спасбросок в конце каждого своего хода. Раз в продолжительный отдых; использование можно вернуть, потратив одну Ярость (без действия).',
        action: 'bonus',
        resource: { id: 'berserker.intimidating-presence', name: 'Устрашающее присутствие', max: 1, recharge: 'long', iconName: 'terror' },
        saveAttribute: 'wisdom',
        saveDC: strengthDC,
        iconName: 'terror',
      },
    ],
  },
};

const wildHeart: SubclassDef = {
  id: 'path-of-the-wild-heart',
  name: 'Путь дикого сердца',
  description: 'Родство с миром зверей: Ярость принимает облик волка, медведя или орла, а природа говорит с варваром.',
  levels: {
    3: [
      {
        id: 'wild-heart.animal-speaker',
        name: 'Говорящий с животными',
        description: 'Вы можете сотворять «Животные чувства» и «Разговор с животными», но только как ритуалы. Заклинательная характеристика — Мудрость.',
        effects: [
          { type: 'spell', spell: 'beast-sense', alwaysPrepared: true, ability: 'wisdom', note: 'Только как ритуал' },
          { type: 'spell', spell: 'speak-with-animals', alwaysPrepared: true, ability: 'wisdom', note: 'Только как ритуал' },
        ],
        iconName: 'deer',
      },
      {
        id: 'wild-heart.rage-of-the-wilds',
        name: 'Ярость дикой природы',
        description:
          'Впадая в Ярость, вы каждый раз выбираете один эффект на её время:\n\n- **Волк.** Союзники совершают с преимуществом броски атаки по вашим врагам в пределах 5 футов от вас.\n- **Медведь.** Сопротивление всему урону, кроме излучения, некротического, психического и силового.\n- **Орёл.** Частью бонусного действия, которым вы впадаете в Ярость, вы совершаете Отход и Рывок; пока Ярость длится, можете бонусным действием совершать оба этих действия.',
        action: 'passive',
        iconName: 'wolf-howl',
      },
    ],
    6: [
      {
        id: 'wild-heart.aspect-of-the-wilds',
        name: 'Аспект дикой природы',
        description: 'Вы получаете одну особенность на выбор. После каждого продолжительного отдыха выбор можно изменить.',
        choices: [
          {
            id: 'aspect',
            label: 'Аспект',
            count: 1,
            hint: 'Можно менять после продолжительного отдыха.',
            options: {
              from: 'options',
              options: [
                {
                  id: 'owl',
                  name: 'Сова',
                  description: 'Тёмное зрение на 60 футов (или +60 футов к имеющемуся).',
                  features: [{ id: 'wild-heart.aspect-owl', name: 'Аспект совы', description: 'У вас есть тёмное зрение на 60 футов; если оно уже было, его дальность увеличивается на 60 футов.', effects: [{ type: 'darkvision', range: 60, extend: true }], iconName: 'beast-eye' }],
                },
                {
                  id: 'panther',
                  name: 'Пантера',
                  description: 'Скорость лазания, равная скорости ходьбы.',
                  features: [{ id: 'wild-heart.aspect-panther', name: 'Аспект пантеры', description: 'У вас есть скорость лазания, равная вашей скорости.', effects: [{ type: 'movement', mode: 'climb' }], iconName: 'cat' }],
                },
                {
                  id: 'salmon',
                  name: 'Лосось',
                  description: 'Скорость плавания, равная скорости ходьбы.',
                  features: [{ id: 'wild-heart.aspect-salmon', name: 'Аспект лосося', description: 'У вас есть скорость плавания, равная вашей скорости.', effects: [{ type: 'movement', mode: 'swim' }], iconName: 'wave-crest' }],
                },
              ],
            },
          },
        ],
      },
    ],
    10: [
      {
        id: 'wild-heart.nature-speaker',
        name: 'Говорящий с природой',
        description: 'Вы можете сотворять «Общение с природой», но только как ритуал. Заклинательная характеристика — Мудрость.',
        effects: [{ type: 'spell', spell: 'commune-with-nature', alwaysPrepared: true, ability: 'wisdom', note: 'Только как ритуал' }],
        iconName: 'oak-leaf',
      },
    ],
    14: [
      {
        id: 'wild-heart.power-of-the-wilds',
        name: 'Сила дикой природы',
        description:
          'Впадая в Ярость, вы каждый раз выбираете ещё один эффект на её время:\n\n- **Сокол.** Пока вы не носите доспехов, у вас есть скорость полёта, равная скорости ходьбы.\n- **Лев.** Враги в пределах 5 футов от вас совершают с помехой броски атаки по целям, кроме вас и других варваров с этим эффектом.\n- **Баран.** Попав рукопашной атакой по существу Большого или меньшего размера, вы можете сбить его с ног (состояние «Опрокинутый»).',
        action: 'passive',
        iconName: 'lion',
      },
    ],
  },
};

const worldTree: SubclassDef = {
  id: 'path-of-the-world-tree',
  name: 'Путь Мирового древа',
  description: 'Ярость, питаемая Иггдрасилем: жизненная сила для себя и союзников, призрачные ветви и путешествия между точками пространства.',
  levels: {
    3: [
      {
        id: 'world-tree.vitality-of-the-tree',
        name: 'Жизненная сила Древа',
        description:
          '**Прилив жизненных сил.** Впадая в Ярость, вы получаете временные хиты, равные уровню варвара.\n\n**Живительная сила.** Пока Ярость длится, в начале каждого своего хода вы можете дать другому существу в пределах 10 футов временные хиты: столько к6, каков ваш бонус Урона ярости. Они исчезают, когда Ярость заканчивается.',
        action: 'passive',
        damage: (ctx) => `${rageDamage(ctx)}d6`,
        iconName: 'tree-growth',
      },
    ],
    6: [
      {
        id: 'world-tree.branches-of-the-tree',
        name: 'Ветви Древа',
        description:
          'Во время Ярости, когда видимое вами существо в пределах 30 футов начинает ход, вы можете реакцией потребовать от него спасбросок Силы (СЛ = 8 + модификатор Силы + бонус мастерства). При провале оно телепортируется в видимое свободное пространство в пределах 5 футов от вас (или в ближайшее такое), и вы можете снизить его скорость до 0 до конца хода.',
        action: 'reaction',
        saveAttribute: 'strength',
        saveDC: strengthDC,
        iconName: 'thorny-vine',
      },
    ],
    10: [
      {
        id: 'world-tree.battering-roots',
        name: 'Колотящее дубьё',
        description:
          'В свой ход ваша досягаемость рукопашным оружием со свойством «Тяжёлое» или «Универсальное» увеличивается на 10 футов. Попав таким оружием в свой ход, вы можете применить свойство мастерства «Толчок» или «Опрокидывание» в дополнение к свойству этого оружия.',
        action: 'passive',
        iconName: 'vine-whip',
      },
    ],
    14: [
      {
        id: 'world-tree.travel-along-the-tree',
        name: 'Путешествие по Древу',
        description:
          'Впадая в Ярость, а также бонусным действием, пока она длится, вы можете телепортироваться на расстояние до 60 футов в видимое свободное пространство. Раз за Ярость дальность можно увеличить до 150 футов и взять с собой до шести согласных существ в пределах 10 футов; они появляются в пределах 10 футов от точки назначения.',
        action: 'bonus',
        iconName: 'magic-portal',
      },
    ],
  },
};

const zealot: SubclassDef = {
  id: 'path-of-the-zealot',
  name: 'Путь фанатика',
  description: 'Ярость как экстаз божественного единения: удары несут силу бога, а сам варвар не желает падать.',
  levels: {
    3: [
      {
        id: 'zealot.divine-fury',
        name: 'Божественная ярость',
        description:
          'Во время Ярости первое существо, по которому вы попадаете оружием или Безоружным ударом в каждый свой ход, получает дополнительный урон 1к6 + половина уровня варвара (с округлением вниз). Тип урона — некротический или излучение, на ваш выбор при каждом нанесении.',
        action: 'passive',
        damage: (ctx) => `1d6+${Math.floor(ctx.classLevel / 2)}`,
        damageType: 'Лучистый',
        iconName: 'sunbeams',
        color: '#f2d16b',
      },
      {
        id: 'zealot.warrior-of-the-gods',
        name: 'Воин богов',
        description:
          'У вас есть запас костей к12 для самоисцеления: 4, с 6-го уровня 5, с 12-го 6, с 17-го 7. Бонусным действием вы тратите любое число костей из запаса, бросаете их и восстанавливаете столько хитов. Кости возвращаются после продолжительного отдыха.',
        action: 'bonus',
        damage: '1d12',
        damageType: 'Лечение',
        resource: {
          id: 'zealot.warrior-of-the-gods',
          name: 'Кости «Воина богов»',
          max: byClassLevel({ 3: 4, 6: 5, 12: 6, 17: 7 }),
          recharge: 'long',
          description: 'Кости к12 для самоисцеления бонусным действием.',
          iconName: 'heart-wings',
        },
        iconName: 'heart-wings',
        color: '#7fb069',
      },
    ],
    6: [
      {
        id: 'zealot.fanatical-focus',
        name: 'Фанатичная сосредоточенность',
        description:
          'Провалив спасбросок во время Ярости, вы можете перебросить его с бонусом, равным бонусу Урона ярости, и должны использовать новый результат. Раз за каждую Ярость.',
        action: 'passive',
        iconName: 'prayer',
      },
    ],
    10: [
      {
        id: 'zealot.zealous-presence',
        name: 'Фанатичное присутствие',
        description:
          'Бонусным действием вы издаёте боевой клич: до десяти других существ в пределах 60 футов до начала вашего следующего хода совершают с преимуществом броски атаки и спасброски. Раз в продолжительный отдых; использование можно вернуть, потратив одну Ярость (без действия).',
        action: 'bonus',
        resource: { id: 'zealot.zealous-presence', name: 'Фанатичное присутствие', max: 1, recharge: 'long', iconName: 'rally-the-troops' },
        iconName: 'rally-the-troops',
      },
    ],
    14: [
      {
        id: 'zealot.rage-of-the-gods',
        name: 'Ярость богов',
        description:
          'Впадая в Ярость, вы можете принять облик божественного воина на 1 минуту или пока ваши хиты не упадут до 0. В этом облике у вас скорость полёта, равная скорости ходьбы (можно парить), сопротивление некротическому, психическому урону и излучению, а когда хиты существа в пределах 30 футов падают до 0, вы можете реакцией потратить одну Ярость, чтобы его хиты стали равны вашему уровню варвара. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'zealot.rage-of-the-gods', name: 'Ярость богов', max: 1, recharge: 'long', iconName: 'angel-wings' },
        iconName: 'angel-wings',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

const masteryLevel = (level: number): FeatureDef => ({
  id: `barbarian.weapon-mastery-${level}`,
  name: 'Оружейное мастерство',
  description: 'Вы осваиваете ещё один вид оружия.',
  hidden: true,
  choices: [mastery(1)],
});

export const BARBARIAN: ClassDef = {
  id: 'barbarian',
  name: 'Варвар',
  description: 'Свирепый воин, черпающий силу из первобытной Ярости: стойкий к ударам, быстрый и страшный в ближнем бою.',
  hitDie: 12,
  primary: ['strength'],
  saves: ['strength', 'constitution'],
  skillChoices: { count: 2, list: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
  ],
  subclassLevel: 3,
  subclasses: [berserker, wildHeart, worldTree, zealot],
  startingEquipment: BARBARIAN_KITS,
  levels: {
    1: [
      {
        id: 'barbarian.rage',
        name: 'Ярость',
        description:
          'Бонусным действием вы впадаете в Ярость, если не носите тяжёлых доспехов. Пока она длится:\n\n- сопротивление дробящему, колющему и рубящему урону;\n- атаки с использованием Силы (оружием или Безоружным ударом) получают бонус к урону: **+2**, +3 с 9-го уровня, +4 с 16-го;\n- проверки и спасброски Силы с преимуществом;\n- вы не можете колдовать и поддерживать концентрацию.\n\nЯрость длится до конца вашего следующего хода и продлевается ещё на ход, если вы атаковали врага, заставили его совершить спасбросок или потратили бонусное действие на продление; всего до 10 минут. Она заканчивается раньше, если вы надели тяжёлый доспех или стали недееспособны.\n\nИспользований 2 (3 с 3-го уровня, 4 с 6-го, 5 с 12-го, 6 с 17-го); короткий отдых возвращает одно, продолжительный — все.',
        action: 'bonus',
        resource: {
          id: RAGE,
          name: 'Ярость',
          max: byClassLevel({ 1: 2, 3: 3, 6: 4, 12: 5, 17: 6 }),
          recharge: 'long',
          shortRestRegain: 1,
          description: 'Бонус урона Ярости: +2, с 9-го уровня +3, с 16-го +4. Короткий отдых возвращает одно использование.',
          iconName: 'angry-eyes',
          color: '#c0392b',
        },
        stance: {
          endsConcentration: true,
          effects: [
            { type: 'resistance', damageType: 'Дробящий' },
            { type: 'resistance', damageType: 'Колющий' },
            { type: 'resistance', damageType: 'Рубящий' },
            { type: 'damageBonus', ability: 'strength', amount: rageDamage },
            { type: 'advantage', on: ['check:strength', 'save:strength'] },
          ],
        },
        iconName: 'angry-eyes',
        color: '#c0392b',
      },
      {
        id: 'barbarian.unarmored-defense',
        name: 'Защита без доспехов',
        description: 'Пока вы не носите доспехов, ваш КД равен 10 + модификатор Ловкости + модификатор Телосложения. Щит при этом можно использовать.',
        effects: [{ type: 'unarmoredDefense', attribute: 'constitution' }],
        iconName: 'muscle-up',
      },
      {
        id: 'barbarian.weapon-mastery',
        name: 'Оружейное мастерство',
        description:
          'Вы используете свойства мастерства двух видов простого или воинского рукопашного оружия (3 с 4-го уровня, 4 с 10-го). После продолжительного отдыха один вид можно заменить.',
        choices: [mastery(2, 'Оружейное мастерство (2)')],
        iconName: 'battle-axe',
      },
    ],
    2: [
      {
        id: 'barbarian.danger-sense',
        name: 'Чувство опасности',
        description: 'Вы совершаете спасброски Ловкости с преимуществом, если не недееспособны.',
        action: 'passive',
        effects: [{ type: 'advantage', on: ['save:dexterity'] }],
        iconName: 'dodge',
      },
      {
        id: 'barbarian.reckless-attack',
        name: 'Безрассудная атака',
        description:
          'Совершая первый бросок атаки в свой ход, вы можете атаковать безрассудно: до начала вашего следующего хода ваши броски атаки с использованием Силы совершаются с преимуществом, но и атаки по вам — тоже.',
        action: 'passive',
        iconName: 'axe-swing',
      },
    ],
    3: [
      subclassHeading('barbarian', 'Подкласс варвара', 'Вы выбираете подкласс: Путь берсерка, Путь дикого сердца, Путь Мирового древа или Путь фанатика.'),
      {
        id: 'barbarian.primal-knowledge',
        name: 'Первобытное знание',
        description:
          'Вы получаете владение ещё одним навыком из списка варвара. Во время Ярости проверки Акробатики, Восприятия, Выживания, Запугивания и Скрытности вы можете совершать как проверки Силы.',
        choices: [
          {
            id: 'skill',
            label: 'Навык',
            count: 1,
            options: { from: 'skills', list: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
          },
        ],
        iconName: 'paw',
      },
    ],
    4: [abilityScoreImprovement('barbarian', 4), masteryLevel(4)],
    5: [
      {
        id: 'barbarian.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая действие «Атака» в свой ход, вы атакуете дважды вместо одного раза.',
        action: 'passive',
        iconName: 'crossed-swords',
        effects: [{ type: 'extraAttack', attacks: 2 }],
      },
      {
        id: 'barbarian.fast-movement',
        name: 'Быстрое передвижение',
        description: 'Пока вы не носите тяжёлых доспехов, ваша скорость увеличивается на 10 футов.',
        effects: [{ type: 'speed', amount: 10, when: 'noHeavyArmor' }],
        iconName: 'run',
      },
    ],
    7: [
      {
        id: 'barbarian.feral-instinct',
        name: 'Дикий инстинкт',
        description: 'Вы совершаете броски инициативы с преимуществом.',
        action: 'passive',
        effects: [{ type: 'advantage', on: ['initiative'] }],
        iconName: 'beast-eye',
      },
      {
        id: 'barbarian.instinctive-pounce',
        name: 'Инстинктивный прыжок',
        description: 'Частью бонусного действия, которым вы впадаете в Ярость, вы можете переместиться на расстояние до половины своей скорости.',
        action: 'passive',
        iconName: 'sprint',
      },
    ],
    8: [abilityScoreImprovement('barbarian', 8)],
    9: [
      {
        id: 'barbarian.brutal-strike',
        name: 'Жестокий удар',
        description:
          'Используя Безрассудную атаку, вы можете отказаться от преимущества на один бросок атаки с использованием Силы в этот ход (он не должен быть с помехой). При попадании цель получает дополнительно 1к10 урона того же типа (2к10 с 17-го уровня), и вы применяете эффект Жестокого удара:\n\n- **Мощный удар.** Цель отталкивается на 15 футов от вас; затем вы можете переместиться к ней по прямой на половину скорости, не провоцируя атак.\n- **Калечащий удар.** Скорость цели уменьшается на 15 футов до начала вашего следующего хода (действует только последний такой удар).',
        action: 'passive',
        damage: (ctx) => (ctx.classLevel >= 17 ? '2d10' : '1d10'),
        iconName: 'crush',
      },
    ],
    10: [masteryLevel(10)],
    11: [
      {
        id: 'barbarian.relentless-rage',
        name: 'Непреклонная ярость',
        description:
          'Если ваши хиты опускаются до 0 во время Ярости и вы не погибаете сразу, вы можете совершить спасбросок Телосложения СЛ 10. При успехе ваши хиты становятся равны удвоенному уровню варвара. Каждое следующее использование повышает СЛ на 5; после короткого или продолжительного отдыха СЛ снова 10.',
        action: 'passive',
        iconName: 'chained-heart',
      },
    ],
    12: [abilityScoreImprovement('barbarian', 12)],
    13: [
      {
        id: 'barbarian.improved-brutal-strike-13',
        name: 'Улучшенный жестокий удар',
        description:
          'К эффектам Жестокого удара добавляются:\n\n- **Потрясающий удар.** Цель совершает следующий спасбросок с помехой и не может совершать провоцированные атаки до начала вашего следующего хода.\n- **Расшатывающий удар.** Следующий бросок атаки другого существа по цели до начала вашего следующего хода получает +5 (не больше одного такого бонуса на бросок).',
        action: 'passive',
        iconName: 'shield-impact',
      },
    ],
    15: [
      {
        id: 'barbarian.persistent-rage',
        name: 'Непрерывная ярость',
        description:
          'Совершая бросок инициативы, вы можете восстановить все потраченные использования Ярости; затем это недоступно до продолжительного отдыха. Кроме того, Ярость длится 10 минут без продления и заканчивается раньше, только если вы потеряли сознание или надели тяжёлый доспех.',
        action: 'passive',
        resource: { id: 'barbarian.persistent-rage', name: 'Непрерывная ярость', max: 1, recharge: 'long', iconName: 'energise' },
        iconName: 'energise',
      },
    ],
    16: [abilityScoreImprovement('barbarian', 16)],
    17: [
      {
        id: 'barbarian.improved-brutal-strike-17',
        name: 'Улучшенный жестокий удар',
        description: 'Дополнительный урон Жестокого удара увеличивается до 2к10, и вы можете применить сразу два разных его эффекта.',
        action: 'passive',
        iconName: 'stomp',
      },
    ],
    18: [
      {
        id: 'barbarian.indomitable-might',
        name: 'Неукротимая мощь',
        description: 'Если результат вашей проверки или спасброска Силы меньше значения Силы, вы можете использовать это значение вместо результата.',
        action: 'passive',
        iconName: 'giant',
      },
    ],
    19: [epicBoon('barbarian')],
    20: [
      {
        id: 'barbarian.primal-champion',
        name: 'Дикий чемпион',
        description: 'Ваши Сила и Телосложение увеличиваются на 4, но не выше 25.',
        effects: [
          { type: 'attribute', attribute: 'strength', amount: 4, max: 25 },
          { type: 'attribute', attribute: 'constitution', amount: 4, max: 25 },
        ],
        iconName: 'laurel-crown',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const BARBARIAN_ICONS = {
  class: 'barbarian',
  subclasses: {
    'path-of-the-berserker': 'crossed-axes',
    'path-of-the-wild-heart': 'bear-head',
    'path-of-the-world-tree': 'tree-roots',
    'path-of-the-zealot': 'sun-priest',
  } as Record<string, string>,
};
