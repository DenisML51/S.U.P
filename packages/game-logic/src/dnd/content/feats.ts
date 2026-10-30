import { proficiencyBonus } from '../helpers';
import type { AttributeId, ChoiceDef, Effect, FeatDef, OptionDef, SkillId, SpellListId } from '../types';
import { MUSICAL_INSTRUMENT_NAMES } from './equipment';

/**
 * Feats of the 2024 Player's Handbook: origin feats, general feats, Fighting Style feats and Epic
 * Boons. Names follow the dnd.su translation; descriptions are our own summaries of the rules.
 */

// ------------------------------------------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------------------------------------------

const ALL: AttributeId[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const MENTAL: AttributeId[] = ['intelligence', 'wisdom', 'charisma'];
const STR_DEX: AttributeId[] = ['strength', 'dexterity'];

const ATTRIBUTE_NAMES: Record<AttributeId, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Телосложение',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

const SKILL_NAMES: Record<SkillId, string> = {
  athletics: 'Атлетика',
  acrobatics: 'Акробатика',
  sleightOfHand: 'Ловкость рук',
  stealth: 'Скрытность',
  arcana: 'Магия',
  history: 'История',
  investigation: 'Анализ',
  nature: 'Природа',
  religion: 'Религия',
  animalHandling: 'Уход за животными',
  insight: 'Внимательность',
  medicine: 'Медицина',
  perception: 'Восприятие',
  survival: 'Выживание',
  deception: 'Обман',
  intimidation: 'Запугивание',
  performance: 'Выступление',
  persuasion: 'Убеждение',
};

const ALL_SKILLS = Object.keys(SKILL_NAMES) as SkillId[];
const ALL_SPELL_LISTS: SpellListId[] = ['wizard', 'cleric', 'druid', 'paladin'];

/** "+1 to one of …" of a half-feat (max 20) or an Epic Boon (max 30). */
const increase = (list: AttributeId[] = ALL, max = 20): ChoiceDef => ({
  id: 'attribute',
  label: 'Характеристика +1',
  count: 1,
  options: list.length === ALL.length ? { from: 'attributes', amount: 1, max } : { from: 'attributes', list, amount: 1, max },
});

const boonIncrease = (list: AttributeId[] = ALL): ChoiceDef => increase(list, 30);

/**
 * "+1 to Int, Wis or Cha; that score is the spellcasting ability of the feat's spells": one option
 * per score, so the granted spells get the right ability.
 */
const castingIncrease = (spellEffects: (attribute: AttributeId) => Effect[]): ChoiceDef => ({
  id: 'attribute',
  label: 'Характеристика +1 (заклинательная)',
  count: 1,
  options: {
    from: 'options',
    options: MENTAL.map(
      (attribute): OptionDef => ({
        id: attribute,
        name: ATTRIBUTE_NAMES[attribute],
        description: `${ATTRIBUTE_NAMES[attribute]} +1 (не выше 20); она же — заклинательная характеристика заклинаний черты.`,
        effects: [{ type: 'attribute', attribute, amount: 1, max: 20 }, ...spellEffects(attribute)],
      }),
    ),
  },
});

/** "Proficiency in one of these skills, or Expertise if you already have it" (Keen Mind, Observant). */
const skillOrExpertise = (skills: SkillId[]): ChoiceDef => ({
  id: 'skill',
  label: 'Навык или экспертность',
  count: 1,
  hint: 'Если вы уже владеете навыком, выберите экспертность в нём; иначе — владение.',
  options: {
    from: 'options',
    options: skills.flatMap((skill): OptionDef[] => [
      {
        id: `${skill}-proficiency`,
        name: `${SKILL_NAMES[skill]}: владение`,
        description: `Вы получаете владение навыком «${SKILL_NAMES[skill]}».`,
        effects: [{ type: 'skill', skill }],
      },
      {
        id: `${skill}-expertise`,
        name: `${SKILL_NAMES[skill]}: экспертность`,
        description: `Вы уже владеете навыком «${SKILL_NAMES[skill]}» и получаете экспертность в нём.`,
        effects: [{ type: 'expertise', skill }],
      },
    ]),
  },
});

const damageTypeOption = (id: string, name: string, effects?: Effect[]): OptionDef => ({
  id,
  name,
  description: `Тип урона: ${name.toLowerCase()}.`,
  ...(effects ? { effects } : {}),
});

const ARTISAN_TOOLS = [
  'Инструменты гончара',
  'Инструменты каменщика',
  'Инструменты кожевника',
  'Инструменты кузнеца',
  'Инструменты плотника',
  'Инструменты резчика по дереву',
  'Инструменты ремонтника',
  'Инструменты ткача',
];

const MUSICAL_INSTRUMENTS = MUSICAL_INSTRUMENT_NAMES;

const SPELLCASTING_TEXT = 'Умение «Использование заклинаний» или «Магия договора»';

// ------------------------------------------------------------------------------------------------
// Origin feats
// ------------------------------------------------------------------------------------------------

const MAGIC_INITIATE_LISTS: { list: SpellListId; name: string; label: string }[] = [
  { list: 'cleric', name: 'жрец', label: 'жреца' },
  { list: 'druid', name: 'друид', label: 'друида' },
  { list: 'wizard', name: 'волшебник', label: 'волшебника' },
];

const magicInitiate = ({ list, name, label }: (typeof MAGIC_INITIATE_LISTS)[number]): FeatDef => ({
  id: `magic-initiate-${list}`,
  name: `Посвящённый в магию (${name})`,
  category: 'origin',
  description: [
    `Вы прикоснулись к магии из списка заклинаний ${label}:`,
    `- **Два заговора** из списка ${label} на ваш выбор.`,
    '- **Заклинание 1-го уровня** из того же списка. Оно всегда подготовлено; раз в продолжительный отдых его можно сотворить без ячейки, а также — обычными ячейками, если они у вас есть.',
    '- **Заклинательная характеристика** этих заклинаний — Интеллект, Мудрость или Харизма (выбирается при получении черты).',
    '- **Замена**: при получении нового уровня можно заменить одно заклинание черты на другое того же уровня из того же списка.',
    '- Черту можно брать повторно, но каждый раз с другим списком заклинаний.',
  ].join('\n'),
  resource: { id: `feat.magic-initiate-${list}`, name: `Посвящённый в магию (${name})`, max: 1, recharge: 'long', description: 'Сотворение заклинания 1-го уровня черты без ячейки.' },
  choices: [
    { id: 'cantrips', label: 'Заговоры (2)', count: 2, options: { from: 'spells', lists: [list], maxLevel: 0 } },
    { id: 'spell', label: 'Заклинание 1-го уровня', count: 1, options: { from: 'spells', lists: [list], minLevel: 1, maxLevel: 1 } },
    {
      id: 'spellAbility',
      label: 'Заклинательная характеристика',
      count: 1,
      options: {
        from: 'options',
        options: MENTAL.map((attribute) => ({
          id: attribute,
          name: ATTRIBUTE_NAMES[attribute],
          description: `Заклинания этой черты используют ${ATTRIBUTE_NAMES[attribute].toLowerCase()} как заклинательную характеристику.`,
        })),
      },
    },
  ],
  iconName: 'spell-book',
});

const ORIGIN: FeatDef[] = [
  {
    id: 'alert',
    name: 'Бдительный',
    category: 'origin',
    description: [
      '- **Владение инициативой**: к броску инициативы вы добавляете бонус мастерства.',
      '- **Обмен инициативой**: сразу после броска инициативы вы можете поменяться её значением с одним согласным союзником в этом бою, если ни вы, ни он не недееспособны.',
    ].join('\n'),
    effects: [{ type: 'initiative', amount: proficiencyBonus }],
    iconName: 'all-seeing-eye',
  },
  {
    id: 'crafter',
    name: 'Мастеровой',
    category: 'origin',
    description: [
      '- **Инструменты**: владение тремя разными видами инструментов ремесленника из таблицы быстрого изготовления.',
      '- **Скидка**: немагические предметы обходятся вам на 20% дешевле.',
      '- **Быстрое изготовление**: по завершении продолжительного отдыха вы можете изготовить один предмет из таблицы, если владеете нужными инструментами и они при вас. Предмет разваливается в конце следующего продолжительного отдыха.',
      '',
      'Таблица: гончара — кувшин, лампа; каменщика — блок и лебёдка; кожевника — кошель, тубус, футляр для болтов; кузнеца — ведро, железный горшок, калтропы, крюк-кошка, металлические шарики; плотника — лестница, факел; резчика по дереву — боевой посох, дубинка, палица; ремонтника — колокольчик, лопата, трутница; ткача — верёвка, корзина, палатка, сеть.',
    ].join('\n'),
    choices: [{ id: 'tools', label: 'Инструменты ремесленника (3)', count: 3, options: { from: 'tools', list: ARTISAN_TOOLS } }],
    iconName: 'gear-hammer',
  },
  {
    id: 'healer',
    name: 'Лекарь',
    category: 'origin',
    description: [
      '- **Боевой целитель**: действием «Использование» вы тратите одно применение набора целителя на существо в пределах 5 футов. Оно может потратить одну кость хитов; вы бросаете её, и существо восстанавливает хиты, равные результату + ваш бонус мастерства.',
      '- **Переброс лечения**: когда вы бросаете кость лечения заклинания или этой черты и выпадает 1, вы можете перебросить её и должны взять новый результат.',
    ].join('\n'),
    action: 'action',
    effects: [{ type: 'damageRoll', rule: { name: 'Лекарь', on: 'healing', rerollOnes: true } }],
    iconName: 'medical-pack',
  },
  {
    id: 'lucky',
    name: 'Везучий',
    category: 'origin',
    description: [
      'У вас есть очки удачи в количестве, равном бонусу мастерства; они восстанавливаются после продолжительного отдыха.',
      '- **Преимущество**: потратьте 1 очко, чтобы получить преимущество на свой тест к20.',
      '- **Помеха**: когда кто-то совершает бросок атаки по вам, потратьте 1 очко, чтобы наложить на него помеху.',
    ].join('\n'),
    action: 'passive',
    resource: { id: 'feat.lucky', name: 'Очки удачи', max: proficiencyBonus, recharge: 'long', iconName: 'rolling-dices' },
    iconName: 'rolling-dices',
  },
  ...MAGIC_INITIATE_LISTS.map(magicInitiate),
  {
    id: 'musician',
    name: 'Музыкант',
    category: 'origin',
    description: [
      '- **Инструменты**: владение тремя музыкальными инструментами на ваш выбор.',
      '- **Ободряющая песня**: по завершении короткого или продолжительного отдыха вы можете сыграть на инструменте, которым владеете, и дать героическое вдохновение слышавшим вас союзникам — числом не больше вашего бонуса мастерства.',
    ].join('\n'),
    choices: [{ id: 'tools', label: 'Музыкальные инструменты (3)', count: 3, options: { from: 'tools', list: MUSICAL_INSTRUMENTS } }],
    iconName: 'lyre',
  },
  {
    id: 'savage-attacker',
    name: 'Неистово атакующий',
    category: 'origin',
    description: 'Раз в ход, попав по цели оружием, вы можете бросить кости урона этого оружия дважды и выбрать любой из двух результатов.',
    action: 'passive',
    effects: [{ type: 'damageRoll', rule: { name: 'Неистово атакующий', on: 'weapon', twice: true, oncePerTurn: true } }],
    iconName: 'spiky-explosion',
  },
  {
    id: 'skilled',
    name: 'Одарённый',
    category: 'origin',
    description: 'Вы получаете владение тремя навыками или инструментами в любом сочетании. Черту можно брать несколько раз.\n\n_Выбор инструментов вместо навыков отметьте вручную._',
    repeatable: true,
    choices: [{ id: 'skills', label: 'Навыки (3)', count: 3, options: { from: 'skills' } }],
    iconName: 'book-cover',
  },
  {
    id: 'tavern-brawler',
    name: 'Дебошир',
    category: 'origin',
    description: [
      '- **Усиленный безоружный удар**: попав безоружным ударом и нанося урон, вы можете нанести 1к4 + модификатор Силы дробящего урона вместо обычного.',
      '- **Переброс урона**: выпавшую 1 на кости урона безоружного удара можно перебросить (берётся новый результат).',
      '- **Импровизированное оружие**: вы владеете им.',
      '- **Толчок**: раз в ход, попав по существу безоружным ударом в рамках действия «Атака» в свой ход, вы можете и нанести урон, и оттолкнуть цель на 5 футов.',
    ].join('\n'),
    action: 'passive',
    effects: [
      { type: 'proficiency', category: 'weapon', value: 'Импровизированное оружие' },
      {
        type: 'attack',
        attack: { id: 'tavern-brawler.unarmed-strike', name: 'Безоружный удар', damage: '1d4', damageType: 'Дробящий', abilities: ['strength'], iconName: 'fist' },
      },
      { type: 'damageRoll', rule: { name: 'Дебошир', on: 'unarmed', rerollOnes: true } },
    ],
    iconName: 'beer-stein',
  },
  {
    id: 'tough',
    name: 'Крепкий',
    category: 'origin',
    description: 'Максимум хитов растёт на удвоенный уровень персонажа при получении черты и ещё на 2 с каждым следующим уровнем.',
    effects: [{ type: 'hpPerLevel', amount: 2 }],
    iconName: 'heart-plus',
  },
];

// ------------------------------------------------------------------------------------------------
// General feats
// ------------------------------------------------------------------------------------------------

const L4 = { level: 4 };
const strOrDex13 = { level: 4, attributes: { list: STR_DEX, min: 13 } };
const dex13 = { level: 4, attributes: { list: ['dexterity'] as AttributeId[], min: 13 } };

const GENERAL: FeatDef[] = [
  {
    id: 'ability-score-improvement',
    name: 'Увеличение характеристик',
    category: 'general',
    prerequisite: L4,
    repeatable: true,
    description: 'Увеличьте одну характеристику на 2 или две характеристики на 1 (не выше 20). Черту можно брать несколько раз.',
    choices: [
      {
        id: 'attributes',
        label: 'Характеристики (+1 ×2)',
        count: 2,
        hint: 'Выбрав одну характеристику дважды, вы получите +2 к ней.',
        options: { from: 'attributes', amount: 1, max: 20 },
      },
    ],
  },
  {
    id: 'actor',
    name: 'Актёр',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: ['charisma'], min: 13 } },
    description: [
      '- **Харизма +1** (не выше 20).',
      '- **Перевоплощение**: пока вы выдаёте себя за реальную или вымышленную личность, проверки Харизмы (Обман или Выступление), чтобы сойти за другого, совершаются с преимуществом.',
      '- **Подражание**: вы имитируете звуки и речь других существ. Слушатель распознаёт подделку, только преуспев в проверке Мудрости (Внимательность) со СЛ 8 + модификатор Харизмы + бонус мастерства.',
    ].join('\n'),
    effects: [{ type: 'attribute', attribute: 'charisma', amount: 1, max: 20 }],
    iconName: 'charm',
  },
  {
    id: 'athlete',
    name: 'Атлет',
    category: 'general',
    prerequisite: strOrDex13,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Лазание**: скорость лазания равна вашей скорости.',
      '- **Подъём**: вставание из положения «сбит с ног» стоит лишь 5 футов перемещения.',
      '- **Короткий разбег**: для прыжка с разбегом в длину или в высоту достаточно пройти 5 футов.',
    ].join('\n'),
    effects: [{ type: 'movement', mode: 'climb' }],
    choices: [increase(STR_DEX)],
    iconName: 'sprint',
  },
  {
    id: 'charger',
    name: 'Налётчик',
    category: 'general',
    prerequisite: strOrDex13,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Улучшенный рывок**: при действии «Рывок» ваша скорость на это действие выше на 10 футов.',
      '- **Атака с наскока**: раз в ход, если прямо перед попаданием рукопашной атакой в рамках действия «Атака» вы прошли по прямой к цели не меньше 10 футов, выберите: +1к8 к урону или толкнуть цель на расстояние до 10 футов (если она больше вас не более чем на одну категорию размера).',
    ].join('\n'),
    action: 'passive',
    choices: [increase(STR_DEX)],
    iconName: 'boot-stomp',
  },
  {
    id: 'chef',
    name: 'Шеф-повар',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Телосложение или Мудрость +1** (не выше 20).',
      '- **Инструменты повара**: владение ими.',
      '- **Сытное блюдо**: во время короткого отдыха, имея ингредиенты и инструменты, вы готовите еду на 4 + бонус мастерства существ. Поевший, который тратит в этот отдых хотя бы одну кость хитов, восстанавливает дополнительно 1к8 хитов.',
      '- **Поддерживающие угощения**: за час работы или по завершении продолжительного отдыха вы готовите угощения числом, равным бонусу мастерства (хранятся 8 часов). Существо бонусным действием съедает одно и получает временные хиты, равные вашему бонусу мастерства.',
    ].join('\n'),
    effects: [{ type: 'proficiency', category: 'tool', value: 'Инструменты повара' }],
    choices: [increase(['constitution', 'wisdom'])],
    resource: { id: 'feat.chef', name: 'Угощения', max: proficiencyBonus, recharge: 'long', description: 'Съевший угощение бонусным действием получает временные хиты, равные вашему бонусу мастерства.' },
    iconName: 'meat',
  },
  {
    id: 'crossbow-expert',
    name: 'Эксперт по арбалетам',
    category: 'general',
    prerequisite: dex13,
    description: [
      '- **Ловкость +1** (не выше 20).',
      '- **Без перезарядки**: вы игнорируете свойство «Перезарядка» ручного, лёгкого и тяжёлого арбалетов и заряжаете их без свободной руки.',
      '- **Стрельба вплотную**: враг в пределах 5 футов не даёт помехи вашим атакам из арбалета.',
      '- **Два оружия**: в дополнительную атаку от свойства «Лёгкое», сделанную лёгким арбалетом, вы добавляете модификатор характеристики к урону, если ещё не добавили его.',
    ].join('\n'),
    effects: [{ type: 'attribute', attribute: 'dexterity', amount: 1, max: 20 }],
    iconName: 'crossbow',
  },
  {
    id: 'crusher',
    name: 'Крушитель',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Сила или Телосложение +1** (не выше 20).',
      '- **Толчок**: раз в ход, попав по существу атакой с дробящим уроном, вы можете сдвинуть его на 5 футов в незанятое пространство, если оно больше вас не более чем на одну категорию размера.',
      '- **Улучшенный крит**: после критического попадания с дробящим уроном атаки по этой цели совершаются с преимуществом до начала вашего следующего хода.',
    ].join('\n'),
    action: 'passive',
    choices: [increase(['strength', 'constitution'])],
    iconName: 'warhammer',
  },
  {
    id: 'defensive-duelist',
    name: 'Парирующий дуэлянт',
    category: 'general',
    prerequisite: dex13,
    description: [
      '- **Ловкость +1** (не выше 20).',
      '- **Парирование**: держа фехтовальное оружие, когда по вам попадает рукопашная атака, вы можете реакцией добавить бонус мастерства к КД (что может обратить попадание в промах). Бонус действует против рукопашных атак до начала вашего следующего хода.',
    ].join('\n'),
    action: 'reaction',
    effects: [{ type: 'attribute', attribute: 'dexterity', amount: 1, max: 20 }],
    iconName: 'broadsword',
  },
  {
    id: 'dual-wielder',
    name: 'Мастер боя двумя оружиями',
    category: 'general',
    prerequisite: strOrDex13,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Улучшенный бой двумя оружиями**: если в свой ход действием «Атака» вы атакуете лёгким оружием, позже в этот ход бонусным действием вы можете атаковать другим рукопашным оружием без свойства «Двуручное». Модификатор характеристики к урону этой атаки не добавляется (если он не отрицательный).',
      '- **Быстрое выхватывание**: когда можно достать или убрать одно оружие, вы достаёте или убираете два недвуручных.',
    ].join('\n'),
    action: 'bonus',
    choices: [increase(STR_DEX)],
    iconName: 'crossed-swords',
  },
  {
    id: 'durable',
    name: 'Стойкий',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Телосложение +1** (не выше 20).',
      '- **Противостояние смерти**: спасброски от смерти совершаются с преимуществом.',
      '- **Быстрое восстановление**: бонусным действием вы тратите одну кость хитов, бросаете её и восстанавливаете столько хитов.',
    ].join('\n'),
    action: 'bonus',
    effects: [{ type: 'attribute', attribute: 'constitution', amount: 1, max: 20 }],
    iconName: 'healing',
  },
  {
    id: 'elemental-adept',
    name: 'Стихийный адепт',
    category: 'general',
    prerequisite: { level: 4, spellcasting: true, text: SPELLCASTING_TEXT },
    repeatable: true,
    description: [
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20).',
      '- **Власть над энергией**: выберите кислоту, звук, огонь, холод или электричество. Ваши заклинания игнорируют сопротивление этому типу урона, а при броске их урона этого типа выпавшие 1 считаются 2.',
      '- Черту можно брать повторно, каждый раз с новым типом урона.',
    ].join('\n'),
    choices: [
      increase(MENTAL),
      {
        id: 'damage-type',
        label: 'Тип урона',
        count: 1,
        options: {
          from: 'options',
          options: [
            damageTypeOption('acid', 'Кислота', [{ type: 'damageRoll', rule: { name: 'Стихийный адепт', on: 'spell', damageType: 'Кислота', onesAsTwos: true } }]),
            damageTypeOption('thunder', 'Звук', [{ type: 'damageRoll', rule: { name: 'Стихийный адепт', on: 'spell', damageType: 'Звук', onesAsTwos: true } }]),
            damageTypeOption('fire', 'Огонь', [{ type: 'damageRoll', rule: { name: 'Стихийный адепт', on: 'spell', damageType: 'Огонь', onesAsTwos: true } }]),
            damageTypeOption('cold', 'Холод', [{ type: 'damageRoll', rule: { name: 'Стихийный адепт', on: 'spell', damageType: 'Холод', onesAsTwos: true } }]),
            damageTypeOption('lightning', 'Электричество', [{ type: 'damageRoll', rule: { name: 'Стихийный адепт', on: 'spell', damageType: 'Электричество', onesAsTwos: true } }]),
          ],
        },
      },
    ],
    iconName: 'fire',
  },
  {
    id: 'fey-touched',
    name: 'Затронутый феями',
    category: 'general',
    prerequisite: L4,
    description: [
      'Магия Страны Фей коснулась вас:',
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20); эта характеристика — заклинательная для заклинаний черты.',
      '- **Магия фей**: у вас всегда подготовлены «Туманный шаг» и одно выбранное заклинание 1-го уровня школы Прорицания или Очарования. Каждое из них можно раз в продолжительный отдых сотворить без ячейки, а также — имеющимися ячейками.',
    ].join('\n'),
    resource: { id: 'feat.fey-touched', name: 'Магия фей', max: 2, recharge: 'long', description: 'По одному бесплатному сотворению каждого из двух заклинаний черты.' },
    choices: [
      castingIncrease((ability) => [{ type: 'spell', spell: 'misty-step', alwaysPrepared: true, ability, note: 'Затронутый феями' }]),
      {
        id: 'spell',
        label: 'Заклинание 1-го уровня (Прорицание или Очарование)',
        count: 1,
        options: { from: 'spells', lists: ALL_SPELL_LISTS, minLevel: 1, maxLevel: 1, schools: ['Прорицание', 'Очарование'] },
      },
    ],
    iconName: 'fairy-wand',
  },
  {
    id: 'grappler',
    name: 'Борец',
    category: 'general',
    prerequisite: strOrDex13,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Удар и захват**: раз в ход, попав безоружным ударом в рамках действия «Атака» в свой ход, вы применяете сразу оба варианта — урон и захват.',
      '- **Преимущество**: атаки по схваченному вами существу совершаются с преимуществом.',
      '- **Быстрый борец**: перемещение схваченного существа вашего размера или меньше не стоит вам дополнительного движения.',
    ].join('\n'),
    action: 'passive',
    choices: [increase(STR_DEX)],
    iconName: 'grapple',
  },
  {
    id: 'great-weapon-master',
    name: 'Мастер тяжёлого оружия',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: ['strength'], min: 13 } },
    description: [
      '- **Сила +1** (не выше 20).',
      '- **Мастерство тяжёлого оружия**: попав в свой ход тяжёлым оружием в рамках действия «Атака», вы добавляете к урону бонус мастерства.',
      '- **Сечь**: сразу после критического попадания рукопашным оружием или когда оно опускает хиты существа до 0, вы можете бонусным действием атаковать этим же оружием ещё раз.',
    ].join('\n'),
    action: 'bonus',
    effects: [
      { type: 'attribute', attribute: 'strength', amount: 1, max: 20 },
      { type: 'damageBonus', heavy: true, amount: proficiencyBonus },
    ],
    iconName: 'battle-axe',
  },
  {
    id: 'heavily-armored',
    name: 'Знаток тяжёлых доспехов',
    category: 'general',
    prerequisite: { level: 4, proficiency: 'Средние доспехи' },
    description: '- **Телосложение или Сила +1** (не выше 20).\n- **Тренированность**: вы обучены носить тяжёлые доспехи.',
    effects: [{ type: 'proficiency', category: 'armor', value: 'Тяжёлые доспехи' }],
    choices: [increase(['constitution', 'strength'])],
    iconName: 'black-knight-helm',
  },
  {
    id: 'heavy-armor-master',
    name: 'Мастер тяжёлых доспехов',
    category: 'general',
    prerequisite: { level: 4, proficiency: 'Тяжёлые доспехи' },
    description: '- **Телосложение или Сила +1** (не выше 20).\n- **Снижение урона**: пока на вас тяжёлый доспех, дробящий, колющий и рубящий урон от попавшей по вам атаки уменьшается на ваш бонус мастерства.',
    action: 'passive',
    choices: [increase(['constitution', 'strength'])],
    iconName: 'chest-armor',
  },
  {
    id: 'inspiring-leader',
    name: 'Воодушевляющий лидер',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: ['wisdom', 'charisma'], min: 13 } },
    description: [
      '- **Мудрость или Харизма +1** (не выше 20).',
      '- **Ободряющее выступление**: по завершении короткого или продолжительного отдыха вы произносите речь, поёте или танцуете. До шести союзников в пределах 30 футов, видевших выступление (можно и себя), получают временные хиты, равные уровню персонажа + модификатор характеристики, увеличенной этой чертой.',
    ].join('\n'),
    choices: [increase(['wisdom', 'charisma'])],
    iconName: 'eagle-emblem',
  },
  {
    id: 'keen-mind',
    name: 'Острый ум',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: ['intelligence'], min: 13 } },
    description: [
      '- **Интеллект +1** (не выше 20).',
      '- **Знаток преданий**: выберите Анализ, Историю, Магию, Природу или Религию — вы получаете владение этим навыком, а если уже владеете им, то экспертность.',
      '- **Быстрое изучение**: действие «Изучение» можно совершать бонусным действием.',
    ].join('\n'),
    action: 'bonus',
    effects: [{ type: 'attribute', attribute: 'intelligence', amount: 1, max: 20 }],
    choices: [skillOrExpertise(['arcana', 'history', 'investigation', 'nature', 'religion'])],
    iconName: 'brain',
  },
  {
    id: 'lightly-armored',
    name: 'Знаток лёгких доспехов',
    category: 'general',
    prerequisite: L4,
    description: '- **Сила или Ловкость +1** (не выше 20).\n- **Тренированность**: вы обучены носить лёгкие доспехи и щиты.',
    effects: [
      { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
      { type: 'proficiency', category: 'armor', value: 'Щиты' },
    ],
    choices: [increase(STR_DEX)],
    iconName: 'chest-armor',
  },
  {
    id: 'mage-slayer',
    name: 'Убийца магов',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Срыв концентрации**: существо, которому вы нанесли урон, совершает спасбросок концентрации с помехой.',
      '- **Защищённый разум**: проваленный спасбросок Интеллекта, Мудрости или Харизмы вы можете превратить в успешный; после этого — только после короткого или продолжительного отдыха.',
    ].join('\n'),
    action: 'passive',
    resource: { id: 'feat.mage-slayer', name: 'Защищённый разум', max: 1, recharge: 'shortOrLong' },
    choices: [increase(STR_DEX)],
    iconName: 'magic-shield',
  },
  {
    id: 'martial-weapon-training',
    name: 'Обученность воинскому оружию',
    category: 'general',
    prerequisite: L4,
    description: '- **Сила или Ловкость +1** (не выше 20).\n- **Владение оружием**: вы владеете воинским оружием.',
    effects: [{ type: 'proficiency', category: 'weapon', value: 'Воинское оружие' }],
    choices: [increase(STR_DEX)],
    iconName: 'broadsword',
  },
  {
    id: 'medium-armor-master',
    name: 'Мастер средних доспехов',
    category: 'general',
    prerequisite: { level: 4, proficiency: 'Средние доспехи' },
    description: '- **Сила или Ловкость +1** (не выше 20).\n- **Подгонка**: в среднем доспехе при Ловкости 16 и выше вы добавляете к КД 3, а не 2.',
    choices: [increase(STR_DEX)],
    iconName: 'chest-armor',
  },
  {
    id: 'moderately-armored',
    name: 'Знаток средних доспехов',
    category: 'general',
    prerequisite: { level: 4, proficiency: 'Лёгкие доспехи' },
    description: '- **Сила или Ловкость +1** (не выше 20).\n- **Тренированность**: вы обучены носить средние доспехи.',
    effects: [{ type: 'proficiency', category: 'armor', value: 'Средние доспехи' }],
    choices: [increase(STR_DEX)],
    iconName: 'chest-armor',
  },
  {
    id: 'mounted-combatant',
    name: 'Верховой боец',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Сила, Ловкость или Мудрость +1** (не выше 20).',
      '- **Удар всадника**: верхом вы атакуете с преимуществом пеших существ в пределах 5 футов от скакуна, если они меньше скакуна.',
      '- **Уклонение скакуна**: если скакун, на котором вы едете, попадает под эффект со спасброском Ловкости на половину урона, при успехе он не получает урона, а при провале — половину (если ни вы, ни он не недееспособны).',
      '- **Вираж**: пока вы верхом и не недееспособны, атаку, попавшую по скакуну, вы можете перенаправить на себя.',
    ].join('\n'),
    choices: [increase(['strength', 'dexterity', 'wisdom'])],
    iconName: 'trident',
  },
  {
    id: 'observant',
    name: 'Внимательный',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: ['intelligence', 'wisdom'], min: 13 } },
    description: [
      '- **Интеллект или Мудрость +1** (не выше 20).',
      '- **Зоркий наблюдатель**: выберите Анализ, Внимательность или Восприятие — вы получаете владение этим навыком, а если уже владеете им, то экспертность.',
      '- **Быстрый поиск**: действие «Поиск» можно совершать бонусным действием.',
    ].join('\n'),
    action: 'bonus',
    choices: [increase(['intelligence', 'wisdom']), skillOrExpertise(['insight', 'investigation', 'perception'])],
    iconName: 'human-ear',
  },
  {
    id: 'piercer',
    name: 'Пронзатель',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Прокол**: раз в ход, попав атакой с колющим уроном, вы можете перебросить одну кость урона (берётся новый результат).',
      '- **Улучшенный крит**: при критическом попадании с колющим уроном бросьте одну дополнительную кость урона.',
    ].join('\n'),
    action: 'passive',
    choices: [increase(STR_DEX)],
    effects: [
      { type: 'damageRoll', rule: { name: 'Пронзатель', on: 'attack', damageType: 'Колющий', rerollLowest: true, oncePerTurn: true } },
      { type: 'damageRoll', rule: { name: 'Пронзатель', on: 'attack', damageType: 'Колющий', extraCritDice: 1 } },
    ],
    iconName: 'plain-dagger',
  },
  {
    id: 'poisoner',
    name: 'Отравитель',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Ловкость или Интеллект +1** (не выше 20).',
      '- **Сильный яд**: ваш урон ядом игнорирует сопротивление яду.',
      '- **Варка яда**: вы владеете инструментами отравителя. За час работы и 50 зм вы готовите дозы яда числом, равным бонусу мастерства. Бонусным действием доза наносится на оружие или боеприпас и действует 1 минуту или до первого урона. Получившее урон существо проходит спасбросок Телосложения (СЛ 8 + бонус мастерства + модификатор характеристики, увеличенной чертой), иначе получает 2к8 урона ядом и отравлено до конца вашего следующего хода.',
    ].join('\n'),
    action: 'bonus',
    damage: '2к8',
    damageType: 'Яд',
    effects: [{ type: 'proficiency', category: 'tool', value: 'Инструменты отравителя' }],
    choices: [increase(['dexterity', 'intelligence'])],
    iconName: 'poison-bottle',
  },
  {
    id: 'polearm-master',
    name: 'Мастер древкового оружия',
    category: 'general',
    prerequisite: strOrDex13,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Удар древком**: сразу после атаки в рамках действия «Атака» боевым посохом, копьём или оружием со свойствами «Тяжёлое» и «Досягаемость» вы можете бонусным действием ударить обратным концом: рукопашная атака, 1к4 дробящего урона.',
      '- **Встречный удар**: с таким оружием в руках вы можете реакцией атаковать существо, которое входит в зону вашей досягаемости.',
    ].join('\n'),
    action: 'bonus',
    damage: '1к4',
    damageType: 'Дробящий',
    choices: [increase(STR_DEX)],
    iconName: 'barbed-spear',
  },
  {
    id: 'resilient',
    name: 'Устойчивый',
    category: 'general',
    prerequisite: L4,
    description: 'Выберите характеристику, спасброском которой вы не владеете: она увеличивается на 1 (не выше 20), и вы получаете владение её спасброском.',
    choices: [
      {
        id: 'attribute',
        label: 'Характеристика и спасбросок',
        count: 1,
        hint: 'Только характеристика, спасброском которой вы ещё не владеете.',
        options: {
          from: 'options',
          options: ALL.map(
            (attribute): OptionDef => ({
              id: attribute,
              name: ATTRIBUTE_NAMES[attribute],
              description: `${ATTRIBUTE_NAMES[attribute]} +1 (не выше 20) и владение спасброском этой характеристики.`,
              effects: [
                { type: 'attribute', attribute, amount: 1, max: 20 },
                { type: 'save', attribute },
              ],
            }),
          ),
        },
      },
    ],
    iconName: 'checked-shield',
  },
  {
    id: 'ritual-caster',
    name: 'Ритуальный заклинатель',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: MENTAL, min: 13 } },
    description: [
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20); она же — заклинательная характеристика заклинаний черты.',
      '- **Ритуальные заклинания**: выберите ритуалы 1-го уровня числом, равным бонусу мастерства. Они всегда подготовлены, и их можно творить имеющимися ячейками. С ростом бонуса мастерства добавляйте по одному ритуалу 1-го уровня.',
      '- **Быстрый ритуал**: раз в продолжительный отдых вы творите подготовленный ритуал за обычное время сотворения без траты ячейки.',
    ].join('\n'),
    resource: { id: 'feat.ritual-caster', name: 'Быстрый ритуал', max: 1, recharge: 'long' },
    choices: [
      increase(MENTAL),
      {
        id: 'rituals',
        label: 'Ритуалы 1-го уровня',
        count: proficiencyBonus,
        pool: 'feat.ritual-caster',
        options: { from: 'spells', lists: ALL_SPELL_LISTS, minLevel: 1, maxLevel: 1, ritual: true },
      },
    ],
    iconName: 'scroll-unfurled',
  },
  {
    id: 'sentinel',
    name: 'Страж',
    category: 'general',
    prerequisite: strOrDex13,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Хранитель**: сразу после того, как существо в пределах 5 футов совершает действие «Отход» или попадает атакой по кому-то, кроме вас, вы можете совершить по нему атаку по возможности.',
      '- **Остановка**: попав атакой по возможности, вы снижаете скорость существа до 0 до конца текущего хода.',
    ].join('\n'),
    action: 'reaction',
    choices: [increase(STR_DEX)],
    iconName: 'checked-shield',
  },
  {
    id: 'shadow-touched',
    name: 'Затронутый тенью',
    category: 'general',
    prerequisite: L4,
    description: [
      'Магия Царства Теней коснулась вас:',
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20); эта характеристика — заклинательная для заклинаний черты.',
      '- **Теневая магия**: у вас всегда подготовлены «Невидимость» и одно выбранное заклинание 1-го уровня школы Иллюзии или Некромантии. Каждое из них можно раз в продолжительный отдых сотворить без ячейки, а также — имеющимися ячейками.',
    ].join('\n'),
    resource: { id: 'feat.shadow-touched', name: 'Теневая магия', max: 2, recharge: 'long', description: 'По одному бесплатному сотворению каждого из двух заклинаний черты.' },
    choices: [
      castingIncrease((ability) => [{ type: 'spell', spell: 'invisibility', alwaysPrepared: true, ability, note: 'Затронутый тенью' }]),
      {
        id: 'spell',
        label: 'Заклинание 1-го уровня (Иллюзия или Некромантия)',
        count: 1,
        options: { from: 'spells', lists: ALL_SPELL_LISTS, minLevel: 1, maxLevel: 1, schools: ['Иллюзия', 'Некромантия'] },
      },
    ],
    iconName: 'invisible',
  },
  {
    id: 'sharpshooter',
    name: 'Меткий стрелок',
    category: 'general',
    prerequisite: dex13,
    description: [
      '- **Ловкость +1** (не выше 20).',
      '- **Сквозь укрытие**: ваши дальнобойные атаки оружием игнорируют укрытие на половину и на три четверти.',
      '- **Стрельба вплотную**: враг в пределах 5 футов не даёт помехи вашим атакам дальнобойным оружием.',
      '- **Дальние выстрелы**: атака на большую дистанцию оружия не получает помехи.',
    ].join('\n'),
    action: 'passive',
    effects: [{ type: 'attribute', attribute: 'dexterity', amount: 1, max: 20 }],
    iconName: 'arrow-scope',
  },
  {
    id: 'shield-master',
    name: 'Мастер щита',
    category: 'general',
    prerequisite: { level: 4, proficiency: 'Щиты' },
    description: [
      '- **Сила +1** (не выше 20).',
      '- **Удар щитом**: раз в ход, попав рукопашным оружием в рамках действия «Атака» по существу в пределах 5 футов, вы можете сразу ударить его щитом. Цель проходит спасбросок Силы (СЛ 8 + модификатор Силы + бонус мастерства), иначе вы толкаете её на 5 футов или сбиваете с ног — на ваш выбор.',
      '- **Прикрыться щитом**: если вы со щитом преуспели в спасброске Ловкости от эффекта, наносящего при успехе половину урона, вы можете реакцией не получить урона вовсе.',
    ].join('\n'),
    action: 'reaction',
    effects: [{ type: 'attribute', attribute: 'strength', amount: 1, max: 20 }],
    iconName: 'shield-bash',
  },
  {
    id: 'skill-expert',
    name: 'Эксперт в навыке',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Любая характеристика +1** (не выше 20).',
      '- **Владение навыком**: один навык на ваш выбор.',
      '- **Экспертность**: в одном навыке, которым вы владеете и в котором ещё нет экспертности.',
    ].join('\n'),
    choices: [
      increase(),
      { id: 'skill', label: 'Навык', count: 1, options: { from: 'skills' } },
      { id: 'expertise', label: 'Экспертность', count: 1, options: { from: 'expertise' } },
    ],
    iconName: 'book-cover',
  },
  {
    id: 'skulker',
    name: 'Проныра',
    category: 'general',
    prerequisite: dex13,
    description: [
      '- **Ловкость +1** (не выше 20).',
      '- **Слепое зрение** в радиусе 10 футов.',
      '- **Туман войны**: в бою проверки Ловкости (Скрытность) для действия «Засада» совершаются с преимуществом.',
      '- **Снайпер**: промах атакой, пока вы скрыты, не выдаёт ваше местоположение.',
    ].join('\n'),
    effects: [{ type: 'attribute', attribute: 'dexterity', amount: 1, max: 20 }],
    iconName: 'hooded-assassin',
  },
  {
    id: 'slasher',
    name: 'Рубака',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Подрезать сухожилия**: раз в ход, попав атакой с рубящим уроном, вы снижаете скорость существа на 10 футов до начала вашего следующего хода.',
      '- **Улучшенный крит**: после критического попадания с рубящим уроном цель совершает броски атаки с помехой до начала вашего следующего хода.',
    ].join('\n'),
    action: 'passive',
    choices: [increase(STR_DEX)],
    iconName: 'saber-slash',
  },
  {
    id: 'speedy',
    name: 'Быстрый',
    category: 'general',
    prerequisite: { level: 4, attributes: { list: ['dexterity', 'constitution'], min: 13 } },
    description: [
      '- **Ловкость или Телосложение +1** (не выше 20).',
      '- **Скорость +10 футов.**',
      '- **Рывок по бездорожью**: после действия «Рывок» до конца хода труднопроходимая местность вас не замедляет.',
      '- **Проворство**: атаки по возможности по вам совершаются с помехой.',
    ].join('\n'),
    effects: [{ type: 'speed', amount: 10 }],
    choices: [increase(['dexterity', 'constitution'])],
    iconName: 'sprint',
  },
  {
    id: 'spell-sniper',
    name: 'Меткий заклинатель',
    category: 'general',
    prerequisite: { level: 4, spellcasting: true, text: SPELLCASTING_TEXT },
    description: [
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20).',
      '- **Сквозь укрытие**: ваши атаки заклинаниями игнорируют укрытие на половину и на три четверти.',
      '- **Заклинание в упор**: враг в пределах 5 футов не даёт помехи вашим атакам заклинаниями.',
      '- **Дальнобойность**: дистанция заклинания с броском атаки и дистанцией не меньше 10 футов может быть увеличена на 60 футов.',
    ].join('\n'),
    choices: [increase(MENTAL)],
    iconName: 'bolt-spell-cast',
  },
  {
    id: 'telekinetic',
    name: 'Телекинетик',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20); она же — заклинательная характеристика «Волшебной руки».',
      '- **Малый телекинез**: вы знаете заговор «Волшебная рука», творите его без вербального и соматического компонентов, можете сделать руку невидимой; дистанция и удаление руки увеличены на 30 футов.',
      '- **Телекинетический толчок**: бонусным действием выберите видимое существо в пределах 30 футов. Оно проходит спасбросок Силы (СЛ 8 + бонус мастерства + модификатор характеристики, увеличенной чертой), иначе сдвигается на 5 футов к вам или от вас.',
    ].join('\n'),
    action: 'bonus',
    choices: [castingIncrease((ability) => [{ type: 'spell', spell: 'mage-hand', ability, note: 'Телекинетик' }])],
    iconName: 'psychic-waves',
  },
  {
    id: 'telepathic',
    name: 'Телепат',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20); она же — заклинательная характеристика «Обнаружения мыслей».',
      '- **Телепатическая речь**: вы мысленно говорите с любым видимым существом в пределах 60 футов на известном вам языке; оно понимает, только если знает этот язык, и ответить телепатически не может.',
      '- **Обнаружение мыслей**: заклинание всегда подготовлено; раз в продолжительный отдых его можно сотворить без компонентов и ячейки, а также — имеющимися ячейками.',
    ].join('\n'),
    resource: { id: 'feat.telepathic', name: 'Обнаружение мыслей', max: 1, recharge: 'long', description: 'Сотворение без ячейки и компонентов.' },
    choices: [
      castingIncrease((ability) => [{ type: 'spell', spell: 'detect-thoughts', alwaysPrepared: true, ability, note: 'Телепат' }]),
    ],
    iconName: 'brain-tentacle',
  },
  {
    id: 'war-caster',
    name: 'Боевой заклинатель',
    category: 'general',
    prerequisite: { level: 4, spellcasting: true, text: SPELLCASTING_TEXT },
    description: [
      '- **Интеллект, Мудрость или Харизма +1** (не выше 20).',
      '- **Концентрация**: спасброски Телосложения для поддержания концентрации совершаются с преимуществом.',
      '- **Встречное заклинание**: когда существо покидает вашу досягаемость, вместо атаки по возможности вы можете реакцией сотворить по нему заклинание со временем сотворения «действие», нацеленное только на это существо.',
      '- **Соматика**: соматические компоненты можно выполнять, держа оружие или щит в одной или обеих руках.',
    ].join('\n'),
    action: 'reaction',
    choices: [increase(MENTAL)],
    iconName: 'wizard-staff',
  },
  {
    id: 'weapon-master',
    name: 'Мастер оружия',
    category: 'general',
    prerequisite: L4,
    description: [
      '- **Сила или Ловкость +1** (не выше 20).',
      '- **Свойство мастерства**: вы можете использовать свойство мастерства одного вида простого или воинского оружия, которым владеете. После продолжительного отдыха вид можно сменить.',
    ].join('\n'),
    choices: [
      increase(STR_DEX),
      {
        id: 'mastery',
        label: 'Оружейное мастерство',
        count: 1,
        pool: 'weapon-mastery',
        options: { from: 'weapons', filter: 'any' },
        hint: 'Вид оружия, которым вы владеете. Можно менять после продолжительного отдыха.',
      },
    ],
    iconName: 'crossed-swords',
  },
];

