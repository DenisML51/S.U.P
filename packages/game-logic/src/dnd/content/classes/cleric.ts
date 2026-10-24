import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { FULL_CASTER_SLOTS, abilityScoreImprovement, byTable, epicBoon, subclassHeading } from './shared';

/** Жрец of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const CHANNEL_DIVINITY = 'cleric.channel-divinity';

/** Spell save DC of the cleric: Channel Divinity effects use it too. */
const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('wisdom');

/** "+N" / "-N" for a modifier added to dice ("1d8+3"). */
const plus = (modifier: number) => (modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`);

const channelOption = (
  id: string,
  name: string,
  description: string,
  extra: Partial<FeatureDef> = {},
): FeatureDef => ({
  id,
  name,
  description,
  action: 'action',
  usesResource: { id: CHANNEL_DIVINITY },
  iconName: 'sunbeams',
  ...extra,
});

const CLERIC_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [{ ref: 'chain-shirt' }, { ref: 'shield' }, { ref: 'mace' }, { ref: 'holy-symbol' }, { ref: 'priests-pack' }],
    gold: 7,
  },
  { id: 'b', label: 'B', items: [], gold: 110 },
];

// ------------------------------------------------------------------------------------------------
// Domains
// ------------------------------------------------------------------------------------------------

const life: SubclassDef = {
  id: 'life-domain',
  name: 'Домен жизни',
  description: 'Служитель положительной энергии, питающей всё живое: мастер исцеления, чьи заклинания лечат сильнее и чаще.',
  alwaysPrepared: {
    3: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'],
    5: ['mass-healing-word', 'revivify'],
    7: ['aura-of-life', 'death-ward'],
    9: ['greater-restoration', 'mass-cure-wounds'],
  },
  levels: {
    3: [
      {
        id: 'life.disciple-of-life',
        name: 'Поборник жизни',
        description: 'Когда заклинание, сотворённое с ячейкой, восстанавливает существу хиты, в этот ход оно восстанавливает дополнительно 2 + круг ячейки хитов.',
        action: 'passive',
        iconName: 'heart-plus',
      },
      channelOption(
        'life.preserve-life',
        'Сохранение жизни',
        'Действием «Магия» вы показываете священный символ и тратите Проведение божественности: распределите между Окровавленными существами в пределах 30 футов (можно и себе) хиты в количестве 5 × уровень жреца. Существо не может восстановить так больше половины своего максимума хитов.',
        { damage: (ctx) => String(5 * ctx.classLevel), damageType: 'Лечение', iconName: 'healing', color: '#7fc98a' },
      ),
    ],
    6: [
      {
        id: 'life.blessed-healer',
        name: 'Благословенный целитель',
        description: 'Сразу после того, как вы сотворили с ячейкой заклинание, восстановившее хиты хотя бы одному существу кроме вас, вы восстанавливаете себе 2 + круг ячейки хитов.',
        action: 'passive',
        iconName: 'healing-shield',
      },
    ],
    17: [
      {
        id: 'life.supreme-healing',
        name: 'Высшее исцеление',
        description: 'Когда заклинание или Проведение божественности восстанавливает хиты бросками костей, вы не бросаете их, а берёте максимальное значение каждой кости (2к6 → 12).',
        action: 'passive',
        iconName: 'regeneration',
      },
    ],
  },
};

const light: SubclassDef = {
  id: 'light-domain',
  name: 'Домен света',
  description: 'Носитель пылающего огня и истины: жрец, который выжигает тьму лучистым светом и слепит врагов вспышками.',
  alwaysPrepared: {
    3: ['burning-hands', 'faerie-fire', 'scorching-ray', 'see-invisibility'],
    5: ['daylight', 'fireball'],
    7: ['arcane-eye', 'wall-of-fire'],
    9: ['flame-strike', 'scrying'],
  },
  levels: {
    3: [
      {
        id: 'light.warding-flare',
        name: 'Ограждающая вспышка',
        description:
          'Реакцией, когда видимое вами существо в пределах 30 футов совершает бросок атаки, вы накладываете на него помеху вспышкой света (до того, как станет ясен результат). Использований — модификатор Мудрости (минимум 1); восполняются после продолжительного отдыха (с 6-го уровня — и после короткого).',
        action: 'reaction',
        resource: {
          id: 'light.warding-flare',
          name: 'Ограждающая вспышка',
          max: modifierOf('wisdom'),
          recharge: (ctx) => (ctx.classLevel >= 6 ? 'shortOrLong' : 'long'),
        },
        iconName: 'shield-reflect',
        color: '#f2d16b',
      },
      channelOption(
        'light.radiance-of-the-dawn',
        'Сияние рассвета',
        'Действием «Магия» вы показываете священный символ и тратите Проведение божественности: вспышка в эманации 30 футов рассеивает магическую тьму, а выбранные существа в ней совершают спасбросок Телосложения — 2к10 + уровень жреца урона излучением при провале, половина при успехе.',
        {
          damage: (ctx) => `2d10+${ctx.classLevel}`,
          damageType: 'Лучистый',
          saveAttribute: 'constitution',
          saveDC: spellDC,
          iconName: 'sunrise',
          color: '#f2d16b',
        },
      ),
    ],
    6: [
      {
        id: 'light.improved-warding-flare',
        name: 'Улучшенная ограждающая вспышка',
        description: 'Ограждающая вспышка восполняется и после короткого отдыха. Используя её, вы можете дать цели атаки временные хиты: 2к6 + модификатор Мудрости.',
        action: 'passive',
        iconName: 'energy-shield',
      },
    ],
    17: [
      {
        id: 'light.corona-of-light',
        name: 'Корона света',
        description:
          'Действием «Магия» вы на 1 минуту (или пока не прекратите, без действия) излучаете солнечный свет: яркий на 60 футов и тусклый ещё на 30. Враги в ярком свете совершают с помехой спасброски от Сияния рассвета и от заклинаний, наносящих урон огнём или излучением. Использований — модификатор Мудрости (минимум 1) за продолжительный отдых.',
        action: 'action',
        resource: { id: 'light.corona-of-light', name: 'Корона света', max: modifierOf('wisdom'), recharge: 'long' },
        iconName: 'sun',
        color: '#f2d16b',
      },
    ],
  },
};

const trickery: SubclassDef = {
  id: 'trickery-domain',
  name: 'Домен обмана',
  description: 'Пакостник и освободитель: иллюзии, скрытность и двойник, который отвлекает врагов и творит за вас заклинания.',
  alwaysPrepared: {
    3: ['charm-person', 'disguise-self', 'invisibility', 'pass-without-trace'],
    5: ['hypnotic-pattern', 'nondetection'],
    7: ['confusion', 'dimension-door'],
    9: ['dominate-person', 'modify-memory'],
  },
  levels: {
    3: [
      {
        id: 'trickery.blessing-of-the-trickster',
        name: 'Благословение обманщика',
        description: 'Действием «Магия» вы благословляете себя или согласное существо в пределах 30 футов: оно совершает с преимуществом проверки Ловкости (Скрытность), пока вы не закончите продолжительный отдых или не используете умение снова.',
        action: 'action',
        iconName: 'hood',
      },
      channelOption(
        'trickery.invoke-duplicity',
        'Двуличность',
        'Бонусным действием вы тратите Проведение божественности и создаёте неосязаемую иллюзию себя в незанятом пространстве в пределах 30 футов на 1 минуту (пока вы дееспособны; можно рассеять без действия). Пока она есть:\n\n- **Заклинания.** Вы можете творить их так, будто находитесь на месте иллюзии (пользуясь своими чувствами).\n- **Отвлечение.** Если вы и иллюзия в пределах 5 футов от существа, которое её видит, ваши атаки по нему совершаются с преимуществом.\n- **Перемещение.** Бонусным действием иллюзию можно переместить на 30 футов в видимое пространство в пределах 120 футов.',
        { action: 'bonus', iconName: 'mirror-mirror' },
      ),
    ],
    6: [
      {
        id: 'trickery.tricksters-transposition',
        name: 'Рокировка',
        description: 'Каждый раз, когда вы бонусным действием создаёте или перемещаете иллюзию Двуличности, вы можете телепортироваться, поменявшись с ней местами.',
        action: 'passive',
        iconName: 'teleport',
      },
    ],
    17: [
      {
        id: 'trickery.improved-duplicity',
        name: 'Улучшенная двуличность',
        description:
          '- **Усиленное отвлечение.** Вы и союзники совершаете с преимуществом атаки по существам в пределах 5 футов от иллюзии.\n- **Иллюзия исцеления.** Когда иллюзия исчезает, вы или существо в пределах 5 футов от неё восстанавливаете хиты, равные уровню жреца.',
        action: 'passive',
        damage: (ctx) => String(ctx.classLevel),
        damageType: 'Лечение',
        iconName: 'invisible',
      },
    ],
  },
};

const war: SubclassDef = {
  id: 'war-domain',
  name: 'Домен войны',
  description: 'Боевой священник, вдохновляющий на доблесть: лишние удары, божественная меткость и неуязвимость в гуще сражения.',
  alwaysPrepared: {
    3: ['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon'],
    5: ['crusaders-mantle', 'spirit-guardians'],
    7: ['fire-shield', 'freedom-of-movement'],
    9: ['hold-monster', 'steel-wind-strike'],
  },
  levels: {
    3: [
      {
        id: 'war.war-priest',
        name: 'Боевой священник',
        description: 'Бонусным действием вы совершаете одну атаку оружием или безоружный удар. Использований — модификатор Мудрости (минимум 1); восполняются после короткого или продолжительного отдыха.',
        action: 'bonus',
        resource: { id: 'war.war-priest', name: 'Боевой священник', max: modifierOf('wisdom'), recharge: 'shortOrLong' },
        iconName: 'sword-brandish',
      },
      channelOption(
        'war.guided-strike',
        'Направленный удар',
        'Когда вы или существо в пределах 30 футов промахивается броском атаки, вы можете потратить Проведение божественности и дать броску +10, что может превратить промах в попадание. Для броска другого существа это требует реакции.',
        { action: 'reaction', iconName: 'eye-target' },
      ),
    ],
    6: [
      channelOption(
        'war.war-gods-blessing',
        'Благословение бога войны',
        'Вы можете сотворить «Щит веры» или «Духовное оружие», потратив вместо ячейки Проведение божественности. Тогда заклинание не требует концентрации, но длится 1 минуту и оканчивается раньше, если вы сотворите его снова, станете Недееспособным или умрёте.',
        { action: 'passive', iconName: 'rune-sword' },
      ),
    ],
    17: [
      {
        id: 'war.avatar-of-battle',
        name: 'Воплощение битвы',
        description: 'Вы получаете сопротивление дробящему, колющему и рубящему урону.',
        action: 'passive',
        effects: [
          { type: 'resistance', damageType: 'Дробящий' },
          { type: 'resistance', damageType: 'Колющий' },
          { type: 'resistance', damageType: 'Рубящий' },
        ],
        iconName: 'spartan-helmet',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

const divineOrder: FeatureDef = {
  id: 'cleric.divine-order',
  name: 'Божественный орден',
  description: 'Вы посвящаете себя одной из священных ролей: Защитник или Чудотворец.',
  iconName: 'prayer',
  choices: [
    {
      id: 'order',
      label: 'Божественный орден',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'protector',
            name: 'Защитник',
            description: 'Владение воинским оружием и тренированность с тяжёлыми доспехами.',
            effects: [
              { type: 'proficiency', category: 'armor', value: 'Тяжёлые доспехи' },
              { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
            ],
          },
          {
            id: 'thaumaturge',
            name: 'Чудотворец',
            description: 'Ещё один заговор жреца и бонус модификатора Мудрости к проверкам Тайной магии и Религии.',
            features: [
              {
                id: 'cleric.thaumaturge',
                name: 'Чудотворец',
                description: 'Вы знаете один дополнительный заговор жреца. К проверкам Интеллекта (Тайная магия и Религия) вы прибавляете модификатор Мудрости (минимум +1).',
                iconName: 'sparkles',
                effects: [{ type: 'skillBonus', skills: ['arcana', 'religion'], amount: modifierOf('wisdom') }],
                choices: [
                  {
                    id: 'cantrip',
                    label: 'Заговор жреца (1)',
                    count: 1,
                    pool: 'known-cantrips',
                    spellAbility: 'wisdom',
                    options: { from: 'spells', lists: ['cleric'], maxLevel: 0 },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

/** Blessed Strikes of level 7, with what Improved Blessed Strikes adds on level 14. */
const blessedStrikes: FeatureDef = {
  id: 'cleric.blessed-strikes',
  name: 'Благословлённые удары',
  description: 'Божественная сила наполняет вас в бою: вы выбираете Божественный удар или Могущественные заклинания. С 14-го уровня выбранный вариант усиливается.',
  iconName: 'sword-clash',
  choices: [
    {
      id: 'strikes',
      label: 'Благословлённые удары',
      count: 1,
      options: {
        from: 'options',
        options: [
          {
            id: 'divine-strike',
            name: 'Божественный удар',
            description: 'Раз в ход при попадании оружием — дополнительно 1к8 некротического урона или урона излучением (2к8 с 14-го уровня).',
            features: [
              {
                id: 'cleric.divine-strike',
                name: 'Божественный удар',
                description: 'Раз в свой ход, попав броском атаки оружием, вы можете нанести цели дополнительно 1к8 некротического урона или урона излучением (на выбор). С 14-го уровня — 2к8.',
                action: 'passive',
                damage: (ctx) => (ctx.classLevel >= 14 ? '2d8' : '1d8'),
                damageType: 'Лучистый',
                iconName: 'sun-spear',
                color: '#f2d16b',
              },
              {
                id: 'cleric.improved-divine-strike',
                name: 'Улучшенные благословлённые удары',
                description: 'Дополнительный урон Божественного удара возрастает до 2к8.',
                minLevel: 14,
                iconName: 'sun-spear',
              },
            ],
          },
          {
            id: 'potent-spellcasting',
            name: 'Могущественные заклинания',
            description: 'К урону заговоров жреца прибавляется модификатор Мудрости; с 14-го уровня такой урон ещё и даёт временные хиты.',
            features: [
              {
                id: 'cleric.potent-spellcasting',
                name: 'Могущественные заклинания',
                description: 'Нанося урон заговором жреца, вы прибавляете к нему модификатор Мудрости.',
                action: 'passive',
                iconName: 'bolt-spell-cast',
              },
              {
                id: 'cleric.improved-potent-spellcasting',
                name: 'Улучшенные благословлённые удары',
                description: 'Когда вы наносите урон существу заговором жреца, вы можете дать себе или другому существу в пределах 60 футов временные хиты, равные удвоенному модификатору Мудрости.',
                action: 'passive',
                minLevel: 14,
                iconName: 'healing-shield',
              },
            ],
          },
        ],
      },
    },
  ],
};

export const CLERIC: ClassDef = {
  id: 'cleric',
  name: 'Жрец',
  description: 'Проводник божественной силы Внешних планов. Лечит, защищает и карает молитвой, а Проведение божественности даёт чудеса его домена.',
  hitDie: 8,
  primary: ['wisdom'],
  saves: ['wisdom', 'charisma'],
  skillChoices: { count: 2, list: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
    { type: 'proficiency', category: 'armor', value: 'Щиты' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
  ],
  mentalStrength: 65,
  subclassLevel: 3,
  subclasses: [life, light, trickery, war],
  startingEquipment: CLERIC_KITS,
  spellcasting: {
    ability: 'wisdom',
    list: 'cleric',
    slots: FULL_CASTER_SLOTS,
    mode: 'prepared',
    prepared: byTable([4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]),
    cantrips: byClassLevel({ 1: 3, 4: 4, 10: 5 }),
  },
  levels: {
    1: [
      {
        id: 'cleric.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания жреца Мудростью (СЛ = 8 + бонус мастерства + модификатор Мудрости; бонус атаки = бонус мастерства + модификатор Мудрости), фокусировка — священный символ. Заговоры: 3, с 4-го уровня 4, с 10-го 5; на каждом уровне один можно заменить. После продолжительного отдыха вы меняете список подготовленных заклинаний; их число растёт с уровнем.',
        action: 'passive',
        iconName: 'spell-book',
      },
      divineOrder,
    ],
    2: [
      {
        id: 'cleric.channel-divinity',
        name: 'Проведение божественности',
        description:
          'Вы направляете божественную энергию в магические эффекты: Божественную искру, Изгнание нежити и эффекты домена. Использований 2 (3 с 6-го уровня, 4 с 18-го); короткий отдых возвращает одно, продолжительный — все. СЛ спасбросков = СЛ ваших заклинаний жреца.',
        action: 'passive',
        resource: {
          id: CHANNEL_DIVINITY,
          name: 'Проведение божественности',
          max: byClassLevel({ 2: 2, 6: 3, 18: 4 }),
          recharge: 'long',
          shortRestRegain: 1,
          iconName: 'sunbeams',
        },
        iconName: 'sunbeams',
      },
      channelOption(
        'cleric.divine-spark',
        'Божественная искра',
        'Действием «Магия» вы направляете священный символ на видимое существо в пределах 30 футов и бросаете 1к8 + модификатор Мудрости (2к8 с 7-го уровня, 3к8 с 13-го, 4к8 с 18-го). Либо существо восстанавливает столько хитов, либо совершает спасбросок Телосложения: при провале получает столько некротического урона или урона излучением (на выбор), при успехе — половину.',
        {
          damage: (ctx) => `${ctx.classLevel >= 18 ? 4 : ctx.classLevel >= 13 ? 3 : ctx.classLevel >= 7 ? 2 : 1}d8${plus(ctx.modifier('wisdom'))}`,
          damageType: 'Лучистый',
          saveAttribute: 'constitution',
          saveDC: spellDC,
          iconName: 'sparkling-sabre',
          color: '#f2d16b',
        },
      ),
      channelOption(
        'cleric.turn-undead',
        'Изгнание нежити',
        'Действием «Магия» вы показываете священный символ: выбранная нежить в пределах 30 футов совершает спасбросок Мудрости. При провале она Испугана и Недееспособна на 1 минуту и старается уйти от вас как можно дальше; эффект кончается, если она получает урон или если вы Недееспособны или умираете.',
        { saveAttribute: 'wisdom', saveDC: spellDC, iconName: 'death-skull' },
      ),
    ],
    3: [subclassHeading('cleric', 'Подкласс жреца', 'Вы выбираете божественный домен, который даёт умения на 3, 6 и 17-м уровнях.')],
    4: [abilityScoreImprovement('cleric', 4)],
    5: [
      {
        id: 'cleric.sear-undead',
        name: 'Испепеление нежити',
        description: 'Используя Изгнание нежити, вы можете бросить к8 в количестве, равном модификатору Мудрости (минимум 1к8): каждая нежить, провалившая спасбросок, получает столько урона излучением. Эффект изгнания при этом не кончается.',
        action: 'passive',
        damage: (ctx) => `${Math.max(1, ctx.modifier('wisdom'))}d8`,
        damageType: 'Лучистый',
        iconName: 'sun-radiations',
        color: '#f2d16b',
      },
    ],
    7: [blessedStrikes],
    8: [abilityScoreImprovement('cleric', 8)],
    10: [
      {
        id: 'cleric.divine-intervention',
        name: 'Божественное вмешательство',
        description:
          'Действием «Магия» вы взываете к божеству: выберите любое заклинание жреца 5-го круга или ниже, которое не творится реакцией, и сотворите его частью того же действия без ячейки и без материальных компонентов. Раз в продолжительный отдых.',
        action: 'action',
        resource: { id: 'cleric.divine-intervention', name: 'Божественное вмешательство', max: 1, recharge: 'long' },
        iconName: 'angel-wings',
        color: '#f2d16b',
      },
    ],
    12: [abilityScoreImprovement('cleric', 12)],
    16: [abilityScoreImprovement('cleric', 16)],
    19: [epicBoon('cleric')],
    20: [
      {
        id: 'cleric.greater-divine-intervention',
        name: 'Великое божественное вмешательство',
        description: 'Используя Божественное вмешательство, вы можете выбрать заклинание «Желание». После этого Божественное вмешательство недоступно, пока вы не закончите 2к4 продолжительных отдыха.',
        iconName: 'crowned-heart',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const CLERIC_ICONS = {
  class: 'sun-priest',
  subclasses: {
    'life-domain': 'heart-plus',
    'light-domain': 'sun',
    'trickery-domain': 'mirror-mirror',
    'war-domain': 'spartan-helmet',
  } as Record<string, string>,
};
