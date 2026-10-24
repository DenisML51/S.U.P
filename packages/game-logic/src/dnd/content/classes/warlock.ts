import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { PACT_SLOTS, abilityScoreImprovement, byTable, epicBoon, subclassHeading } from './shared';

/** Колдун of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const INVOCATIONS_POOL = 'invocations';
const MAGICAL_CUNNING = 'warlock.magical-cunning';

const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('charisma');
const plus = (dice: string, modifier: number): string =>
  modifier === 0 ? dice : `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;

export const WARLOCK_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'leather-armor' },
      { ref: 'sickle' },
      { ref: 'dagger', quantity: 2 },
      { ref: 'arcane-focus' },
      { ref: 'book-occult' },
      { ref: 'scholars-pack' },
    ],
    gold: 15,
  },
  { id: 'b', label: 'B', items: [], gold: 100 },
];

/** New Eldritch Invocations of a level, so the total follows the class table. */
const moreInvocations = (level: number, count: number): FeatureDef => ({
  id: `warlock.invocations-${level}`,
  name: 'Новые воззвания',
  description: `Вы получаете ${count === 1 ? 'ещё одно таинственное воззвание' : `ещё ${count} таинственных воззвания`}.`,
  hidden: true,
  choices: [{ id: 'invocations', label: `Воззвания (${count})`, count, pool: INVOCATIONS_POOL, options: { from: 'catalog', catalog: 'invocations' } }],
});

/** Mystic Arcanum: one warlock spell of a level, cast once per long rest without a slot. */
const mysticArcanum = (spellLevel: number): FeatureDef => {
  const resource = `warlock.arcanum-${spellLevel}`;
  return {
    id: `warlock.mystic-arcanum-${spellLevel}`,
    name: `Таинственный арканум (${spellLevel} круг)`,
    description: `Покровитель открывает вам арканум — заклинание колдуна ${spellLevel}-го круга. Раз в продолжительный отдых вы творите его без ячейки. Повышая уровень колдуна, можно заменить его другим заклинанием колдуна ${spellLevel}-го круга.`,
    action: 'passive',
    iconName: 'book-aura',
    resource: { id: resource, name: `Арканум ${spellLevel} круга`, max: 1, recharge: 'long' },
    choices: [
      {
        id: 'spell',
        label: `Арканум: заклинание ${spellLevel} круга`,
        count: 1,
        spellAbility: 'charisma',
        spellResource: resource,
        options: { from: 'spells', lists: ['warlock'], minLevel: spellLevel, maxLevel: spellLevel },
      },
    ],
  };
};

// ------------------------------------------------------------------------------------------------
// Patrons
// ------------------------------------------------------------------------------------------------

const STEPS_OF_THE_FEY = 'archfey.steps-of-the-fey';

