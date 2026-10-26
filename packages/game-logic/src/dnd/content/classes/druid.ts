import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, Effect, FeatureDef, KitOption, OptionDef, SubclassDef } from '../../types';
import { WILD_SHAPE } from '../beasts';
import { FULL_CASTER_SLOTS, abilityScoreImprovement, byTable, epicBoon, subclassHeading } from './shared';

/** Друид of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

/** Spell save DC of the druid: subclass effects use it too. */
const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('wisdom');

/** "+N" / "-N" for a modifier added to dice ("1d8+3"). */
const plus = (modifier: number) => (modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`);

/** A subclass effect that spends a use of Wild Shape. */
const wildShapeOption = (id: string, name: string, description: string, extra: Partial<FeatureDef> = {}): FeatureDef => ({
  id,
  name,
  description,
  action: 'action',
  usesResource: { id: WILD_SHAPE },
  iconName: 'paw',
  ...extra,
});

const DRUID_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'leather-armor' },
      { ref: 'shield' },
      { ref: 'sickle' },
      // The Druidic Focus of the kit is a quarterstaff.
      { ref: 'quarterstaff' },
      { ref: 'explorers-pack' },
      { ref: 'herbalism-kit' },
    ],
    gold: 9,
  },
  { id: 'b', label: 'B', items: [], gold: 50 },
];

// ------------------------------------------------------------------------------------------------
// Circle of the Land
// ------------------------------------------------------------------------------------------------

interface LandType {
  id: string;
  name: string;
  /** Circle spells by druid level 3, 5, 7, 9. */
  spells: Record<number, string[]>;
  /** Resistance of Nature's Ward (level 10). */
  resistance: string;
  resistanceName: string;
}

const LANDS: LandType[] = [
  {
    id: 'arid',
    name: 'Засушливая местность',
    spells: { 3: ['blur', 'burning-hands', 'fire-bolt'], 5: ['fireball'], 7: ['blight'], 9: ['wall-of-stone'] },
    resistance: 'Огонь',
    resistanceName: 'огню',
  },
  {
    id: 'polar',
    name: 'Полярная местность',
    spells: { 3: ['fog-cloud', 'hold-person', 'ray-of-frost'], 5: ['sleet-storm'], 7: ['ice-storm'], 9: ['cone-of-cold'] },
    resistance: 'Холод',
    resistanceName: 'холоду',
  },
  {
    id: 'temperate',
    name: 'Умеренная местность',
    spells: { 3: ['misty-step', 'shocking-grasp', 'sleep'], 5: ['lightning-bolt'], 7: ['freedom-of-movement'], 9: ['tree-stride'] },
    resistance: 'Электричество',
    resistanceName: 'электричеству',
  },
  {
    id: 'tropical',
    name: 'Тропическая местность',
    spells: { 3: ['acid-splash', 'ray-of-sickness', 'web'], 5: ['stinking-cloud'], 7: ['polymorph'], 9: ['insect-plague'] },
    resistance: 'Яд',
    resistanceName: 'яду',
  },
];

const landOption = (land: LandType): OptionDef => ({
  id: land.id,
  name: land.name,
  description: `Заклинания круга по уровням друида 3/5/7/9; с 10-го уровня — сопротивление ${land.resistanceName}.`,
  effects: (ctx): Effect[] => [
    ...Object.entries(land.spells)
      .filter(([level]) => ctx.classLevel >= Number(level))
      .flatMap(([, ids]) => ids.map((spell): Effect => ({ type: 'spell', spell, alwaysPrepared: true }))),
    ...(ctx.classLevel >= 10 ? [{ type: 'resistance', damageType: land.resistance } as Effect] : []),
  ],
});

const land: SubclassDef = {
  id: 'circle-of-the-land',
  name: 'Круг земли',
  description: 'Мистик и хранитель древних обрядов: заклинания круга меняются вместе с местностью, а сила земли лечит и вытягивает жизнь.',
  levels: {
    3: [
      {
        id: 'land.circle-spells',
        name: 'Заклинания круга земли',
        description:
          'После каждого продолжительного отдыха вы выбираете тип местности: засушливую, полярную, умеренную или тропическую. Заклинания этой местности всегда у вас подготовлены с указанного уровня друида:\n\n- **Засушливая:** 3 — «Огненные ладони», «Огненный снаряд», «Размытый образ»; 5 — «Огненный шар»; 7 — «Усыхание»; 9 — «Каменная стена».\n- **Полярная:** 3 — «Луч холода», «Туманное облако», «Удержание личности»; 5 — «Метель»; 7 — «Град»; 9 — «Конус холода».\n- **Умеренная:** 3 — «Туманный шаг», «Усыпление», «Электрошок»; 5 — «Молния»; 7 — «Свобода перемещения»; 9 — «Древесный путь».\n- **Тропическая:** 3 — «Брызги кислоты», «Луч болезни», «Паутина»; 5 — «Зловонное облако»; 7 — «Превращение»; 9 — «Нашествие насекомых».',
        iconName: 'tree-roots',
        choices: [{ id: 'land', label: 'Тип местности', count: 1, options: { from: 'options', options: LANDS.map(landOption) } }],
      },
      wildShapeOption(
        'land.lands-aid',
        'Помощь земли',
        'Действием «Магия» вы тратите Дикий облик: в сфере радиусом 10 футов с центром в точке в пределах 60 футов выбранные существа совершают спасбросок Телосложения — 2к6 некротического урона при провале, половина при успехе; одно существо в сфере на ваш выбор восстанавливает 2к6 хитов. Урон и лечение — 3к6 с 10-го уровня, 4к6 с 14-го.',
        {
          damage: (ctx) => `${ctx.classLevel >= 14 ? 4 : ctx.classLevel >= 10 ? 3 : 2}d6`,
          damageType: 'Некротический',
          saveAttribute: 'constitution',
          saveDC: spellDC,
          iconName: 'thorny-vine',
        },
      ),
    ],
    6: [
      {
        id: 'land.natural-recovery',
        name: 'Естественное восстановление',
        description: 'Одно подготовленное заклинание круга земли 1-го круга или выше вы можете сотворить без траты ячейки. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'land.natural-recovery', name: 'Заклинание круга без ячейки', max: 1, recharge: 'long' },
        iconName: 'sprout',
      },
      {
        id: 'land.natural-recovery-slots',
        name: 'Восстановление ячеек',
        description: 'Закончив короткий отдых, вы восстанавливаете потраченные ячейки суммарным кругом не больше половины уровня друида (округляя вверх), ни одна — не 6-го круга и выше. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'land.natural-recovery-slots', name: 'Восстановление ячеек', max: 1, recharge: 'long' },
        iconName: 'ground-sprout',
      },
    ],
    10: [
      {
        id: 'land.natures-ward',
        name: 'Покровительство природы',
        description: 'Вы не можете стать Отравленным. Вы получаете сопротивление урону по выбранному типу местности: засушливая — огонь, полярная — холод, умеренная — электричество, тропическая — яд.',
        iconName: 'oak',
      },
    ],
    14: [
      wildShapeOption(
        'land.natures-sanctuary',
        'Природное убежище',
        'Действием «Магия» вы тратите Дикий облик: призрачные деревья и лозы заполняют куб 15 футов на земле в пределах 120 футов на 1 минуту (пока вы дееспособны). Вы и союзники в нём имеете укрытие на половину, а союзники получают сопротивление вашего Покровительства природы. Бонусным действием куб можно переместить на 60 футов (в пределах 120 футов от вас).',
        { iconName: 'forest' },
      ),
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Circle of the Moon
// ------------------------------------------------------------------------------------------------

const moon: SubclassDef = {
  id: 'circle-of-the-moon',
  name: 'Круг луны',
  description: 'Изменчивый, как луна, оборотень: сильные звериные облики, лунный свет в когтях и шаги сквозь сияние.',
  alwaysPrepared: {
    3: ['cure-wounds', 'moonbeam', 'starry-wisp'],
    5: ['conjure-animals'],
    7: ['fount-of-moonlight'],
    9: ['mass-cure-wounds'],
  },
  levels: {
    3: [
      {
        id: 'moon.circle-forms',
        name: 'Облики круга',
        description:
          'Принимая Дикий облик, вы получаете:\n\n- **Опасность.** Максимальный показатель опасности облика — уровень друида / 3 (округляя вниз).\n- **Класс защиты.** Пока вы в облике, ваш КЗ равен 13 + модификатор Мудрости, если это больше КЗ зверя.\n- **Временные хиты.** Уровень друида × 3.\n\nЗаклинания круга луны вы можете творить и в Диком облике.',
        action: 'passive',
        effects: [
          {
            type: 'wildShape',
            armorClass: (ctx) => 13 + ctx.modifier('wisdom'),
            tempHPMultiplier: 3,
            maxCR: (ctx) => Math.floor(ctx.classLevel / 3),
          },
        ],
        iconName: 'moon-claws',
      },
    ],
    6: [
      {
        id: 'moon.improved-circle-forms',
        name: 'Улучшенные облики круга',
        description: 'В Диком облике:\n\n- **Лунное сияние.** При каждом попадании атакой облика вы выбираете, нанести урон её обычного типа или излучением.\n- **Повышенная устойчивость.** Вы прибавляете модификатор Мудрости к спасброскам Телосложения.',
        action: 'passive',
        iconName: 'moon',
      },
    ],
    10: [
      {
        id: 'moon.moonlight-step',
        name: 'Шаг в лунный свет',
        description:
          'Бонусным действием вы телепортируетесь в видимое незанятое пространство в пределах 30 футов, и ваш следующий бросок атаки в этот ход совершается с преимуществом. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых; каждое можно вернуть, потратив ячейку 2-го круга или выше (без действия).',
        action: 'bonus',
        resource: { id: 'moon.moonlight-step', name: 'Шаг в лунный свет', max: modifierOf('wisdom'), recharge: 'long' },
        iconName: 'moon-orbit',
        color: '#b9c6e8',
      },
    ],
    14: [
      {
        id: 'moon.lunar-form',
        name: 'Лунный облик',
        description:
          '- **Улучшенное лунное сияние.** Раз в ход, попав атакой Дикого облика, вы наносите цели дополнительно 2к10 урона излучением.\n- **Разделённый лунный свет.** Используя Шаг в лунный свет, вы можете также телепортировать согласное существо в пределах 10 футов в видимое незанятое пространство в пределах 10 футов от места своего прибытия.',
        action: 'passive',
        damage: '2d10',
        damageType: 'Лучистый',
        iconName: 'night-sky',
        color: '#b9c6e8',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Circle of the Sea
// ------------------------------------------------------------------------------------------------

const sea: SubclassDef = {
  id: 'circle-of-the-sea',
  name: 'Круг моря',
  description: 'Воплощение гнева океанов и штормов: брызги ледяной воды отбрасывают врагов, а буря несёт друида по воздуху.',
  alwaysPrepared: {
    3: ['fog-cloud', 'gust-of-wind', 'ray-of-frost', 'shatter', 'thunderwave'],
    5: ['lightning-bolt', 'water-breathing'],
    7: ['control-water', 'ice-storm'],
    9: ['conjure-elemental', 'hold-monster'],
  },
  levels: {
    3: [
      wildShapeOption(
        'sea.wrath-of-the-sea',
        'Гнев моря',
        'Бонусным действием вы тратите Дикий облик и окружаете себя эманацией океанских брызг 5 футов на 10 минут (кончается, если вы её отмените, создадите снова или станете Недееспособным). При создании и бонусным действием в следующие ходы вы выбираете видимое существо в эманации: оно совершает спасбросок Телосложения или получает урон холодом — к6 в количестве модификатора Мудрости (минимум 1) — и, если оно Большое или меньше, отталкивается от вас на 15 футов.',
        {
          action: 'bonus',
          damage: (ctx) => `${Math.max(1, ctx.modifier('wisdom'))}d6`,
          damageType: 'Холод',
          saveAttribute: 'constitution',
          saveDC: spellDC,
          iconName: 'wave-strike',
          color: '#5aa7c9',
        },
      ),
    ],
    6: [
      {
        id: 'sea.aquatic-affinity',
        name: 'Связь с водами',
        description: 'Эманация Гнева моря увеличивается до 10 футов. Вы получаете скорость плавания, равную скорости ходьбы.',
        action: 'passive',
        iconName: 'water-splash',
      },
    ],
    10: [
      {
        id: 'sea.stormborn',
        name: 'Рождённый бурей',
        description: 'Пока действует Гнев моря, вы имеете скорость полёта, равную скорости ходьбы, и сопротивление урону звуком, холодом и электричеством.',
        action: 'passive',
        iconName: 'lightning-storm',
      },
    ],
    14: [
      {
        id: 'sea.oceanic-gift',
        name: 'Дар океана',
        description: 'Эманацию Гнева моря вы можете создать вокруг согласного существа в пределах 60 футов вместо себя: оно получает все её преимущества и использует вашу СЛ заклинаний и модификатор Мудрости. Потратив два использования Дикого облика вместо одного, вы создаёте эманацию и вокруг него, и вокруг себя.',
        action: 'passive',
        iconName: 'wave-crest',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Circle of the Stars
// ------------------------------------------------------------------------------------------------

const starryDie = (ctx: BuildContext) => (ctx.classLevel >= 10 ? '2d8' : '1d8');

const stars: SubclassDef = {
  id: 'circle-of-the-stars',
  name: 'Круг звёзд',
  description: 'Звездочёт, подчиняющий силы космоса: звёздная карта, сияющий облик созвездий и знамения, меняющие судьбу.',
  levels: {
    3: [
      {
        id: 'stars.star-map',
        name: 'Звёздная карта',
        description:
          'У вас есть звёздная карта — Крошечный предмет, служащий фокусировкой для заклинаний друида. Пока вы её держите, у вас подготовлены «Наставление» и «Направляющий снаряд», и «Направляющий снаряд» можно сотворить без ячейки — столько раз, каков модификатор Мудрости (минимум 1), за продолжительный отдых. Потерянную карту можно воссоздать часовым обрядом во время короткого или продолжительного отдыха.',
        action: 'passive',
        resource: { id: 'stars.star-map', name: 'Направляющий снаряд без ячейки', max: modifierOf('wisdom'), recharge: 'long' },
        effects: [
          { type: 'spell', spell: 'guidance', alwaysPrepared: true },
          { type: 'spell', spell: 'guiding-bolt', alwaysPrepared: true },
        ],
        iconName: 'compass',
      },
      wildShapeOption(
        'stars.starry-form',
        'Звёздный облик',
        'Бонусным действием вы тратите Дикий облик и вместо превращения в зверя принимаете Звёздный облик на 10 минут: тело светится (яркий свет 10 футов и тусклый ещё 10), игровая статистика не меняется. Облик кончается, если вы выйдете из него (без действия), станете Недееспособным или используете умение снова. Каждый раз вы выбираете созвездие: Лучник, Чаша или Дракон.',
        { action: 'bonus', iconName: 'star-formation', color: '#c9b8f2' },
      ),
      {
        id: 'stars.archer',
        name: 'Звёздный облик: Лучник',
        description: 'При принятии облика и бонусным действием в следующие ходы вы совершаете дальнобойную атаку заклинанием светящейся стрелой по существу в пределах 60 футов: 1к8 + модификатор Мудрости урона излучением (2к8 с 10-го уровня).',
        action: 'bonus',
        damage: (ctx) => `${starryDie(ctx)}${plus(ctx.modifier('wisdom'))}`,
        damageType: 'Лучистый',
        iconName: 'archer',
        color: '#c9b8f2',
      },
      {
        id: 'stars.chalice',
        name: 'Звёздный облик: Чаша',
        description: 'Когда вы творите с ячейкой заклинание, восстанавливающее хиты, вы или другое существо в пределах 30 футов восстанавливаете 1к8 + модификатор Мудрости хитов (2к8 с 10-го уровня).',
        action: 'passive',
        damage: (ctx) => `${starryDie(ctx)}${plus(ctx.modifier('wisdom'))}`,
        damageType: 'Лечение',
        iconName: 'fire-bowl',
        color: '#7fc98a',
      },
      {
        id: 'stars.dragon',
        name: 'Звёздный облик: Дракон',
        description: 'В проверках Интеллекта и Мудрости и спасбросках Телосложения для поддержания концентрации результат 9 или меньше на к20 считается 10. С 10-го уровня — ещё и скорость полёта 20 футов с возможностью парить.',
        action: 'passive',
        iconName: 'dragon-spiral',
      },
    ],
    6: [
      {
        id: 'stars.cosmic-omen',
        name: 'Космическое знамение',
        description:
          'После продолжительного отдыха бросьте любую кость; до следующего продолжительного отдыха вам доступна реакция, когда видимое существо в пределах 30 футов совершает тест к20:\n\n- **Благо (чётное).** Бросьте 1к6 и прибавьте к его результату.\n- **Напасть (нечётное).** Бросьте 1к6 и вычтите из его результата.\n\nИспользований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'stars.cosmic-omen', name: 'Космическое знамение', max: modifierOf('wisdom'), recharge: 'long' },
        damage: '1d6',
        iconName: 'cursed-star',
      },
    ],
    10: [
      {
        id: 'stars.twinkling-constellations',
        name: 'Мерцающие созвездия',
        description: 'Созвездия Звёздного облика усиливаются: 1к8 Лучника и Чаши становятся 2к8, Дракон даёт скорость полёта 20 футов и парение. В начале каждого своего хода в облике вы можете сменить созвездие.',
        action: 'passive',
        iconName: 'star-swirl',
      },
    ],
    14: [
      {
        id: 'stars.full-of-stars',
        name: 'Звёздное тело',
        description: 'В Звёздном облике вы частично бестелесны: сопротивление дробящему, колющему и рубящему урону.',
        action: 'passive',
        iconName: 'prism',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

const primalOrder: FeatureDef = {
  id: 'druid.primal-order',
  name: 'Природный орден',
  description: 'Вы посвящаете себя одной из священных ролей: Ведун или Страж.',
  iconName: 'oak',
  choices: [
    {
      id: 'order',
      label: 'Природный орден',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'magician',
            name: 'Ведун',
            description: 'Ещё один заговор друида и бонус модификатора Мудрости к проверкам Природы и Тайной магии.',
            features: [
              {
                id: 'druid.magician',
                name: 'Ведун',
                description: 'Вы знаете один дополнительный заговор друида. К проверкам Интеллекта (Природа и Тайная магия) вы прибавляете модификатор Мудрости (минимум +1).',
                iconName: 'fairy-wand',
                effects: [{ type: 'skillBonus', skills: ['arcana', 'nature'], amount: modifierOf('wisdom') }],
                choices: [
                  {
                    id: 'cantrip',
                    label: 'Заговор друида (1)',
                    count: 1,
                    pool: 'known-cantrips',
                    spellAbility: 'wisdom',
                    options: { from: 'spells', lists: ['druid'], maxLevel: 0 },
                  },
                ],
              },
            ],
          },
          {
            id: 'warden',
            name: 'Страж',
            description: 'Владение воинским оружием и тренированность со средними доспехами.',
            effects: [
              { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
              { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
            ],
          },
        ],
      },
    },
  ],
};

/** Elemental Fury of level 7, with what Improved Elemental Fury adds on level 15. */
const elementalFury: FeatureDef = {
  id: 'druid.elemental-fury',
  name: 'Ярость стихий',
  description: 'Через вас течёт мощь стихий: вы выбираете Мощные заклинания или Природный удар. С 15-го уровня выбранный вариант усиливается.',
  iconName: 'lightning-arc',
  choices: [
    {
      id: 'fury',
      label: 'Ярость стихий',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'potent-spellcasting',
            name: 'Мощные заклинания',
            description: 'К урону заговоров друида прибавляется модификатор Мудрости; с 15-го уровня их дистанция растёт на 300 футов.',
            features: [
              {
                id: 'druid.potent-spellcasting',
                name: 'Мощные заклинания',
                description: 'К урону, который вы наносите заговорами друида, прибавляется модификатор Мудрости.',
                action: 'passive',
                effects: [{ type: 'spellDamage', list: 'druid', cantrips: true, amount: (ctx) => ctx.modifier('wisdom') }],
                iconName: 'bolt-spell-cast',
              },
              {
                id: 'druid.improved-potent-spellcasting',
                name: 'Улучшенная ярость стихий',
                description: 'Заговор друида с дистанцией 10 футов и более получает дистанцию больше на 300 футов.',
                minLevel: 15,
                iconName: 'high-shot',
              },
            ],
          },
          {
            id: 'primal-strike',
            name: 'Природный удар',
            description: 'Раз в ход при попадании оружием или атакой Дикого облика — дополнительно 1к8 урона звуком, огнём, холодом или электричеством (2к8 с 15-го уровня).',
            features: [
              {
                id: 'druid.primal-strike',
                name: 'Природный удар',
                description: 'Раз в свой ход, попав по существу атакой оружием или атакой зверя в Диком облике, вы можете нанести ему дополнительно 1к8 урона звуком, огнём, холодом или электричеством (тип выбираете после попадания). С 15-го уровня — 2к8.',
                action: 'passive',
                damage: (ctx) => (ctx.classLevel >= 15 ? '2d8' : '1d8'),
                iconName: 'lightning-helix',
              },
              {
                id: 'druid.improved-primal-strike',
                name: 'Улучшенная ярость стихий',
                description: 'Дополнительный урон Природного удара возрастает до 2к8.',
                minLevel: 15,
                iconName: 'lightning-helix',
              },
            ],
          },
        ],
      },
    },
  ],
};

export const DRUID: ClassDef = {
  id: 'druid',
  name: 'Друид',
  description: 'Служитель природы, владеющий первобытной силой. Лечит, повелевает стихиями и принимает облик зверей.',
  hitDie: 8,
  primary: ['wisdom'],
  saves: ['intelligence', 'wisdom'],
  skillChoices: {
    count: 2,
    list: ['animalHandling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
  },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'tool', value: 'Набор травника' },
  ],
  subclassLevel: 3,
  subclasses: [land, moon, sea, stars],
  startingEquipment: DRUID_KITS,
  spellcasting: {
    ability: 'wisdom',
    list: 'druid',
    slots: FULL_CASTER_SLOTS,
    mode: 'prepared',
    prepared: byTable([4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]),
    cantrips: byClassLevel({ 1: 2, 4: 3, 10: 4 }),
  },
  levels: {
    1: [
      {
        id: 'druid.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания друида Мудростью (СЛ = 8 + бонус мастерства + модификатор Мудрости; бонус атаки = бонус мастерства + модификатор Мудрости), фокусировка — друидическая. Заговоры: 2, с 4-го уровня 3, с 10-го 4; на каждом уровне один можно заменить. После продолжительного отдыха вы меняете список подготовленных заклинаний; их число растёт с уровнем.',
        action: 'passive',
        iconName: 'spell-book',
      },
      {
        id: 'druid.druidic',
        name: 'Друидический язык',
        description: 'Вы знаете Друидический — тайный язык друидов, и у вас всегда подготовлено заклинание «Разговор с животными». Скрытые послания на Друидическом знающие замечают сразу; остальные — проверкой Интеллекта (Расследование) СЛ 15, но без магии не прочтут.',
        iconName: 'leaf-swirl',
        effects: [
          { type: 'proficiency', category: 'language', value: 'Друидический' },
          { type: 'spell', spell: 'speak-with-animals', alwaysPrepared: true },
        ],
      },
      primalOrder,
    ],
    2: [
      {
        id: 'druid.wild-shape',
        name: 'Дикий облик',
        description:
          'Бонусным действием вы превращаетесь в одного из известных вам зверей на (уровень друида / 2) часов — или пока не используете умение снова, не станете Недееспособным или не умрёте; вернуться можно бонусным действием. Принимая облик, вы получаете временные хиты, равные уровню друида.\n\n**Известные облики** (один можно заменить после продолжительного отдыха):\n\n- 2-й уровень: 4 облика, опасность до 1/4, без полёта;\n- 4-й уровень: 6 обликов, опасность до 1/2, без полёта;\n- 8-й уровень: 8 обликов, опасность до 1, полёт разрешён.\n\nВ облике статистика зверя заменяет вашу, но вы сохраняете хиты, кости хитов, Интеллект, Мудрость, Харизму, умения, языки, черты и владения навыками и спасбросками. Творить заклинания нельзя (уже наложенные и концентрация сохраняются).\n\nИспользований 2 (3 с 6-го уровня, 4 с 17-го); короткий отдых возвращает одно, продолжительный — все.',
        // The uses are spent by the forms: each known beast is its own ability on the sheet.
        action: 'passive',
        resource: {
          id: WILD_SHAPE,
          name: 'Дикий облик',
          max: byClassLevel({ 2: 2, 6: 3, 17: 4 }),
          recharge: 'long',
          shortRestRegain: 1,
          iconName: 'wolf-head',
        },
        choices: [
          {
            id: 'forms',
            label: 'Известные облики',
            count: byClassLevel({ 2: 4, 4: 6, 8: 8 }),
            pool: 'wild-shape-forms',
            onSheet: true,
            options: { from: 'beasts' },
            hint: 'Звери, в которых вы превращаетесь. Один облик можно заменить после продолжительного отдыха — прямо в карточке Дикого облика.',
          },
        ],
        iconName: 'wolf-head',
      },
      {
        id: 'druid.wild-companion',
        name: 'Дикий спутник',
        description: 'Действием «Магия» вы тратите ячейку заклинаний или использование Дикого облика и творите «Обретение фамильяра» без материальных компонентов. Фамильяр — фея и исчезает после вашего продолжительного отдыха.',
        action: 'action',
        usesResource: { id: WILD_SHAPE },
        iconName: 'raven',
      },
    ],
    3: [subclassHeading('druid', 'Подкласс друида', 'Вы выбираете круг друидов, который даёт умения на 3, 6, 10 и 14-м уровнях.')],
    4: [abilityScoreImprovement('druid', 4)],
    5: [
      {
        id: 'druid.wild-resurgence',
        name: 'Дикое восстановление',
        description: 'Раз в свой ход, если у вас не осталось Дикого облика, вы можете потратить ячейку заклинаний и вернуть одно его использование (без действия). Кроме того, вы можете потратить использование Дикого облика и получить ячейку 1-го круга (без действия) — раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'druid.wild-resurgence', name: 'Ячейка из Дикого облика', max: 1, recharge: 'long' },
        iconName: 'regeneration',
      },
    ],
    7: [elementalFury],
    8: [abilityScoreImprovement('druid', 8)],
    12: [abilityScoreImprovement('druid', 12)],
    16: [abilityScoreImprovement('druid', 16)],
    18: [
      {
        id: 'druid.beast-spells',
        name: 'Заклинания зверя',
        description: 'В Диком облике вы можете творить заклинания, кроме тех, чей материальный компонент имеет стоимость или расходуется.',
        action: 'passive',
        iconName: 'beast-eye',
      },
    ],
    19: [epicBoon('druid')],
    20: [
      {
        id: 'druid.archdruid',
        name: 'Архидруид',
        description:
          '- **Неувядающий дикий облик.** Бросая инициативу без оставшихся использований Дикого облика, вы восстанавливаете одно.\n- **Природный ворожей.** Без действия вы превращаете неистраченные использования Дикого облика в одну ячейку заклинаний: каждое даёт 2 круга (два использования — ячейка 4-го круга). Раз в продолжительный отдых.\n- **Долголетие.** За каждые десять лет вы стареете лишь на год.',
        action: 'passive',
        resource: { id: 'druid.nature-magician', name: 'Природный ворожей', max: 1, recharge: 'long' },
        iconName: 'tree-growth',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const DRUID_ICONS = {
  class: 'oak-leaf',
  subclasses: {
    'circle-of-the-land': 'mountains',
    'circle-of-the-moon': 'moon-claws',
    'circle-of-the-sea': 'wave-crest',
    'circle-of-the-stars': 'star-formation',
  } as Record<string, string>,
};