// ------------------------------------------------------------------------------------------------
// Fighting Style feats
// ------------------------------------------------------------------------------------------------

const STYLE = { fightingStyle: true };

const FIGHTING_STYLES: FeatDef[] = [
  {
    id: 'archery',
    name: 'Стрельба',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Вы получаете +2 к броскам атаки дальнобойным оружием.',
    iconName: 'bow-arrow',
    effects: [{ type: 'attackBonus', kind: 'ranged', amount: 2 }],
  },
  {
    id: 'blind-fighting',
    name: 'Сражение вслепую',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Вы получаете слепое зрение в радиусе 10 футов.',
    iconName: 'blindfold',
  },
  {
    id: 'defense',
    name: 'Оборона',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Пока на вас лёгкий, средний или тяжёлый доспех, вы получаете +1 к КД.',
    effects: [{ type: 'armorClass', amount: 1, armored: true }],
    iconName: 'chest-armor',
  },
  {
    id: 'dueling',
    name: 'Дуэлянт',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Пока вы держите рукопашное оружие в одной руке и не держите другого оружия, вы получаете +2 к урону этим оружием.',
    iconName: 'broadsword',
    effects: [{ type: 'weaponStyle', style: 'dueling' }],
  },
  {
    id: 'great-weapon-fighting',
    name: 'Сражение большим оружием',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Бросая урон атаки рукопашным оружием со свойством «Двуручное» или «Универсальное», которое вы держите двумя руками, считайте выпавшие на костях урона 1 и 2 как 3.',
    iconName: 'battle-axe',
    effects: [{ type: 'weaponStyle', style: 'greatWeapon' }],
  },
  {
    id: 'interception',
    name: 'Перехват',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Когда видимое вами существо попадает атакой по другому существу в пределах 5 футов от вас, вы можете реакцией уменьшить урон цели на 1к10 + ваш бонус мастерства. Для этого нужно держать щит, простое или воинское оружие.',
    action: 'reaction',
    iconName: 'checked-shield',
  },
  {
    id: 'protection',
    name: 'Защита',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Когда видимое вами существо атакует другое существо (не вас) в пределах 5 футов от вас, вы можете реакцией выставить щит, если он на вас: эта атака и все прочие атаки по цели до начала вашего следующего хода совершаются с помехой, пока вы остаётесь в пределах 5 футов от неё.',
    action: 'reaction',
    iconName: 'magic-shield',
  },
  {
    id: 'thrown-weapon-fighting',
    name: 'Сражение метательным оружием',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'Попав дальнобойной атакой оружием со свойством «Метательное», вы получаете +2 к броску урона.',
    iconName: 'thrown-daggers',
  },
  {
    id: 'two-weapon-fighting',
    name: 'Сражение двумя оружиями',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: 'В дополнительную атаку от свойства «Лёгкое» вы добавляете модификатор характеристики к урону, если ещё не добавили его.',
    iconName: 'crossed-swords',
    effects: [{ type: 'weaponStyle', style: 'twoWeapon' }],
  },
  {
    id: 'unarmed-fighting',
    name: 'Сражение без оружия',
    category: 'fightingStyle',
    prerequisite: STYLE,
    description: [
      '- Попав безоружным ударом и нанося урон, вы можете нанести 1к6 + модификатор Силы дробящего урона вместо обычного; если при броске атаки вы не держите ни оружия, ни щита — 1к8 + модификатор Силы.',
      '- В начале каждого своего хода вы можете нанести 1к4 дробящего урона одному существу, которое держите в захвате.',
    ].join('\n'),
    action: 'action',
    damage: '1к6',
    damageType: 'Дробящий',
    iconName: 'fist',
  },
];