const archfey: SubclassDef = {
  id: 'archfey-patron',
  name: 'Архифея',
  description: 'Договор с повелителем Страны Фей: телепортация в шаге, чары и обманчивая защита.',
  alwaysPrepared: {
    3: ['calm-emotions', 'faerie-fire', 'misty-step', 'phantasmal-force', 'sleep'],
    5: ['blink', 'plant-growth'],
    7: ['dominate-beast', 'greater-invisibility'],
    9: ['dominate-person', 'seeming'],
  },
  levels: {
    3: [
      {
        id: 'archfey.steps-of-the-fey',
        name: 'Шаг феи',
        description:
          'Вы творите «Туманный шаг» без ячейки число раз, равное модификатору Харизмы (минимум 1) за продолжительный отдых. Сотворяя его, можно добавить эффект:\n\n- **Освежающий шаг:** сразу после телепортации вы или видимое существо в пределах 10 футов получает 1к10 временных хитов;\n- **Провоцирующий шаг:** каждое существо в пределах 5 футов от покинутого места совершает спасбросок Мудрости или до начала вашего следующего хода атакует с помехой всех, кроме вас.',
        action: 'bonus',
        resource: { id: STEPS_OF_THE_FEY, name: 'Шаг феи', max: modifierOf('charisma'), recharge: 'long' },
        damage: '1d10',
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'teleport',
      },
    ],
    6: [
      {
        id: 'archfey.misty-escape',
        name: 'Туманное исчезновение',
        description:
          'Вы можете сотворить «Туманный шаг» реакцией на получение урона. Шагу феи доступны новые эффекты:\n\n- **Скрывающий шаг:** вы невидимы до начала своего следующего хода или пока не атакуете, не нанесёте урон или не сотворите заклинание;\n- **Ужасающий шаг:** каждое существо в пределах 5 футов от места, которое вы покинули или где появились (на выбор), совершает спасбросок Мудрости или получает 2к10 психического урона.',
        action: 'reaction',
        usesResource: { id: STEPS_OF_THE_FEY },
        damage: '2d10',
        damageType: 'Психический',
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'fairy-wings',
      },
    ],
    10: [
      {
        id: 'archfey.beguiling-defenses',
        name: 'Чарующая защита',
        description:
          'Вы иммунны к очарованию. Сразу после того, как видимое существо попадает по вам атакой, вы можете реакцией уменьшить урон вдвое (с округлением вниз) и заставить атакующего совершить спасбросок Мудрости: при провале он получает психический урон, равный полученному вами. Раз в продолжительный отдых; использование можно вернуть, потратив ячейку Магии договора.',
        action: 'reaction',
        resource: { id: 'archfey.beguiling-defenses', name: 'Чарующая защита', max: 1, recharge: 'long' },
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'mirror-mirror',
      },
    ],
    14: [
      {
        id: 'archfey.bewitching-magic',
        name: 'Завораживающая магия',
        description: 'Сразу после того, как вы действием сотворите заклинание школы очарования или иллюзии с тратой ячейки, вы можете частью того же действия сотворить «Туманный шаг» без ячейки.',
        action: 'passive',
        iconName: 'magic-hat',
      },
    ],
  },
};

const celestial: SubclassDef = {
  id: 'celestial-patron',
  name: 'Небожитель',
  description: 'Договор с силой Верхних планов: целительный свет, сияющая душа и пламя возмездия.',
  alwaysPrepared: {
    3: ['aid', 'cure-wounds', 'guiding-bolt', 'lesser-restoration', 'light', 'sacred-flame'],
    5: ['daylight', 'revivify'],
    7: ['guardian-of-faith', 'wall-of-fire'],
    9: ['greater-restoration', 'summon-celestial'],
  },
  levels: {
    3: [
      {
        id: 'celestial.healing-light',
        name: 'Лечащий свет',
        description:
          'У вас есть запас к6 в количестве 1 + уровень колдуна. Бонусным действием вы тратите кости из запаса (не больше модификатора Харизмы, минимум 1) и восстанавливаете себе или видимому существу в пределах 60 футов хиты, равные их сумме. Запас восполняется после продолжительного отдыха.',
        action: 'bonus',
        resource: { id: 'celestial.healing-light', name: 'Кости лечащего света (к6)', max: (ctx) => 1 + ctx.classLevel, recharge: 'long' },
        damage: (ctx) => `${Math.max(1, ctx.modifier('charisma'))}d6`,
        damageType: 'Лечение',
        iconName: 'healing',
        color: '#e8c55a',
      },
    ],
    6: [
      {
        id: 'celestial.radiant-soul',
        name: 'Сияющая душа',
        description: 'Вы получаете сопротивление лучистому урону. Раз в ход, когда ваше заклинание наносит лучистый урон или урон огнём, вы добавляете модификатор Харизмы к урону по одной из его целей.',
        action: 'passive',
        effects: [{ type: 'resistance', damageType: 'Лучистый' }],
        iconName: 'sun',
      },
    ],
    10: [
      {
        id: 'celestial.celestial-resilience',
        name: 'Небесная стойкость',
        description:
          'Используя Магическую искусность или завершая короткий или продолжительный отдых, вы получаете временные хиты: уровень колдуна + модификатор Харизмы. Тогда же до пяти видимых вами существ получают временные хиты: половина уровня колдуна + модификатор Харизмы.',
        action: 'passive',
        iconName: 'heart-wings',
      },
    ],
    14: [
      {
        id: 'celestial.searing-vengeance',
        name: 'Опаляющее возмездие',
        description:
          'Когда вы или союзник в пределах 60 футов должны совершить спасбросок от смерти, вы можете спасти его сиянием: он восстанавливает половину максимума хитов и может встать. Выбранные вами существа в пределах 30 футов от него получают 2к8 + модификатор Харизмы лучистого урона и ослеплены до конца текущего хода. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'celestial.searing-vengeance', name: 'Опаляющее возмездие', max: 1, recharge: 'long' },
        damage: (ctx) => plus('2d8', ctx.modifier('charisma')),
        damageType: 'Лучистый',
        iconName: 'sun-spear',
        color: '#e8c55a',
      },
    ],
  },
};

