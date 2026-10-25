import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, OptionDef, SubclassDef } from '../../types';
import { HALF_CASTER_SLOTS, abilityScoreImprovement, byTable, epicBoon, subclassHeading, weaponMasteryChoice } from './shared';

/** Следопыт of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const FAVORED_ENEMY = 'ranger.favored-enemy';

/** A die plus an ability modifier, written as the sheet rolls it (`1d8+3`, `1d8-1`). */
const plus = (dice: string, modifier: number): string =>
  modifier === 0 ? dice : `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;

const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('wisdom');

export const RANGER_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'studded-leather-armor' },
      { ref: 'scimitar' },
      { ref: 'shortsword' },
      { ref: 'longbow' },
      { ref: 'arrows', quantity: 20 },
      { ref: 'quiver' },
      { ref: 'druidic-focus' },
      { ref: 'explorers-pack' },
    ],
    gold: 7,
  },
  { id: 'b', label: 'B', items: [], gold: 150 },
];

// ------------------------------------------------------------------------------------------------
// Subclasses
// ------------------------------------------------------------------------------------------------

/** A Primal Companion stat block as an option of the Beast Master's level-3 pick. */
const beast = (
  id: string,
  name: string,
  iconName: string,
  stats: string,
  strike: { die: string; flat: number; damageType: string; text: string },
): OptionDef => ({
  id,
  name,
  description: stats,
  features: [
    {
      id: `beast-master.${id}`,
      name,
      description: `${stats}\n\n**Удар зверя.** Рукопашная атака, бонус равен вашему модификатору атаки заклинаниями, досягаемость 5 футов. Попадание: ${strike.text}.`,
      action: 'bonus',
      iconName,
      damage: (ctx) => plus(strike.die, strike.flat + ctx.modifier('wisdom')),
      damageType: strike.damageType,
      effects: [
        {
          type: 'attack',
          attack: {
            id: `beast-master.${id}-strike`,
            name: `Удар зверя (${name.toLowerCase()})`,
            description: `Атака вашего первичного спутника по вашей команде (бонусное действие или вместо одной из ваших атак). ${strike.text}.`,
            damage: `${strike.die}+${strike.flat}`,
            damageType: strike.damageType,
            abilities: ['wisdom'],
            actionType: 'bonus',
            iconName,
          },
        },
      ],
    },
  ],
});

const beastMaster: SubclassDef = {
  id: 'beast-master',
  name: 'Повелитель зверей',
  description: 'Следопыт, связанный мистическими узами с первичным зверем — спутником, который сражается по его команде.',
  levels: {
    3: [
      {
        id: 'beast-master.primal-companion',
        name: 'Первичный спутник',
        description:
          'Вы призываете первичного зверя (земного, морского или небесного) — он дружелюбен к вам и союзникам и исполняет ваши команды; если вы умираете, он исчезает. В бою зверь ходит в ваш ход: перемещается и тратит реакцию сам, но действием совершает только Уклонение, если вы бонусным действием не прикажете иное. Вместо одной из своих атак при действии «Атака» вы можете приказать ему совершить Удар зверя. Если вы недееспособны, зверь действует по своему усмотрению.\n\nЕсли зверь погиб не больше часа назад, действием «Магия» и тратой ячейки заклинаний вы возвращаете его к жизни через 1 минуту с полными хитами. После продолжительного отдыха можно призвать другого зверя (прежний исчезает).\n\nУ всех зверей: КД 13 + ваш модификатор Мудрости; Первичная связь — к их проверкам и спасброскам добавляется ваш бонус мастерства; понимают ваши языки.',
        action: 'bonus',
        iconName: 'paw',
        choices: [
          {
            id: 'beast',
            label: 'Первичный зверь',
            count: 1,
            hint: 'Можно сменить после продолжительного отдыха.',
            options: {
              from: 'options',
              options: [
                beast(
                  'beast-of-the-land',
                  'Земной зверь',
                  'wolf-head',
                  'Средний зверь. КД 13 + мод. Мудрости; хиты 5 + 5 × уровень следопыта (кости хитов к8); скорость 40 футов, лазание 40 футов; СИЛ 14, ЛОВ 14, ТЕЛ 15, ИНТ 8, МДР 14, ХАР 11; тёмное зрение 60 футов.',
                  {
                    die: '1d8',
                    flat: 2,
                    damageType: 'Колющий',
                    text: '1к8 + 2 + ваш модификатор Мудрости дробящего, колющего или рубящего урона (вид выбирается при призыве). Если перед попаданием зверь прошёл по прямой к цели не меньше 20 футов, цель получает ещё 1к6 урона того же вида и, если она Большая или меньше, сбивается с ног',
                  },
                ),
                beast(
                  'beast-of-the-sea',
                  'Морской зверь',
                  'shark-jaws',
                  'Средний зверь. КД 13 + мод. Мудрости; хиты 5 + 5 × уровень следопыта (кости хитов к8); скорость 5 футов, плавание 60 футов; СИЛ 6, ЛОВ 16, ТЕЛ 13, ИНТ 8, МДР 14, ХАР 11; тёмное зрение 90 футов; амфибия (дышит воздухом и водой).',
                  {
                    die: '1d6',
                    flat: 2,
                    damageType: 'Колющий',
                    text: '1к6 + 2 + ваш модификатор Мудрости дробящего или колющего урона (вид выбирается при призыве), и цель становится схваченной (СЛ высвобождения равна СЛ ваших заклинаний)',
                  },
                ),
                beast(
                  'beast-of-the-sky',
                  'Небесный зверь',
                  'eagle-head',
                  'Маленький зверь. КД 13 + мод. Мудрости; хиты 4 + 4 × уровень следопыта (кости хитов к6); скорость 10 футов, полёт 60 футов; СИЛ 6, ЛОВ 16, ТЕЛ 13, ИНТ 8, МДР 14, ХАР 11; тёмное зрение 60 футов; Облёт — не провоцирует атак, вылетая из досягаемости врага.',
                  { die: '1d4', flat: 3, damageType: 'Рубящий', text: '1к4 + 3 + ваш модификатор Мудрости рубящего урона' },
                ),
              ],
            },
          },
        ],
      },
    ],
    7: [
      {
        id: 'beast-master.exceptional-training',
        name: 'Исключительная дрессировка',
        description:
          'Когда вы бонусным действием командуете первичному спутнику, он также может бонусным действием совершить Рывок, Отход, Уклонение или Помощь. Его атаки могут наносить на ваш выбор обычный или силовой урон.',
        action: 'passive',
        iconName: 'claws',
      },
    ],
    11: [
      {
        id: 'beast-master.bestial-fury',
        name: 'Звериная ярость',
        description:
          'По команде совершить Удар зверя спутник наносит его дважды. Первое за ход попадание спутника по цели вашей «Метки охотника» наносит дополнительный силовой урон, равный дополнительному урону заклинания.',
        action: 'passive',
        iconName: 'wolf-howl',
      },
    ],
    15: [
      {
        id: 'beast-master.share-spells',
        name: 'Общие заклинания',
        description: 'Сотворяя заклинание, нацеленное на себя, вы можете распространить его эффект и на первичного спутника, если он в пределах 30 футов.',
        action: 'passive',
        iconName: 'magic-palm',
      },
    ],
  },
};

const feyWanderer: SubclassDef = {
  id: 'fey-wanderer',
  name: 'Странник фей',
  description: 'Следопыт, тронутый магией Страны Фей: весёлый обаятель для друзей и ужас для врагов.',
  alwaysPrepared: {
    3: ['charm-person'],
    5: ['misty-step'],
    9: ['summon-fey'],
    13: ['dimension-door'],
    17: ['mislead'],
  },
  levels: {
    3: [
      {
        id: 'fey-wanderer.dreadful-strikes',
        name: 'Ужасающие удары',
        description: 'Попав по существу оружием, вы можете нанести ему дополнительно 1к4 психического урона (1к6 с 11-го уровня); каждая цель — не чаще раза в ход.',
        action: 'passive',
        damage: (ctx) => (ctx.classLevel >= 11 ? '1d6' : '1d4'),
        damageType: 'Психический',
        iconName: 'psychic-waves',
      },
      {
        id: 'fey-wanderer.otherworldly-glamour',
        name: 'Потустороннее очарование',
        description: 'К проверкам Харизмы вы добавляете модификатор Мудрости (минимум +1). Вы получаете владение одним навыком: Выступление, Обман или Убеждение.',
        iconName: 'charm',
        effects: [{ type: 'skillBonus', skills: ['deception', 'intimidation', 'performance', 'persuasion'], amount: modifierOf('wisdom') }],
        choices: [{ id: 'skill', label: 'Навык', count: 1, options: { from: 'skills', list: ['performance', 'deception', 'persuasion'] } }],
      },
      {
        id: 'fey-wanderer.feywild-gift',
        name: 'Дар Страны Фей',
        description:
          'На вас благословение фей — безобидная примета на выбор или по броску к6: иллюзорные бабочки во время отдыха, цветы в волосах на рассвете, запах трав и пряностей, пляшущая тень, рога, кожа и волосы, меняющие цвет каждый рассвет.',
        iconName: 'flower-twirl',
      },
    ],
    7: [
      {
        id: 'fey-wanderer.beguiling-twist',
        name: 'Заманивающий трюк',
        description:
          'Вы совершаете с преимуществом спасброски от очарования и для его окончания. Когда вы или существо в пределах 120 футов преуспевает в спасброске от очарования или испуга, вы можете реакцией заставить другое видимое существо в пределах 120 футов совершить спасбросок Мудрости. При провале оно очаровано или испугано (на ваш выбор) на 1 минуту и повторяет спасбросок в конце каждого своего хода.',
        action: 'reaction',
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'fairy',
      },
    ],
    11: [
      {
        id: 'fey-wanderer.fey-reinforcements',
        name: 'Подкрепление фей',
        description:
          '«Вызов феи» вы творите без материального компонента и можете сделать его без концентрации (тогда длительность 1 минута). Раз в продолжительный отдых вы творите его без ячейки.',
        action: 'passive',
        resource: { id: 'fey-wanderer.fey-reinforcements', name: 'Вызов феи без ячейки', max: 1, recharge: 'long' },
        iconName: 'fairy-wand',
      },
    ],
    15: [
      {
        id: 'fey-wanderer.misty-wanderer',
        name: 'Туманный странник',
        description:
          'Вы творите «Туманный шаг» без ячейки число раз, равное модификатору Мудрости (минимум 1) за продолжительный отдых. Сотворяя его, вы можете взять с собой согласное видимое существо в пределах 5 футов — оно появляется в пределах 5 футов от точки назначения.',
        action: 'bonus',
        resource: { id: 'fey-wanderer.misty-wanderer', name: 'Туманный шаг без ячейки', max: modifierOf('wisdom'), recharge: 'long' },
        iconName: 'teleport',
      },
    ],
  },
};

const gloomStalker: SubclassDef = {
  id: 'gloom-stalker',
  name: 'Сумрачный охотник',
  description: 'Охотник из глубокой тьмы, вооружённый магией Царства Теней: первым бьёт из засады и невидим для тёмного зрения.',
  alwaysPrepared: {
    3: ['disguise-self'],
    5: ['rope-trick'],
    9: ['fear'],
    13: ['greater-invisibility'],
    17: ['seeming'],
  },
  levels: {
    3: [
      {
        id: 'gloom-stalker.dread-ambusher',
        name: 'Угроза из засады',
        description:
          '**Прыжок из засады.** В начале вашего первого хода в каждом бою ваша скорость увеличивается на 10 футов до конца хода.\n\n**Бонус к инициативе.** К броскам инициативы вы добавляете модификатор Мудрости.',
        action: 'passive',
        iconName: 'shadow-grasp',
        effects: [{ type: 'initiative', amount: (ctx) => ctx.modifier('wisdom') }],
      },
      {
        id: 'gloom-stalker.dreadful-strike',
        name: 'Ужасающий удар',
        description:
          'Попав по существу оружием, вы можете нанести ему дополнительно 2к6 психического урона (2к8 с 11-го уровня); не чаще раза в ход. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'passive',
        resource: { id: 'gloom-stalker.dreadful-strike', name: 'Ужасающий удар', max: modifierOf('wisdom'), recharge: 'long' },
        damage: (ctx) => (ctx.classLevel >= 11 ? '2d8' : '2d6'),
        damageType: 'Психический',
        iconName: 'terror',
      },
      {
        id: 'gloom-stalker.umbral-sight',
        name: 'Теневой взор',
        description:
          'Вы получаете тёмное зрение на 60 футов (если оно уже есть — его дальность растёт на 60 футов). Пока вы целиком в темноте, существо, видящее вас там только тёмным зрением, считает вас невидимым.',
        iconName: 'hooded-figure',
      },
    ],
    7: [
      {
        id: 'gloom-stalker.iron-mind',
        name: 'Железный разум',
        description: 'Вы получаете владение спасбросками Мудрости (если оно уже есть — спасбросками Интеллекта или Харизмы на выбор).',
        iconName: 'brain',
        effects: [{ type: 'save', attribute: 'wisdom' }],
      },
    ],
    11: [
      {
        id: 'gloom-stalker.stalkers-flurry',
        name: 'Охотничья ярость',
        description:
          'Урон Ужасающего удара становится 2к8. Используя его, вы можете добавить эффект:\n\n- **Внезапный удар:** ещё одна атака тем же оружием по другому существу в пределах 5 футов от цели и в досягаемости оружия;\n- **Террор:** цель и существа в пределах 10 футов от неё совершают спасбросок Мудрости против СЛ ваших заклинаний или испуганы до начала вашего следующего хода.',
        action: 'passive',
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'sword-spin',
      },
    ],
    15: [
      {
        id: 'gloom-stalker.shadowy-dodge',
        name: 'Теневое уклонение',
        description: 'Когда существо совершает бросок атаки по вам, вы можете реакцией наложить на него помеху. После атаки (попала она или нет) вы можете телепортироваться в видимое незанятое место в пределах 30 футов.',
        action: 'reaction',
        iconName: 'dodging',
      },
    ],
  },
};

const option = (id: string, name: string, description: string, iconName: string, extra: Partial<FeatureDef> = {}): OptionDef => ({
  id,
  name,
  description,
  features: [{ id: `hunter.${id}`, name, description, action: 'passive', iconName, ...extra }],
});

const hunter: SubclassDef = {
  id: 'hunter',
  name: 'Охотник',
  description: 'Защитник природы и народов, который изучает добычу и бьёт туда, где она слабее всего.',
  levels: {
    3: [
      {
        id: 'hunter.hunters-lore',
        name: 'Знания охотника',
        description: 'Пока существо помечено вашей «Меткой охотника», вы знаете, есть ли у него иммунитеты, сопротивления или уязвимости, и какие именно.',
        action: 'passive',
        iconName: 'all-seeing-eye',
      },
      {
        id: 'hunter.hunters-prey',
        name: 'Добыча охотника',
        description: 'Вы получаете одно умение на выбор. После короткого или продолжительного отдыха его можно сменить на другое.',
        hidden: true,
        choices: [
          {
            id: 'prey',
            label: 'Добыча охотника',
            count: 1,
            hint: 'Можно сменить после короткого или продолжительного отдыха.',
            options: {
              from: 'options',
              options: [
                option(
                  'colossus-slayer',
                  'Убийца колоссов',
                  'Попав атакой оружием по существу, у которого уже меньше максимума хитов, вы наносите ему дополнительно 1к8 урона того же оружия. Не чаще раза в ход.',
                  'giant',
                  { damage: '1d8' },
                ),
                option(
                  'horde-breaker',
                  'Сокрушитель орд',
                  'Раз в свой ход, атакуя оружием, вы можете совершить ещё одну атаку тем же оружием по другому существу в пределах 5 футов от первой цели и в досягаемости оружия, которое вы ещё не атаковали в этот ход.',
                  'axe-swing',
                ),
              ],
            },
          },
        ],
      },
    ],
    7: [
      {
        id: 'hunter.defensive-tactics',
        name: 'Оборонительная тактика',
        description: 'Вы получаете одно умение на выбор. После короткого или продолжительного отдыха его можно сменить на другое.',
        hidden: true,
        choices: [
          {
            id: 'tactics',
            label: 'Оборонительная тактика',
            count: 1,
            hint: 'Можно сменить после короткого или продолжительного отдыха.',
            options: {
              from: 'options',
              options: [
                option('escape-the-horde', 'Побег от орды', 'Провоцированные атаки по вам совершаются с помехой.', 'run'),
                option(
                  'multiattack-defense',
                  'Защита от мультиатак',
                  'Когда существо попадает по вам броском атаки, все его последующие атаки по вам в этом ходу совершаются с помехой.',
                  'shield-reflect',
                ),
              ],
            },
          },
        ],
      },
    ],
    11: [
      {
        id: 'hunter.superior-hunters-prey',
        name: 'Добыча превосходного охотника',
        description: 'Раз в ход, нанося урон существу под вашей «Меткой охотника», вы можете нанести дополнительный урон этого заклинания и другому видимому существу в пределах 30 футов от первого.',
        action: 'passive',
        iconName: 'sword-clash',
      },
    ],
    15: [
      {
        id: 'hunter.superior-hunters-defense',
        name: 'Защита превосходного охотника',
        description: 'Получая урон, вы можете реакцией получить сопротивление этому урону и всему урону того же вида до конца текущего хода.',
        action: 'reaction',
        iconName: 'energy-shield',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Subclasses of the supplement books
// ------------------------------------------------------------------------------------------------

const winterWalker: SubclassDef = {
  id: 'winter-walker',
  name: 'Зимний ходок',
  description: 'Безжалостный охотник ледяных пустошей: мороз защищает его, сковывает добычу и со временем делает его самого ужасом льдов.',
  source: 'Forgotten Realms: Heroes of Faerûn',
  alwaysPrepared: {
    3: ['ice-knife'],
    5: ['hold-person'],
    9: ['remove-curse'],
    13: ['ice-storm'],
    17: ['cone-of-cold'],
  },
  levels: {
    3: [
      {
        id: 'winter-walker.frigid-explorer',
        name: 'Ледяной исследователь',
        description:
          '**Кусачий холод.** Урон ваших атак оружием, заклинаний и умений следопыта игнорирует сопротивление холоду.\n\n**Сопротивление морозу.** Вы получаете сопротивление урону холодом.\n\n**Полярные удары.** Попав по существу атакой оружием, вы можете нанести ему дополнительно 1к4 урона холодом (1к6 с 11-го уровня); каждое существо — не чаще раза в ход.',
        action: 'passive',
        damage: (ctx) => (ctx.classLevel >= 11 ? '1d6' : '1d4'),
        damageType: 'Холод',
        effects: [{ type: 'resistance', damageType: 'Холод' }],
        iconName: 'snowflake-2',
        color: '#7fb8d9',
      },
      {
        id: 'winter-walker.hunters-rime',
        name: 'Изморозь охотника',
        description:
          'Сотворяя «Метку охотника», вы получаете временные хиты: 1к10 + уровень следопыта. Пока существо под вашей «Меткой охотника», оно не может совершать действие «Отход».',
        action: 'passive',
        damage: (ctx) => `1d10+${ctx.classLevel}`,
        iconName: 'frozen-body',
      },
    ],
    7: [
      {
        id: 'winter-walker.fortifying-soul',
        name: 'Укрепляющий дух',
        description:
          'Действием «Магия» вы выбираете видимых существ — не больше модификатора Мудрости (минимум одно). Каждое восстанавливает 1к10 + уровень следопыта хитов и в течение часа совершает с преимуществом спасброски, чтобы избежать или окончить состояние «Испуганный». Раз в продолжительный отдых.',
        action: 'action',
        resource: { id: 'winter-walker.fortifying-soul', name: 'Укрепляющий дух', max: 1, recharge: 'long' },
        damage: (ctx) => `1d10+${ctx.classLevel}`,
        damageType: 'Лечение',
        iconName: 'heart-plus',
      },
    ],
    11: [
      {
        id: 'winter-walker.chilling-retribution',
        name: 'Выстужающее возмездие',
        description:
          'Когда существо попадает по вам броском атаки, вы можете реакцией заставить его совершить спасбросок Мудрости против СЛ ваших заклинаний. При провале оно ошеломлено до конца вашего следующего хода, и пока оно ошеломлено, его скорость равна 0. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'winter-walker.chilling-retribution', name: 'Выстужающее возмездие', max: modifierOf('wisdom'), recharge: 'long' },
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'ice-bolt',
      },
    ],
    15: [
      {
        id: 'winter-walker.frozen-haunt',
        name: 'Морозный призрак',
        description:
          'Сотворяя «Метку охотника», вы можете принять призрачную форму, подобную падающему снегу, на время действия заклинания:\n\n- **Душа мороза.** Иммунитет к урону холодом. При входе в форму и в начале каждого вашего хода выбранные вами существа в 15-футовой эманации от вас получают 2к4 урона холодом.\n- **Частичная бестелесность.** Иммунитет к состояниям «Опрокинутый», «Опутанный» и «Схваченный». Вы проходите сквозь существ и предметы как по труднопроходимой местности; закончив ход внутри них, получаете 1к10 силового урона, а если форма кончается внутри — выталкиваетесь в ближайшее свободное пространство.\n\nРаз в продолжительный отдых; использование можно вернуть, потратив ячейку 4-го круга или выше (без действия).',
        action: 'passive',
        resource: { id: 'winter-walker.frozen-haunt', name: 'Морозный призрак', max: 1, recharge: 'long' },
        damage: '2d4',
        damageType: 'Холод',
        iconName: 'frozen-orb',
        color: '#7fb8d9',
      },
    ],
  },
};

const hollowWarden: SubclassDef = {
  id: 'hollow-warden',
  name: 'Страж пустошей',
  description: 'Чудовищный защитник диких мест, черпающий силу у древних ужасов: в ярости покрывается корой и рогами и наводит страх на врагов.',
  source: 'Ravenloft: The Horrors Within',
  alwaysPrepared: {
    3: ['wrathful-smite'],
    5: ['alter-self'],
    9: ['phantom-steed'],
    13: ['dominate-beast'],
    17: ['steel-wind-strike'],
  },
  levels: {
    3: [
      {
        id: 'hollow-warden.wild-rage',
        name: 'Ярость дикой природы',
        description:
          'Бонусным действием вы тратите одно использование Избранного врага и на 1 минуту принимаете призрачную звериную форму (она кончается раньше, если вы недееспособны, умерли или прекратили её без действия):\n\n- **Древняя броня.** +1 к КД (+2 с 11-го уровня).\n- **Рыскающее возмездие.** Сразу после того, как видимое вами существо в пределах 5 футов наносит урон вам или союзнику, вы можете совершить по нему провоцированную атаку.\n- **Пугающая аура.** При превращении и в начале каждого вашего хода выбранные вами существа в 10-футовой эманации совершают спасбросок Мудрости против СЛ ваших заклинаний; при провале они испуганы до начала вашего следующего хода.',
        action: 'bonus',
        usesResource: { id: FAVORED_ENEMY },
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'tribal-mask',
        color: '#6b8f4e',
      },
    ],
    7: [
      {
        id: 'hollow-warden.hungering-might',
        name: 'Алчущая мощь',
        description:
          'К спасброскам Телосложения вы добавляете модификатор Мудрости (минимум +1). Раз в ход, попав по существу броском атаки, пока вы в Ярости дикой природы и окровавлены, вы восстанавливаете 1к10 + модификатор Мудрости хитов.',
        action: 'passive',
        damage: (ctx) => plus('1d10', ctx.modifier('wisdom')),
        damageType: 'Лечение',
        iconName: 'bleeding-wound',
      },
    ],
    11: [
      {
        id: 'hollow-warden.rot-and-cruelty',
        name: 'Гниль и жестокость',
        description:
          'Пока вы в Ярости дикой природы:\n\n- **Ужасающая аура.** Существо, проваливающее спасбросок от Пугающей ауры, также не может восстанавливать хиты и совершать реакции до начала вашего следующего хода.\n- **Цепляющиеся корни.** Попав по существу атакой оружием, вы можете применить свойство мастерства «Замедляющее» или «Ослабляющее» вдобавок к свойству мастерства этого оружия.',
        action: 'passive',
        iconName: 'tree-roots',
      },
    ],
    15: [
      {
        id: 'hollow-warden.ancient-might',
        name: 'Древняя мощь',
        description:
          '- **Зловещие удары.** Попадая броском атаки по испуганному существу, вы наносите дополнительный урон, равный модификатору Мудрости.\n- **Неугасающая ярость.** Если в Ярости дикой природы ваши хиты опускаются до 0, но вы не убиты мгновенно, вместо этого они становятся равны удвоенному уровню следопыта. Раз в продолжительный отдых; использование можно вернуть, потратив ячейку 4-го круга или выше (без действия).\n- **Вневременной.** Иммунитет к истощению.',
        action: 'passive',
        resource: { id: 'hollow-warden.undying-fury', name: 'Неугасающая ярость', max: 1, recharge: 'long', iconName: 'dread-skull' },
        iconName: 'dread-skull',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

/** The ranger's level-2 Fighting Style: a Fighting Style feat or Druidic Warrior (two druid cantrips). */
const fightingStyle: FeatureDef = {
  id: 'ranger.fighting-style',
  name: 'Боевой стиль',
  iconName: 'crossed-swords',
  description: 'Вы получаете черту боевого стиля на свой выбор или становитесь Воином-друидом: изучаете два заговора друида, которые творите Мудростью.',
  choices: [
    {
      id: 'style',
      label: 'Боевой стиль',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'feat',
            name: 'Черта боевого стиля',
            description: 'Черта из категории «Боевой стиль».',
            features: [
              {
                id: 'ranger.fighting-style-feat',
                name: 'Черта боевого стиля',
                description: '',
                hidden: true,
                choices: [{ id: 'feat', label: 'Черта боевого стиля', count: 1, options: { from: 'feats', categories: ['fightingStyle'] } }],
              },
            ],
          },
          {
            id: 'druidic-warrior',
            name: 'Воин-друид',
            description: 'Два заговора из списка друида; заклинательная характеристика — Мудрость.',
            features: [
              {
                id: 'ranger.druidic-warrior',
                name: 'Воин-друид',
                iconName: 'sprout',
                description: 'Вы знаете два заговора друида (рекомендуются «Наставление» и «Звёздный светлячок»), они считаются для вас заклинаниями следопыта и творятся Мудростью. Повышая уровень следопыта, можно заменить один из них другим заговором друида.',
                choices: [
                  { id: 'cantrips', label: 'Заговоры друида (2)', count: 2, spellAbility: 'wisdom', options: { from: 'spells', lists: ['druid'], maxLevel: 0 } },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

export const RANGER: ClassDef = {
  id: 'ranger',
  name: 'Следопыт',
  description: 'Странствующий воин, использующий магию природы: выслеживает добычу, метит её и не даёт уйти.',
  hitDie: 10,
  primary: ['dexterity', 'wisdom'],
  saves: ['strength', 'dexterity'],
  skillChoices: { count: 3, list: ['athletics', 'perception', 'survival', 'animalHandling', 'nature', 'insight', 'investigation', 'stealth'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
  ],
  subclassLevel: 3,
  subclasses: [beastMaster, feyWanderer, gloomStalker, hunter, winterWalker, hollowWarden],
  startingEquipment: RANGER_KITS,
  spellcasting: {
    ability: 'wisdom',
    list: 'ranger',
    slots: HALF_CASTER_SLOTS,
    mode: 'prepared',
    prepared: byTable([2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]),
  },
  levels: {
    1: [
      {
        id: 'ranger.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания следопыта Мудростью (СЛ = 8 + бонус мастерства + модификатор Мудрости; бонус атаки = бонус мастерства + модификатор Мудрости), фокусировка — друидическая. Ячейки возвращаются после продолжительного отдыха. После продолжительного отдыха можно заменить одно подготовленное заклинание; их число растёт с уровнем.',
        action: 'passive',
        iconName: 'oak-leaf',
      },
      {
        id: 'ranger.favored-enemy',
        name: 'Избранный враг',
        description:
          'Заклинание «Метка охотника» у вас всегда подготовлено. Вы можете сотворить его без ячейки 2 раза (3 с 5-го уровня, 4 с 9-го, 5 с 13-го, 6 с 17-го); использования возвращаются после продолжительного отдыха.',
        action: 'passive',
        resource: {
          id: FAVORED_ENEMY,
          name: 'Метка охотника без ячейки',
          max: byClassLevel({ 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 }),
          recharge: 'long',
          iconName: 'crosshair',
        },
        effects: [{ type: 'spell', spell: 'hunters-mark', alwaysPrepared: true }],
        iconName: 'crosshair',
      },
      {
        id: 'ranger.weapon-mastery',
        name: 'Оружейное мастерство',
        iconName: 'bow-arrow',
        description: 'Вы используете свойства мастерства двух видов оружия, которыми владеете. После продолжительного отдыха выбор можно изменить.',
        choices: [weaponMasteryChoice(2, 'Оружейное мастерство (2)')],
      },
    ],
    2: [
      {
        id: 'ranger.deft-explorer',
        name: 'Искусный исследователь',
        description: 'Вы получаете экспертность в одном навыке, которым владеете, и изучаете два языка на выбор.',
        iconName: 'compass',
        choices: [
          { id: 'expertise', label: 'Экспертность', count: 1, options: { from: 'expertise' } },
          { id: 'languages', label: 'Языки (2)', count: 2, options: { from: 'languages' } },
        ],
      },
      fightingStyle,
    ],
    3: [subclassHeading('ranger', 'Подкласс следопыта', 'Вы выбираете специализацию следопыта, которая даёт умения на 3, 7, 11 и 15 уровнях.')],
    4: [abilityScoreImprovement('ranger', 4)],
    5: [
      {
        id: 'ranger.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая действие «Атака» в свой ход, вы атакуете дважды вместо одного раза.',
        action: 'passive',
        iconName: 'arrow-cluster',
      },
    ],
    6: [
      {
        id: 'ranger.roving',
        name: 'Вездеходность',
        description: 'Пока вы не носите тяжёлый доспех, ваша скорость увеличивается на 10 футов. Вы также получаете скорость лазания и плавания, равные вашей скорости.',
        iconName: 'footprint',
        effects: [{ type: 'speed', amount: 10 }],
      },
    ],
    8: [abilityScoreImprovement('ranger', 8)],
    9: [
      {
        id: 'ranger.expertise',
        name: 'Экспертность',
        description: 'Вы получаете экспертность в двух навыках, которыми владеете, но без экспертности.',
        iconName: 'wisdom',
        choices: [{ id: 'expertise', label: 'Экспертность (2)', count: 2, options: { from: 'expertise' } }],
      },
    ],
    10: [
      {
        id: 'ranger.tireless',
        name: 'Неутомимость',
        description:
          'Действием «Магия» вы получаете временные хиты: 1к8 + модификатор Мудрости (минимум 1). Использований — модификатор Мудрости (минимум 1) за продолжительный отдых. Каждый короткий отдых снижает ваше истощение на 1 уровень.',
        action: 'action',
        resource: { id: 'ranger.tireless', name: 'Неутомимость', max: modifierOf('wisdom'), recharge: 'long' },
        damage: (ctx) => plus('1d8', ctx.modifier('wisdom')),
        iconName: 'regeneration',
      },
    ],
    12: [abilityScoreImprovement('ranger', 12)],
    13: [
      {
        id: 'ranger.relentless-hunter',
        name: 'Неустанный охотник',
        description: 'Получение урона не может нарушить вашу концентрацию на «Метке охотника».',
        action: 'passive',
        iconName: 'arrow-scope',
      },
    ],
    14: [
      {
        id: 'ranger.natures-veil',
        name: 'Завеса природы',
        description: 'Бонусным действием вы становитесь невидимым до конца своего следующего хода. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'bonus',
        resource: { id: 'ranger.natures-veil', name: 'Завеса природы', max: modifierOf('wisdom'), recharge: 'long' },
        iconName: 'leaf-swirl',
      },
    ],
    16: [abilityScoreImprovement('ranger', 16)],
    17: [
      {
        id: 'ranger.precise-hunter',
        name: 'Меткий охотник',
        description: 'Вы совершаете с преимуществом атаки по существу под вашей «Меткой охотника».',
        action: 'passive',
        iconName: 'high-shot',
      },
    ],
    18: [
      {
        id: 'ranger.feral-senses',
        name: 'Дикие чувства',
        description: 'Вы получаете слепое зрение на 30 футов.',
        iconName: 'beast-eye',
      },
    ],
    19: [epicBoon('ranger')],
    20: [
      {
        id: 'ranger.foe-slayer',
        name: 'Истребитель врагов',
        description: 'Кость урона вашей «Метки охотника» становится к10 вместо к6.',
        action: 'passive',
        damage: '1d10',
        iconName: 'eye-target',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const RANGER_ICONS = {
  class: 'archer',
  subclasses: {
    'beast-master': 'bear-head',
    'fey-wanderer': 'fairy-wings',
    'gloom-stalker': 'shadow-follower',
    hunter: 'hunter-eyes',
    'winter-walker': 'snowflake-1',
    'hollow-warden': 'deer',
  } as Record<string, string>,
};