// ------------------------------------------------------------------------------------------------
// Epic Boons
// ------------------------------------------------------------------------------------------------

const L19 = { level: 19 };

const ENERGY_TYPES: [string, string][] = [
  ['acid', 'Кислота'],
  ['cold', 'Холод'],
  ['fire', 'Огонь'],
  ['lightning', 'Электричество'],
  ['necrotic', 'Некротический'],
  ['poison', 'Яд'],
  ['psychic', 'Психический'],
  ['radiant', 'Лучистый'],
  ['thunder', 'Звук'],
];

const EPIC_BOONS: FeatDef[] = [
  {
    id: 'boon-of-combat-prowess',
    name: 'Дар боевой удали',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Безупречный прицел**: промахнувшись броском атаки, вы можете вместо этого попасть. Снова — не раньше начала вашего следующего хода.',
    action: 'passive',
    choices: [boonIncrease()],
    iconName: 'crossed-swords',
  },
  {
    id: 'boon-of-dimensional-travel',
    name: 'Дар межпространственного перемещения',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Мерцающий шаг**: сразу после действия «Атака» или «Магия» вы можете телепортироваться на расстояние до 30 футов в видимое свободное пространство.',
    action: 'passive',
    choices: [boonIncrease()],
    iconName: 'teleport',
  },
  {
    id: 'boon-of-energy-resistance',
    name: 'Дар сопротивления энергии',
    category: 'epicBoon',
    prerequisite: L19,
    description: [
      '- **Любая характеристика +1** (не выше 30).',
      '- **Сопротивление энергиям**: сопротивление двум типам урона на выбор из кислоты, звука, излучения, некротической энергии, огня, психической энергии, холода, электричества и яда. Выбор можно менять после продолжительного отдыха.',
      '- **Перенаправление энергии**: получив урон одного из выбранных типов, вы можете реакцией направить энергию на видимое существо в пределах 60 футов без полного укрытия. Оно проходит спасбросок Ловкости (СЛ 8 + модификатор Телосложения + бонус мастерства), иначе получает 2к12 + модификатор Телосложения урона того же типа.',
    ].join('\n'),
    action: 'reaction',
    damage: '2к12',
    choices: [
      boonIncrease(),
      {
        id: 'resistances',
        label: 'Сопротивления (2)',
        count: 2,
        options: {
          from: 'options',
          options: ENERGY_TYPES.map(([id, name]) => damageTypeOption(id, name, [{ type: 'resistance', damageType: name }])),
        },
      },
    ],
    iconName: 'energy-shield',
  },
  {
    id: 'boon-of-fate',
    name: 'Дар судьбы',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Перст судьбы**: когда вы или существо в пределах 60 футов преуспеваете или проваливаете тест к20, вы можете бросить 2к4 и прибавить результат к броску или вычесть из него. Снова — после вашего броска инициативы или короткого либо продолжительного отдыха.',
    action: 'passive',
    resource: { id: 'feat.boon-of-fate', name: 'Дар судьбы', max: 1, recharge: 'shortOrLong', description: 'Восстанавливается также при броске инициативы.' },
    choices: [boonIncrease()],
    iconName: 'rolling-dices',
  },
  {
    id: 'boon-of-fortitude',
    name: 'Дар стойкости',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Крепкое здоровье**: максимум хитов +40. Раз в раунд (до начала вашего следующего хода), восстанавливая хиты, вы можете восстановить дополнительно хиты в размере модификатора Телосложения.',
    effects: [{ type: 'hp', amount: 40 }],
    choices: [boonIncrease()],
    iconName: 'heart-plus',
  },
  {
    id: 'boon-of-irresistible-offense',
    name: 'Дар неотразимого нападения',
    category: 'epicBoon',
    prerequisite: L19,
    description: [
      '- **Сила или Ловкость +1** (не выше 30).',
      '- **Преодоление защиты**: ваш дробящий, колющий и рубящий урон всегда игнорирует сопротивление.',
      '- **Сокрушительный удар**: выбросив 20 на к20 при броске атаки, вы наносите дополнительный урон того же типа, равный значению характеристики, увеличенной этой чертой.',
    ].join('\n'),
    action: 'passive',
    choices: [boonIncrease(STR_DEX)],
    iconName: 'mailed-fist',
  },
  {
    id: 'boon-of-recovery',
    name: 'Дар восстановления',
    category: 'epicBoon',
    prerequisite: L19,
    description: [
      '- **Любая характеристика +1** (не выше 30).',
      '- **Последний рубеж**: когда ваши хиты опускаются до 0, вместо этого они становятся 1, и вы восстанавливаете хиты, равные половине максимума. Снова — после продолжительного отдыха.',
      '- **Жизненная сила**: у вас запас из десяти к10. Бонусным действием потратьте сколько угодно костей запаса, бросьте их и восстановите столько хитов. Запас возвращается после продолжительного отдыха.',
    ].join('\n'),
    action: 'bonus',
    resource: { id: 'feat.boon-of-recovery', name: 'Кости жизненной силы (к10)', max: 10, recharge: 'long' },
    choices: [boonIncrease()],
    iconName: 'healing',
  },
  {
    id: 'boon-of-skill',
    name: 'Дар умелости',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Мастер на все руки**: вы владеете всеми навыками.\n- **Экспертность** в одном навыке, где её у вас ещё нет.',
    effects: ALL_SKILLS.map((skill): Effect => ({ type: 'skill', skill })),
    choices: [boonIncrease(), { id: 'expertise', label: 'Экспертность', count: 1, options: { from: 'expertise' } }],
    iconName: 'book-cover',
  },
  {
    id: 'boon-of-speed',
    name: 'Дар скорости',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Ускользание**: бонусным действием вы совершаете действие «Отход» и заодно освобождаетесь от захвата.\n- **Быстрота**: скорость +30 футов.',
    action: 'bonus',
    effects: [{ type: 'speed', amount: 30 }],
    choices: [boonIncrease()],
    iconName: 'sprint',
  },
  {
    id: 'boon-of-spell-recall',
    name: 'Дар восстановления заклинаний',
    category: 'epicBoon',
    prerequisite: { level: 19, spellcasting: true, text: 'Умение «Использование заклинаний»' },
    description: '- **Интеллект, Мудрость или Харизма +1** (не выше 30).\n- **Свободное сотворение**: сотворив заклинание ячейкой 1–4-го уровня, бросьте к4. Если выпало число, равное уровню ячейки, она не тратится.',
    action: 'passive',
    choices: [boonIncrease(MENTAL)],
    iconName: 'spell-book',
  },
  {
    id: 'boon-of-the-night-spirit',
    name: 'Дар ночного духа',
    category: 'epicBoon',
    prerequisite: L19,
    description: [
      '- **Любая характеристика +1** (не выше 30).',
      '- **Слияние с тенями**: в тусклом свете или темноте вы можете бонусным действием стать невидимым. Невидимость заканчивается сразу после того, как вы совершите действие, бонусное действие или реакцию.',
      '- **Призрачный облик**: в тусклом свете или темноте вы сопротивляетесь всем видам урона, кроме психического и излучения.',
    ].join('\n'),
    action: 'bonus',
    choices: [boonIncrease()],
    iconName: 'moon',
  },
  {
    id: 'boon-of-truesight',
    name: 'Дар истинного зрения',
    category: 'epicBoon',
    prerequisite: L19,
    description: '- **Любая характеристика +1** (не выше 30).\n- **Истинное зрение** в радиусе 60 футов.',
    choices: [boonIncrease()],
    iconName: 'all-seeing-eye',
  },
];

export const FEATS: FeatDef[] = [...ORIGIN, ...GENERAL, ...FIGHTING_STYLES, ...EPIC_BOONS];