const fiend: SubclassDef = {
  id: 'fiend-patron',
  name: 'Исчадие',
  description: 'Сделка с владыкой Нижних планов: сила от гибели врагов, удача тьмы и бросок через преисподнюю.',
  alwaysPrepared: {
    3: ['burning-hands', 'command', 'scorching-ray', 'suggestion'],
    5: ['fireball', 'stinking-cloud'],
    7: ['fire-shield', 'wall-of-fire'],
    9: ['geas', 'insect-plague'],
  },
  levels: {
    3: [
      {
        id: 'fiend.dark-ones-blessing',
        name: 'Благословение темнейшего',
        description:
          'Когда вы опускаете хиты врага до 0 — или кто-то другой опускает до 0 хиты врага в пределах 10 футов от вас, — вы получаете временные хиты: модификатор Харизмы + уровень колдуна (минимум 1).',
        action: 'passive',
        iconName: 'fire',
      },
    ],
    6: [
      {
        id: 'fiend.dark-ones-own-luck',
        name: 'Удача темнейшего',
        description:
          'Совершая проверку характеристики или спасбросок, вы можете добавить к нему 1к10 — даже после броска, но до того, как известен результат. Не больше раза на один бросок. Использований — модификатор Харизмы (минимум 1) за продолжительный отдых.',
        action: 'passive',
        resource: { id: 'fiend.dark-ones-own-luck', name: 'Удача темнейшего', max: modifierOf('charisma'), recharge: 'long' },
        iconName: 'dice-fire',
      },
    ],
    10: [
      {
        id: 'fiend.fiendish-resilience',
        name: 'Устойчивость исчадия',
        description: 'Завершая короткий или продолжительный отдых, выберите вид урона, кроме силового: у вас есть сопротивление ему, пока вы не выберете другой.',
        action: 'passive',
        iconName: 'fire-shield',
      },
    ],
    14: [
      {
        id: 'fiend.hurl-through-hell',
        name: 'Бросок через преисподнюю',
        description:
          'Раз в ход, попав по существу броском атаки, вы можете попытаться протащить его через Нижние планы: оно совершает спасбросок Харизмы. При провале оно исчезает, получает 8к10 психического урона (если не исчадие) и недееспособно до конца вашего следующего хода, затем возвращается на своё место или ближайшее свободное. Раз в продолжительный отдых; использование можно вернуть, потратив ячейку Магии договора.',
        action: 'passive',
        resource: { id: 'fiend.hurl-through-hell', name: 'Бросок через преисподнюю', max: 1, recharge: 'long' },
        damage: '8d10',
        damageType: 'Психический',
        saveAttribute: 'charisma',
        saveDC: spellDC,
        iconName: 'magic-portal',
      },
    ],
  },
};

const greatOldOne: SubclassDef = {
  id: 'great-old-one-patron',
  name: 'Великий древний',
  description: 'Договор с неописуемой сущностью Дальнего предела или древним богом: телепатия, психическая магия и порабощённые аберрации.',
  alwaysPrepared: {
    3: ['detect-thoughts', 'dissonant-whispers', 'phantasmal-force', 'tashas-hideous-laughter'],
    5: ['clairvoyance', 'hunger-of-hadar'],
    7: ['confusion', 'summon-aberration'],
    9: ['modify-memory', 'telekinesis'],
  },
  levels: {
    3: [
      {
        id: 'great-old-one.awakened-mind',
        name: 'Пробуждённый разум',
        description:
          'Бонусным действием вы устанавливаете телепатическую связь с видимым существом в пределах 30 футов на число минут, равное уровню колдуна: вы общаетесь мысленно на расстоянии до (модификатор Харизмы, минимум 1) миль, если знаете общий язык. Новая связь обрывает прежнюю.',
        action: 'bonus',
        iconName: 'brain',
      },
      {
        id: 'great-old-one.psychic-spells',
        name: 'Психические заклинания',
        description: 'Урон ваших заклинаний колдуна можно сделать психическим. Заклинания колдуна школ очарования и иллюзии вы творите без вербального и соматического компонентов.',
        action: 'passive',
        iconName: 'psychic-waves',
      },
    ],
    6: [
      {
        id: 'great-old-one.clairvoyant-combatant',
        name: 'Провидящий боец',
        description:
          'Пока длится связь Пробуждённого разума, вы можете заставить существо совершить спасбросок Мудрости: при провале до конца связи оно атакует вас с помехой, а вы его — с преимуществом. Раз в короткий или продолжительный отдых; использование можно вернуть, потратив ячейку Магии договора.',
        action: 'passive',
        resource: { id: 'great-old-one.clairvoyant-combatant', name: 'Провидящий боец', max: 1, recharge: 'shortOrLong' },
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'third-eye',
      },
    ],
    10: [
      {
        id: 'great-old-one.eldritch-hex',
        name: 'Мистический сглаз',
        description: 'Заклинание «Сглаз» у вас всегда подготовлено. Пока оно действует, цель совершает с помехой спасброски выбранной для него характеристики.',
        action: 'passive',
        effects: [{ type: 'spell', spell: 'hex', alwaysPrepared: true }],
        iconName: 'cursed-star',
      },
      {
        id: 'great-old-one.thought-shield',
        name: 'Ментальный щит',
        description: 'Ваши мысли нельзя прочесть без вашего согласия. У вас сопротивление психическому урону, и существо, нанёсшее вам психический урон, получает столько же.',
        action: 'passive',
        effects: [{ type: 'resistance', damageType: 'Психический' }],
        iconName: 'brain-tentacle',
      },
    ],
    14: [
      {
        id: 'great-old-one.create-thrall',
        name: 'Порабощение',
        description:
          '«Вызов аберрации» можно сотворить без концентрации (длительность 1 минута); призванная аберрация получает временные хиты: уровень колдуна + модификатор Харизмы. Первое за ход попадание аберрации по цели вашего «Сглаза» наносит дополнительный психический урон, равный урону «Сглаза».',
        action: 'passive',
        iconName: 'tentacle-strike',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Patrons of other books
// ------------------------------------------------------------------------------------------------

const FORM_OF_DREAD = 'undead.form-of-dread';

const undead: SubclassDef = {
  id: 'undead-patron',
  name: 'Нежить',
  source: 'Ravenloft: The Horrors Within',
  description: 'Договор с существом, обманувшим смерть, — личом, вампиром или иной нежитью: облик ужаса, некротическая магия и отказ умирать.',
  alwaysPrepared: {
    3: ['bane', 'blindness-deafness', 'phantasmal-force', 'ray-of-sickness'],
    5: ['speak-with-dead', 'summon-undead'],
    7: ['greater-invisibility', 'phantasmal-killer'],
    9: ['antilife-shell', 'cloudkill'],
  },
  levels: {
    3: [
      {
        id: 'undead.form-of-dread',
        name: 'Аватар ужаса',
        description:
          'Бонусным действием вы на 1 минуту принимаете облик аватара покровителя; облик кончается раньше, если вы становитесь недееспособны или прекращаете его (без действия). Использований — модификатор Харизмы (минимум 1) за продолжительный отдых. В облике:\n\n- **Отпечаток жизни:** при превращении вы получаете 1к10 + уровень колдуна временных хитов;\n- **Бесстрашный облик:** иммунитет к испугу (испуг на вас сразу оканчивается);\n- **Ужасающий аватар:** раз в ход, попав по существу броском атаки, вы можете заставить его совершить спасбросок Мудрости — при провале оно испугано до конца вашего следующего хода.',
        action: 'bonus',
        resource: { id: FORM_OF_DREAD, name: 'Аватар ужаса', max: modifierOf('charisma'), recharge: 'long' },
        damage: (ctx) => `1d10+${ctx.classLevel}`,
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'dread-skull',
        color: '#7d8a6a',
      },
    ],
    6: [
      {
        id: 'undead.grave-touched',
        name: 'Прикосновение могилы',
        description:
          '- **Магический некроз:** некротический урон ваших атак, заклинаний и умений колдуна игнорирует сопротивление; раз в ход урон сотворяемого заклинания можно сделать некротическим.\n- **Чудовищный некроз:** раз в ход, когда в облике аватара вы попадаете атакой и наносите некротический урон, бросьте одну дополнительную кость урона.\n- **Выносливость неживых:** вы не получаете истощения от удушья, голода и жажды, не нуждаетесь во сне, и магия не может вас усыпить.',
        action: 'passive',
        iconName: 'death-skull',
      },
    ],
    10: [
      {
        id: 'undead.necrotic-husk',
        name: 'Некротическая оболочка',
        description: 'У вас сопротивление некротическому урону, а в облике Аватара ужаса — иммунитет к нему.',
        effects: [{ type: 'resistance', damageType: 'Некротический' }],
        iconName: 'skull-staff',
      },
      {
        id: 'undead.unholy-revival',
        name: 'Нечестивое оживление',
        description:
          'Когда ваши хиты опускаются до 0, но вы не убиты мгновенно, выберите существ в эманации 30 футов: они совершают спасбросок Телосложения и получают 2к10 + модификатор Харизмы некротического урона (половину при успехе). Затем ваши хиты становятся равны 2 × уровень колдуна, и вы получаете 1 уровень истощения. Раз в короткий или продолжительный отдых.',
        action: 'passive',
        resource: { id: 'undead.unholy-revival', name: 'Нечестивое оживление', max: 1, recharge: 'shortOrLong' },
        damage: (ctx) => plus('2d10', ctx.modifier('charisma')),
        damageType: 'Некротический',
        saveAttribute: 'constitution',
        saveDC: spellDC,
        iconName: 'death-zone',
        color: '#7d8a6a',
      },
    ],
    14: [
      {
        id: 'undead.mortal-dread',
        name: 'Совершенный ужас',
        description:
          'В облике Аватара ужаса вы также получаете:\n\n- **Защита ужасом:** сопротивление дробящему, колющему и рубящему урону;\n- **Призрачный полёт:** скорость полёта, равная скорости, и парение; вы проходите сквозь существ и предметы как через труднопроходимую местность, а закончив ход внутри них, получаете 1к10 силового урона;\n- **Осквернённая магия:** заклинания колдуна школ Вызова и Некромантии вы творите без вербального, соматического и материального компонентов (кроме материальных с ценой или расходуемых).',
        action: 'passive',
        iconName: 'spectre',
      },
    ],
  },
};

/** Domain spells of the four PHB cleric domains, which the Vestige patron borrows by warlock level. */
const VESTIGE_DOMAINS: { id: string; name: string; of: string; spells: Record<number, string[]> }[] = [
  {
    id: 'war',
    name: 'Война',
    of: 'Войны',
    spells: {
      3: ['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon'],
      5: ['crusaders-mantle', 'spirit-guardians'],
      7: ['fire-shield', 'freedom-of-movement'],
      9: ['hold-monster', 'steel-wind-strike'],
    },
  },
  {
    id: 'life',
    name: 'Жизнь',
    of: 'Жизни',
    spells: {
      3: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'],
      5: ['mass-healing-word', 'revivify'],
      7: ['aura-of-life', 'death-ward'],
      9: ['greater-restoration', 'mass-cure-wounds'],
    },
  },
  {
    id: 'trickery',
    name: 'Обман',
    of: 'Обмана',
    spells: {
      3: ['charm-person', 'disguise-self', 'invisibility', 'pass-without-trace'],
      5: ['hypnotic-pattern', 'nondetection'],
      7: ['confusion', 'dimension-door'],
      9: ['dominate-person', 'modify-memory'],
    },
  },
  {
    id: 'light',
    name: 'Свет',
    of: 'Света',
    spells: {
      3: ['burning-hands', 'faerie-fire', 'scorching-ray', 'see-invisibility'],
      5: ['daylight', 'fireball'],
      7: ['arcane-eye', 'wall-of-fire'],
      9: ['flame-strike', 'scrying'],
    },
  },
];

const vestige: SubclassDef = {
  id: 'vestige-patron',
  name: 'Предтеча',
  source: 'Arcana Unleashed',
  description: 'Договор с умирающим забытым богом, который ищет былой мощи: заклинания домена и спутник-предтеча, сражающийся рядом.',
  levels: {
    3: [
      {
        id: 'vestige.vestige-spells',
        name: 'Заклинания Предтечи',
        description:
          'Выберите домен жреца: Война, Жизнь, Обман или Свет. Его заклинания считаются для вас заклинаниями колдуна и всегда подготовлены, начиная с того уровня колдуна, который указан в таблице домена (3, 5, 7 и 9).',
        iconName: 'holy-symbol',
        choices: [
          {
            id: 'domain',
            label: 'Домен Предтечи',
            count: 1,
            options: {
              from: 'options',
              options: VESTIGE_DOMAINS.map((domain) => ({
                id: domain.id,
                name: domain.name,
                description: `Заклинания домена ${domain.of} всегда подготовлены: четыре с 3-го уровня колдуна и по два с 5, 7 и 9-го.`,
                effects: (ctx: BuildContext) =>
                  Object.entries(domain.spells)
                    .filter(([level]) => ctx.classLevel >= Number(level))
                    .flatMap(([, spells]) => spells.map((spell) => ({ type: 'spell' as const, spell, alwaysPrepared: true }))),
              })),
            },
          },
        ],
      },
      {
        id: 'vestige.vestige-companion',
        name: 'Спутник-предтеча',
        description:
          'Предтеча обретает тело со статистикой «Спутника-предтечи»; вы выбираете его тип (Исчадие, Небожитель или Нежить) и облик. Он дружелюбен к вам и союзникам и исчезает, если вы умираете.\n\n- **В бою** он действует в ваш ход, сам двигается и тратит реакцию, но совершает только Уклонение, если вы бонусным действием не прикажете иное; вместо одной из атак действия Атака вы можете приказать ему Удар предтечи. Если вы недееспособны, он действует сам.\n- **Исчезновение:** при 0 хитов он исчезает; ритуал в 1 минуту призывает его снова с полными хитами в пределах 5 футов. Действием Магия его можно отослать в карманное измерение и вернуть в пределах 30 футов.\n- После продолжительного отдыха его можно призвать заново в другой форме и с другим типом.',
        action: 'bonus',
        iconName: 'crowned-skull',
      },
    ],
    6: [
      {
        id: 'vestige.vestiges-might',
        name: 'Мощь предтечи',
        description:
          'Спутник-предтеча восстанавливает Божественную силу после короткого или продолжительного отдыха и когда вы используете Магическую искусность. Пока вы в пределах 30 футов от него, у вас сопротивление тем же видам урона, что и у него.',
        action: 'passive',
        iconName: 'aura',
      },
    ],
    10: [
      {
        id: 'vestige.vestige-restoration',
        name: 'Восстановление предтечи',
        description:
          'Когда хиты Спутника-предтечи опускаются до 0, вы можете реакцией потратить ячейку Магии договора: вместо этого его хиты становятся максимальными, и он телепортируется в видимое свободное пространство в пределах 30 футов. Раз в продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'vestige.vestige-restoration', name: 'Восстановление предтечи', max: 1, recharge: 'long' },
        iconName: 'regeneration',
      },
    ],
    14: [
      {
        id: 'vestige.semblance-of-life',
        name: 'Подобие жизни',
        description:
          'Действием Магия вы на 1 час превращаете Спутника-предтечу в пределах 90 футов в Духа исчадия, Духа небожителя или Духа нежити (по его типу) с уровнем заклинания, равным половине уровня колдуна (вниз, максимум 9). Он сохраняет личность, Божественную силу, хиты и кости хитов и получает временные хиты, равные хитам формы духа; превращение кончается, когда они заканчиваются, или через 1 час. Раз в продолжительный отдых.',
        action: 'action',
        resource: { id: 'vestige.semblance-of-life', name: 'Подобие жизни', max: 1, recharge: 'long' },
        iconName: 'angel-outfit',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

export const WARLOCK: ClassDef = {
  id: 'warlock',
  name: 'Колдун',
  description: 'Оккультист, черпающий силу из договора с потусторонним покровителем: немного ячеек, что возвращаются на коротком отдыхе, и таинственные воззвания.',
  hitDie: 8,
  primary: ['charisma'],
  saves: ['wisdom', 'charisma'],
  skillChoices: { count: 2, list: ['intimidation', 'history', 'deception', 'nature', 'investigation', 'religion', 'arcana'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
  ],
  mentalStrength: 40,
  subclassLevel: 3,
  subclasses: [archfey, celestial, fiend, greatOldOne, undead, vestige],
  startingEquipment: WARLOCK_KITS,
  replaceable: [{ pool: INVOCATIONS_POOL, label: 'Замена воззвания' }],
  spellcasting: {
    ability: 'charisma',
    list: 'warlock',
    slots: [],
    pact: PACT_SLOTS,
    mode: 'known',
    cantrips: byClassLevel({ 1: 2, 4: 3, 10: 4 }),
    prepared: byTable([2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]),
  },
  levels: {
    1: [
      {
        id: 'warlock.eldritch-invocations',
        name: 'Таинственные воззвания',
        description:
          'Вы знаете таинственные воззвания — осколки запретного знания. Их число растёт: 1 на 1-м уровне, 3 на 2-м, 5 на 5-м, 6 на 7-м, 7 на 9-м, 8 на 12-м, 9 на 15-м и 10 на 18-м. Воззвание с требованием можно взять, только выполнив его. Повышая уровень колдуна, можно заменить одно воззвание другим (кроме того, что нужно для другого вашего воззвания).',
        action: 'passive',
        iconName: 'pentacle',
        choices: [{ id: 'invocations', label: 'Воззвание', count: 1, pool: INVOCATIONS_POOL, options: { from: 'catalog', catalog: 'invocations' } }],
      },
      {
        id: 'warlock.pact-magic',
        name: 'Магия договора',
        description:
          'Вы творите заклинания колдуна Харизмой (СЛ = 8 + бонус мастерства + модификатор Харизмы; бонус атаки = бонус мастерства + модификатор Харизмы), фокусировка — магическая. Все ячейки договора одного круга, и заклинание всегда творится на этом круге; они возвращаются после короткого или продолжительного отдыха. Повышая уровень, можно заменить один заговор и одно заклинание.',
        action: 'passive',
        iconName: 'warlock-hood',
      },
    ],
    2: [
      {
        id: 'warlock.magical-cunning',
        name: 'Магическая искусность',
        description:
          'Проведя эзотерический ритуал длительностью 1 минута, вы восстанавливаете потраченные ячейки Магии договора — не больше половины максимума (с округлением вверх). Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: MAGICAL_CUNNING, name: 'Магическая искусность', max: 1, recharge: 'long' },
        iconName: 'hourglass',
      },
      moreInvocations(2, 2),
    ],
    3: [subclassHeading('warlock', 'Покровитель', 'Вы выбираете покровителя, с которым заключили договор; он даёт умения на 3, 6, 10 и 14 уровнях.')],
    4: [abilityScoreImprovement('warlock', 4)],
    5: [moreInvocations(5, 2)],
    7: [moreInvocations(7, 1)],
    8: [abilityScoreImprovement('warlock', 8)],
    9: [
      {
        id: 'warlock.contact-patron',
        name: 'Связь с покровителем',
        description:
          'Заклинание «Связь с иным планом» у вас всегда подготовлено. Раз в продолжительный отдых вы можете сотворить его, чтобы связаться с покровителем, без ячейки — и автоматически преуспеваете в его спасброске.',
        action: 'passive',
        resource: { id: 'warlock.contact-patron', name: 'Связь с покровителем', max: 1, recharge: 'long' },
        effects: [{ type: 'spell', spell: 'contact-other-plane', alwaysPrepared: true }],
        iconName: 'contract',
      },
      moreInvocations(9, 1),
    ],
    11: [mysticArcanum(6)],
    12: [abilityScoreImprovement('warlock', 12), moreInvocations(12, 1)],
    13: [mysticArcanum(7)],
    15: [mysticArcanum(8), moreInvocations(15, 1)],
    16: [abilityScoreImprovement('warlock', 16)],
    17: [mysticArcanum(9)],
    18: [moreInvocations(18, 1)],
    19: [epicBoon('warlock')],
    20: [
      {
        id: 'warlock.eldritch-master',
        name: 'Таинственный мастер',
        description: 'Используя Магическую искусность, вы восстанавливаете все потраченные ячейки Магии договора.',
        action: 'passive',
        iconName: 'vortex',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const WARLOCK_ICONS = {
  class: 'warlock-eye',
  subclasses: {
    'archfey-patron': 'fairy',
    'celestial-patron': 'angel-wings',
    'fiend-patron': 'imp',
    'great-old-one-patron': 'tentacles-skull',
    'undead-patron': 'grim-reaper',
    'vestige-patron': 'sun-priest',
  } as Record<string, string>,
};
