import { byClassLevel, modifierOf } from '../../helpers';
import { WEAPONS } from '../equipment';
import type { ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { FULL_CASTER_SLOTS, abilityScoreImprovement, byTable, epicBoon, subclassHeading } from './shared';

/** Волшебник of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

/** Class levels on which a wizard gains slots of a new spell level (3rd at 5, … 9th at 17). */
const NEW_SLOT_LEVELS = [5, 7, 9, 11, 13, 15, 17];

/**
 * The Savant feature of a school: two spells of the school (up to 2nd level) written into the
 * spellbook for free at level 3, then one more each time slots of a new level open.
 */
const savant = (prefix: string, name: string, school: string, schoolOf: string, iconName: string): Record<number, FeatureDef> => {
  const levels: Record<number, FeatureDef> = {
    3: {
      id: `${prefix}.savant`,
      name,
      description: `Вы бесплатно записываете в книгу два заклинания волшебника школы ${schoolOf} не выше 2-го круга. Каждый раз, получая ячейки нового круга, вы бесплатно записываете ещё одно заклинание этой школы, для которого у вас есть ячейки.`,
      iconName,
      choices: [
        {
          id: 'spells',
          label: `${name} (2)`,
          count: 2,
          pool: 'spellbook',
          spellbook: true,
          options: { from: 'spells', lists: ['wizard'], minLevel: 1, maxLevel: 2, schools: [school] },
        },
      ],
    },
  };
  for (const level of NEW_SLOT_LEVELS) {
    const circle = (level + 1) / 2;
    levels[level] = {
      id: `${prefix}.savant-${level}`,
      name,
      description: `Бесплатное заклинание школы в книгу (до ${circle}-го круга).`,
      hidden: true,
      choices: [
        {
          id: 'spells',
          label: `${name}: заклинание до ${circle} круга`,
          count: 1,
          pool: 'spellbook',
          spellbook: true,
          options: { from: 'spells', lists: ['wizard'], minLevel: 1, maxLevel: circle, schools: [school] },
        },
      ],
    };
  }
  return levels;
};

/** Merges the Savant features into a subclass's levels. */
const withSavant = (levels: Record<number, FeatureDef[]>, extra: Record<number, FeatureDef>): Record<number, FeatureDef[]> => {
  const out: Record<number, FeatureDef[]> = { ...levels };
  for (const [level, feature] of Object.entries(extra)) out[Number(level)] = [feature, ...(out[Number(level)] ?? [])];
  return out;
};

// ------------------------------------------------------------------------------------------------
// Schools
// ------------------------------------------------------------------------------------------------

const abjurer: SubclassDef = {
  id: 'abjurer',
  name: 'Оградитель',
  description: 'Мастер защитной магии: волшебный щит поглощает удары, а чужие заклинания рассыпаются о вашу оборону.',
  levels: withSavant(
    {
      3: [
        {
          id: 'abjurer.arcane-ward',
          name: 'Волшебный щит',
          description:
            'Сотворив заклинание Ограждения с ячейкой, вы можете создать на себе волшебный щит до продолжительного отдыха (раз в продолжительный отдых). Его максимум хитов — 2 × уровень волшебника + модификатор Интеллекта. Урон, который вы получаете, сначала снимается со щита (после ваших сопротивлений и уязвимостей); остаток достаётся вам. При 0 хитов щит не поглощает урон, но не исчезает. Каждое заклинание Ограждения с ячейкой восстанавливает щиту 2 × круг ячейки хитов; бонусным действием можно потратить ячейку и восстановить столько же.',
          action: 'passive',
          resource: {
            id: 'abjurer.arcane-ward',
            name: 'Хиты волшебного щита',
            max: (ctx) => 2 * ctx.classLevel + ctx.modifier('intelligence'),
            recharge: 'long',
            description: 'Хиты щита: 2 × уровень волшебника + модификатор Интеллекта.',
          },
          iconName: 'magic-shield',
          color: '#6aa6d9',
        },
      ],
      6: [
        {
          id: 'abjurer.projected-ward',
          name: 'Проецированный щит',
          description: 'Реакцией, когда видимое вами существо в пределах 30 футов получает урон, вы поглощаете его Волшебным щитом. Если хиты щита падают до 0, остаток урона получает защищаемое существо (с учётом его сопротивлений и уязвимостей).',
          action: 'reaction',
          iconName: 'shield-reflect',
        },
      ],
      10: [
        {
          id: 'abjurer.spell-breaker',
          name: 'Разрушитель заклинаний',
          description:
            '«Контрзаклинание» и «Рассеивание магии» всегда подготовлены. «Рассеивание магии» можно творить бонусным действием и добавлять бонус мастерства к его проверке. Если любое из них, сотворённое с ячейкой, не прекратило заклинание, ячейка не тратится.',
          action: 'passive',
          effects: [
            { type: 'spell', spell: 'counterspell', alwaysPrepared: true },
            { type: 'spell', spell: 'dispel-magic', alwaysPrepared: true },
          ],
          iconName: 'bolt-shield',
        },
      ],
      14: [
        {
          id: 'abjurer.spell-resistance',
          name: 'Сопротивление заклинаниям',
          description: 'Вы совершаете спасброски от заклинаний с преимуществом и обладаете сопротивлением урону от заклинаний.',
          iconName: 'energy-shield',
        },
      ],
    },
    savant('abjurer', 'Учёный-Оградитель', 'Ограждение', 'Ограждения', 'checked-shield'),
  ),
};

const diviner: SubclassDef = {
  id: 'diviner',
  name: 'Прорицатель',
  description: 'Исследователь прошлого, настоящего и будущего: предсказанные броски подменяют судьбу.',
  levels: withSavant(
    {
      3: [
        {
          id: 'diviner.portent',
          name: 'Знамение',
          description:
            'После продолжительного отдыха бросьте две к20 (три с 14-го уровня) и запишите результаты. Перед тестом к20 вашим или видимого вами существа вы можете заменить бросок одним из предсказанных значений — не больше раза за ход, каждое значение один раз. Неиспользованные пропадают после продолжительного отдыха.',
          action: 'passive',
          resource: { id: 'diviner.portent', name: 'Знамение', max: byClassLevel({ 3: 2, 14: 3 }), recharge: 'long' },
          iconName: 'crystal-ball',
          color: '#c9a94e',
        },
      ],
      6: [
        {
          id: 'diviner.expert-divination',
          name: 'Эксперт прорицания',
          description: 'Сотворив заклинание Прорицания 2-го круга или выше с ячейкой, вы восстанавливаете одну потраченную ячейку ниже круга использованной и не выше 5-го.',
          iconName: 'all-seeing-eye',
        },
      ],
      10: [
        {
          id: 'diviner.third-eye',
          name: 'Третий глаз',
          description:
            'Бонусным действием выберите одно, до начала короткого или продолжительного отдыха: **тёмное зрение** 120 футов; **лучшее понимание** — вы читаете на любом языке; **видение невидимого** — вы можете творить «Видение невидимого» без ячейки. Раз в короткий или продолжительный отдых.',
          action: 'bonus',
          resource: { id: 'diviner.third-eye', name: 'Третий глаз', max: 1, recharge: 'shortOrLong' },
          iconName: 'third-eye',
        },
      ],
      14: [
        {
          id: 'diviner.greater-portent',
          name: 'Великое знамение',
          description: 'Для Знамения вы бросаете три к20 вместо двух.',
          iconName: 'eye-of-horus',
        },
      ],
    },
    savant('diviner', 'Учёный-Прорицатель', 'Прорицание', 'Прорицания', 'book-aura'),
  ),
};

const evoker: SubclassDef = {
  id: 'evoker',
  name: 'Воплотитель',
  description: 'Повелитель стихийной разрушительной магии: огонь, холод, гром и молния, которые щадят союзников.',
  levels: withSavant(
    {
      3: [
        {
          id: 'evoker.potent-cantrip',
          name: 'Мощные заговоры',
          description: 'Если вы промахиваетесь заговором урона или цель преуспевает в спасброске от него, она всё равно получает половину урона заговора, но без его дополнительных эффектов.',
          iconName: 'ice-bolt',
        },
      ],
      6: [
        {
          id: 'evoker.sculpt-spells',
          name: 'Построение заклинаний',
          description: 'Сотворяя заклинание Воплощения, затрагивающее видимых вами существ, выберите их до 1 + круг заклинания: они автоматически преуспевают в спасброске и не получают урона, если при успехе получили бы половину.',
          iconName: 'spiral-bloom',
        },
      ],
      10: [
        {
          id: 'evoker.empowered-evocation',
          name: 'Усиленное воплощение',
          description: 'К одному броску урона любого вашего заклинания волшебника школы Воплощения вы добавляете модификатор Интеллекта.',
          iconName: 'lightning-helix',
        },
      ],
      14: [
        {
          id: 'evoker.overchannel',
          name: 'Перегрузка',
          description:
            'Сотворяя заклинание волшебника урона с ячейкой 1–5 круга, вы можете нанести им максимальный урон в ход сотворения. Первый раз за продолжительный отдых — без последствий; каждый следующий до продолжительного отдыха наносит вам сразу после сотворения 2к12 некротического урона за круг ячейки (затем ещё +1к12 за круг каждый раз), игнорирующего сопротивление и иммунитет.',
          action: 'passive',
          resource: { id: 'evoker.overchannel', name: 'Перегрузка без вреда', max: 1, recharge: 'long' },
          iconName: 'power-lightning',
          color: '#d97a3a',
        },
      ],
    },
    savant('evoker', 'Учёный-Воплотитель', 'Воплощение', 'Воплощения', 'fire'),
  ),
};

const illusionist: SubclassDef = {
  id: 'illusionist',
  name: 'Иллюзионист',
  description: 'Мастер обмана чувств: иллюзии без слов, призрачные существа и обманы, становящиеся реальностью.',
  levels: withSavant(
    {
      3: [
        {
          id: 'illusionist.improved-illusions',
          name: 'Улучшенные иллюзии',
          description:
            'Заклинания Иллюзии вы творите без вербального компонента, а их дистанция (если она 10 футов и больше) увеличивается на 60 футов. Вы знаете заговор «Малая иллюзия» (если уже знали — другой заговор волшебника; он не входит в число заговоров), творите его бонусным действием и создаёте им одновременно и звук, и образ.',
          effects: [{ type: 'spell', spell: 'minor-illusion', alwaysPrepared: true }],
          iconName: 'drama-masks',
        },
      ],
      6: [
        {
          id: 'illusionist.phantasmal-creatures',
          name: 'Призрачные существа',
          description:
            '«Вызов зверя» и «Вызов феи» всегда подготовлены. Сотворяя их, вы можете сделать их заклинаниями Иллюзии с призрачным существом. Иллюзорную версию каждого из них можно раз в продолжительный отдых сотворить без ячейки, но тогда хиты существа уменьшаются вдвое.',
          action: 'passive',
          resource: { id: 'illusionist.phantasmal-creatures', name: 'Призрачные существа без ячейки', max: 2, recharge: 'long', description: 'По одному разу на «Вызов зверя» и «Вызов феи».' },
          effects: [
            { type: 'spell', spell: 'summon-beast', alwaysPrepared: true },
            { type: 'spell', spell: 'summon-fey', alwaysPrepared: true },
          ],
          iconName: 'ghost',
        },
      ],
      10: [
        {
          id: 'illusionist.illusory-self',
          name: 'Собственная иллюзорность',
          description:
            'Реакцией, когда по вам попадает атака, вы ставите между собой и атакующим иллюзорного двойника: атака промахивается, двойник исчезает. Раз в короткий или продолжительный отдых; использование можно вернуть, потратив ячейку 2-го круга или выше (без действия).',
          action: 'reaction',
          resource: { id: 'illusionist.illusory-self', name: 'Собственная иллюзорность', max: 1, recharge: 'shortOrLong' },
          iconName: 'mirror-mirror',
        },
      ],
      14: [
        {
          id: 'illusionist.illusory-reality',
          name: 'Иллюзорная реальность',
          description:
            'Сотворив заклинание Иллюзии с ячейкой, вы можете, пока оно действует, бонусным действием сделать реальным один неодушевлённый немагический предмет из иллюзии на 1 минуту. Такой предмет не может наносить урон или накладывать состояния.',
          action: 'bonus',
          iconName: 'magic-hat',
        },
      ],
    },
    savant('illusionist', 'Учёный-Иллюзионист', 'Иллюзия', 'Иллюзии', 'invisible'),
  ),
};

// ------------------------------------------------------------------------------------------------
// Subclasses of other books
// ------------------------------------------------------------------------------------------------

/** Martial melee weapons without the Two-Handed or Heavy property (Training in War and Song). */
const BLADESINGER_WEAPONS = WEAPONS.filter(
  (w) => w.category === 'martial' && w.kind === 'melee' && !w.properties.some((p) => p.startsWith('Тяжёлое') || p.startsWith('Двуручное')),
);

const bladesinger: SubclassDef = {
  id: 'bladesinger',
  name: 'Певец клинка',
  source: 'Forgotten Realms: Heroes of Faerûn',
  description: 'Эльфийская традиция, сплетающая фехтование, танец и волшебство: Песнь клинка делает мага быстрым и неуловимым бойцом.',
  levels: {
    3: [
      {
        id: 'bladesinger.bladesong',
        name: 'Песнь клинка',
        description:
          'Бонусным действием, без доспехов и щита, вы начинаете Песнь клинка на 1 минуту. Она кончается раньше, если вы недееспособны, надеваете доспех или щит или атакуете оружием двумя руками; прервать её можно в любой момент (без действия). Использований — модификатор Интеллекта (минимум 1) за продолжительный отдых; Магическое восстановление возвращает одно. Пока она длится:\n\n- **Подвижность:** бонус к КЗ, равный модификатору Интеллекта (минимум +1), скорость +10 футов, преимущество на проверки Ловкости (Акробатика);\n- **Техника фехтования:** атакуя оружием, которым владеете, вы можете использовать Интеллект вместо Силы или Ловкости для бросков атаки и урона;\n- **Сосредоточенность:** к спасброскам Телосложения для концентрации вы добавляете модификатор Интеллекта.',
        action: 'bonus',
        resource: { id: 'bladesinger.bladesong', name: 'Песнь клинка', max: modifierOf('intelligence'), recharge: 'long' },
        iconName: 'sparkling-sabre',
        color: '#7fc3d9',
      },
      {
        id: 'bladesinger.training-in-war-and-song',
        name: 'Учение песни и войны',
        description:
          'Вы владеете воинским рукопашным оружием без свойств «Двуручное» и «Тяжёлое» и можете использовать рукопашное оружие, которым владеете, как фокусировку для заклинаний волшебника. Вы также владеете одним навыком на выбор: Акробатика, Атлетика, Выступление или Убеждение.',
        iconName: 'sword-spin',
        effects: BLADESINGER_WEAPONS.map((w) => ({ type: 'proficiency' as const, category: 'weapon' as const, value: w.name })),
        choices: [{ id: 'skill', label: 'Навык Певца клинка', count: 1, options: { from: 'skills', list: ['acrobatics', 'athletics', 'performance', 'persuasion'] } }],
      },
    ],
    6: [
      {
        id: 'bladesinger.extra-attack',
        name: 'Дополнительная атака',
        description: 'Совершая в свой ход действие Атака, вы можете атаковать дважды. Одну из этих атак можно заменить сотворением заговора волшебника со временем сотворения «действие».',
        iconName: 'sword-clash',
      },
    ],
    10: [
      {
        id: 'bladesinger.song-of-defense',
        name: 'Песнь защиты',
        description: 'Получая урон во время Песни клинка, вы можете реакцией потратить ячейку заклинаний и уменьшить урон на 5 × круг ячейки.',
        action: 'reaction',
        iconName: 'shield-impact',
      },
    ],
    14: [
      {
        id: 'bladesinger.song-of-victory',
        name: 'Песнь победы',
        description: 'Сотворив заклинание со временем сотворения «действие», вы можете бонусным действием совершить одну атаку оружием.',
        action: 'bonus',
        iconName: 'sword-brandish',
      },
    ],
  },
};

const necromancer: SubclassDef = {
  id: 'necromancer',
  name: 'Некромант',
  source: 'Arcana Unleashed',
  description: 'Исследователь жизни, смерти и нежизни: немёртвый фамильяр, поднятые слуги и власть над их силами.',
  levels: withSavant(
    {
      3: [
        {
          id: 'necromancer.necromantic-grimoire',
          name: 'Некромантический гримуар',
          description:
            '- **Сопротивление некротике:** у вас сопротивление некротическому урону.\n- **Немёртвый фамильяр:** в вашей книге есть «Обретение фамильяра»; фамильяр может быть Зомби или Скелетом, а обычный фамильяр — нежитью вместо зверя. Совершая действие Атака, вы можете отказаться от одной атаки, чтобы фамильяр реакцией совершил одну свою атаку.\n- **Оздоровление нежити:** сотворяя заклинание Некромантии с ячейкой, вы можете выбрать видимую нежить в пределах 60 футов — она восстанавливает хиты, равные кругу ячейки + уровню волшебника.',
          effects: [
            { type: 'resistance', damageType: 'Некротический' },
            { type: 'spell', spell: 'find-familiar', alwaysPrepared: false },
          ],
          iconName: 'evil-book',
        },
      ],
      6: [
        {
          id: 'necromancer.grave-power',
          name: 'Сила могил',
          description:
            'Пока вы держите книгу заклинаний:\n\n- **Кладбищенская стойкость:** Магическое восстановление снижает ваше истощение на 1;\n- **Тотальный некроз:** урон ваших заклинаний и умений волшебника игнорирует сопротивление некротическому урону.',
          iconName: 'death-skull',
        },
        {
          id: 'necromancer.undead-thralls',
          name: 'Неживые рабы',
          description:
            '«Поднятие мертвеца» всегда подготовлено; раз в продолжительный отдых его можно сотворить без ячейки, и, начиная сотворение, вы можете повысить его круг на 1. Пока вы держите книгу заклинаний:\n\n- **Стойкость нежити:** нежить, созданная или призванная вашим заклинанием Некромантии, получает к максимуму и текущим хитам модификатор Интеллекта + половину уровня волшебника (вниз);\n- **Иссушающий удар:** подконтрольная вам нежить в пределах 60 футов, попав броском атаки, наносит дополнительный некротический урон, равный модификатору Интеллекта (минимум 1).',
          action: 'passive',
          resource: { id: 'necromancer.undead-thralls', name: 'Поднятие мертвеца без ячейки', max: 1, recharge: 'long' },
          effects: [{ type: 'spell', spell: 'animate-dead', alwaysPrepared: true }],
          iconName: 'skull-staff',
          color: '#7d8a6a',
        },
      ],
      10: [
        {
          id: 'necromancer.undying-harvest',
          name: 'Жатва немёртвых',
          description: 'Сразу после того, как вы становитесь окровавленным, но не опускаетесь до 0 хитов, вы можете реакцией опустить до 0 хиты видимой подконтрольной вам нежити и восстановить хиты, равные уровню волшебника.',
          action: 'reaction',
          damage: (ctx) => `${ctx.classLevel}`,
          damageType: 'Лечение',
          iconName: 'reaper-scythe',
        },
      ],
      14: [
        {
          id: 'necromancer.death-lord',
          name: 'Повелитель смерти',
          description:
            '**Разгорание нежизни** (пока вы держите книгу заклинаний): бонусным действием любое число нежити в пределах 60 футов, созданной или призванной вашими заклинаниями Некромантии, получает временные хиты, равные уровню волшебника. Раз в продолжительный отдых.',
          action: 'bonus',
          resource: { id: 'necromancer.death-lord', name: 'Разгорание нежизни', max: 1, recharge: 'long' },
          damage: (ctx) => `${ctx.classLevel}`,
          iconName: 'crowned-skull',
        },
        {
          id: 'necromancer.unlife-extinguished',
          name: 'Погасание нежизни',
          description:
            'Когда хиты видимой вами нежити опускаются до 0, вы можете взорвать её: бросьте к6 в числе половины её непотраченных костей хитов (вверх, минимум 1к6). Существа в эманации 10 футов совершают спасбросок Ловкости: при провале — некротический урон, равный броску, и нет реакций до начала их следующего хода; при успехе — половина урона. Для неподконтрольной вам нежити нужны реакция и ячейка 5-го круга или выше.',
          action: 'passive',
          damageType: 'Некротический',
          saveAttribute: 'dexterity',
          saveDC: (ctx) => 8 + ctx.proficiencyBonus + ctx.modifier('intelligence'),
          iconName: 'death-zone',
        },
      ],
    },
    savant('necromancer', 'Учёный-Некромант', 'Некромантия', 'Некромантии', 'burning-book'),
  ),
};

const enchanter: SubclassDef = {
  id: 'enchanter',
  name: 'Очарователь',
  source: 'Arcana Unleashed',
  description: 'Маг, пленяющий разумы: завораживающий взгляд, чары на нескольких целей и стёртые воспоминания.',
  levels: withSavant(
    {
      3: [
        {
          id: 'enchanter.beguiling-speaker',
          name: 'Чарующий оратор',
          description: 'Вы владеете одним навыком на выбор: Запугивание, Обман или Убеждение. К проверкам с этим навыком вы добавляете модификатор Интеллекта (минимум +1).',
          iconName: 'charm',
          choices: [
            {
              id: 'skill',
              label: 'Навык оратора',
              count: 1,
              options: {
                from: 'options',
                options: (
                  [
                    ['intimidation', 'Запугивание'],
                    ['deception', 'Обман'],
                    ['persuasion', 'Убеждение'],
                  ] as const
                ).map(([skill, name]) => ({
                  id: skill,
                  name,
                  description: `Владение навыком «${name}» и бонус модификатора Интеллекта (минимум +1) к его проверкам.`,
                  effects: [
                    { type: 'skill' as const, skill },
                    { type: 'skillBonus' as const, skills: [skill], amount: modifierOf('intelligence') },
                  ],
                })),
              },
            },
          ],
        },
        {
          id: 'enchanter.mesmerizing-presence',
          name: 'Гипнотизирующее присутствие',
          description:
            'Действием Магия выберите видимое существо в пределах 10 футов, которое видит или слышит вас: оно совершает спасбросок Мудрости или очаровано на 1 минуту, а пока очаровано — недееспособно и со скоростью 0. Эффект кончается, если цель отходит дальше 10 футов, получает урон или перестаёт видеть и слышать вас. Использований — модификатор Интеллекта (минимум 1) за продолжительный отдых.',
          action: 'action',
          resource: { id: 'enchanter.mesmerizing-presence', name: 'Гипнотизирующее присутствие', max: modifierOf('intelligence'), recharge: 'long' },
          saveAttribute: 'wisdom',
          saveDC: (ctx) => 8 + ctx.proficiencyBonus + ctx.modifier('intelligence'),
          iconName: 'evil-eyes',
          color: '#c77dd1',
        },
      ],
      6: [
        {
          id: 'enchanter.split-enchantment',
          name: 'Разделённое очарование',
          description: 'Тратя ячейку на заклинание Очарования, которое на более высоком круге поражает больше существ (как «Очарование личности»), вы можете повысить его круг на 1. Использований — модификатор Интеллекта (минимум 1) за продолжительный отдых.',
          action: 'passive',
          resource: { id: 'enchanter.split-enchantment', name: 'Разделённое очарование', max: modifierOf('intelligence'), recharge: 'long' },
          iconName: 'divided-spiral',
        },
      ],
      10: [
        {
          id: 'enchanter.instinctive-charm',
          name: 'Инстинктивное очарование',
          description:
            'Когда видимое существо в пределах 30 футов попадает по вам атакой, вы можете реакцией заставить его совершить спасбросок Мудрости: при провале атака промахивается и, если в пределах её дистанции есть другое существо, переходит на него (вы выбираете на кого) с тем же броском. Раз в продолжительный отдых; использование возвращает заклинание Очарования, сотворённое с ячейкой.',
          action: 'reaction',
          resource: { id: 'enchanter.instinctive-charm', name: 'Инстинктивное очарование', max: 1, recharge: 'long' },
          saveAttribute: 'wisdom',
          saveDC: (ctx) => 8 + ctx.proficiencyBonus + ctx.modifier('intelligence'),
          iconName: 'chained-heart',
        },
      ],
      14: [
        {
          id: 'enchanter.altered-memories',
          name: 'Изменённые воспоминания',
          description:
            'Сотворяя с ячейкой заклинание Очарования, накладывающее очарование, вы можете выбрать одну цель — она не поймёт, что была очарована. Пока заклинание действует, вы можете один раз действием Магия заставить её совершить спасбросок Интеллекта: при провале она забывает последние 1 + модификатор Интеллекта часов (минимум 1, но не больше длительности заклинания).',
          action: 'passive',
          saveAttribute: 'intelligence',
          saveDC: (ctx) => 8 + ctx.proficiencyBonus + ctx.modifier('intelligence'),
          iconName: 'brain',
        },
      ],
    },
    savant('enchanter', 'Учёный-Зачарователь', 'Очарование', 'Очарования', 'crowned-heart'),
  ),
};

const transmuter: SubclassDef = {
  id: 'transmuter',
  name: 'Преобразователь',
  source: 'Arcana Unleashed',
  description: 'Мастер изменения материи и энергии: камень преобразования, магические превращения и власть над формой.',
  levels: withSavant(
    {
      3: [
        {
          id: 'transmuter.transmuters-stone',
          name: 'Камень преобразования',
          description:
            'После продолжительного отдыха вы можете создать крошечный магический камень (прежний исчезает). Он служит фокусировкой для заклинаний волшебника и даёт носителю владение спасбросками Телосложения и одно свойство на выбор при создании; свойство можно сменить, сотворив заклинание Преобразования с ячейкой:\n\n- **Тёмное зрение:** 60 футов или +60 футов к имеющемуся;\n- **Сопротивление:** звуку, кислоте, огню, холоду, электричеству или яду (на выбор);\n- **Скорость:** +10 футов.',
          action: 'passive',
          iconName: 'rune-stone',
        },
        {
          id: 'transmuter.magical-transformation',
          name: 'Волшебное превращение',
          description:
            '«Смена обличья» всегда подготовлена; раз в продолжительный отдых её можно сотворить без ячейки. Пока она действует, вариант даёт дополнительное преимущество:\n\n- **Адаптация к воде:** под водой вы можете совершать Рывок бонусным действием;\n- **Естественное оружие:** его урон — 2к6, и спасброски Телосложения для концентрации вы совершаете с преимуществом;\n- **Изменение внешности:** преимущество на проверки Харизмы (Обман).',
          action: 'passive',
          resource: { id: 'transmuter.magical-transformation', name: 'Смена обличья без ячейки', max: 1, recharge: 'long' },
          effects: [{ type: 'spell', spell: 'alter-self', alwaysPrepared: true }],
          iconName: 'frog',
        },
      ],
      6: [
        {
          id: 'transmuter.empowered-transmutation',
          name: 'Усиленное преобразование',
          description: 'Тратя ячейку на заклинание Преобразования без броска атаки и спасброска (как «Полёт» или «Магическое оружие»), вы можете повысить его круг на 1. Использований — модификатор Интеллекта (минимум 1) за продолжительный отдых.',
          action: 'passive',
          resource: { id: 'transmuter.empowered-transmutation', name: 'Усиленное преобразование', max: modifierOf('intelligence'), recharge: 'long' },
          iconName: 'bubbling-flask',
        },
      ],
      10: [
        {
          id: 'transmuter.potent-stone',
          name: 'Могущественный камень',
          description:
            'Создавая Камень преобразования, вы выбираете два разных свойства (Сопротивление можно взять дважды с разными видами урона) и можете сменить одно или оба, сотворив заклинание Преобразования с ячейкой. Новые свойства:\n\n- **Могучее сложение:** преимущество на спасброски Силы; носитель считается на размер больше для грузоподъёмности;\n- **Чувство вибрации:** 30 футов.',
          iconName: 'gems',
        },
        {
          id: 'transmuter.master-of-polymorph',
          name: 'Мастер превращения',
          description:
            '«Превращение» всегда подготовлено; раз в продолжительный отдых его можно сотворить без ячейки. Раз в продолжительный отдых, превращая себя, вы можете сохранить память, речь, Интеллект, Мудрость и Харизму, владения, классовые умения и черты, а в облике творить заклинания Преобразования без материальных компонентов с ценой или расходуемых.',
          action: 'passive',
          resource: { id: 'transmuter.master-of-polymorph', name: 'Превращение без ячейки', max: 1, recharge: 'long' },
          effects: [{ type: 'spell', spell: 'polymorph', alwaysPrepared: true }],
          iconName: 'wolf-howl',
        },
      ],
      14: [
        {
          id: 'transmuter.master-transmuter',
          name: 'Мастер преобразования',
          description:
            'Держа Камень преобразования, вы можете действием Магия поглотить его силу и выбрать эффект; камень рассыпается в пыль, если вы не потратите в том же действии ячейку 7-го круга или выше:\n\n- **Высшее преобразование:** за 10 минут работы немагический предмет до куба 10 футов (или восьми соединённых кубов 5 футов) превращается в другой немагический предмет схожего размера и массы не дороже исходного;\n- **Панацея:** коснувшееся существо восстанавливает половину максимума хитов (вниз), избавляется от всех магических болезней и проклятий (включая настройку на проклятые предметы), а состояния «отравлен» и «окаменел» на нём оканчиваются.',
          action: 'action',
          iconName: 'magic-potion',
        },
      ],
    },
    savant('transmuter', 'Учёный-Преобразователь', 'Преобразование', 'Преобразования', 'round-potion'),
  ),
};

const BENIGN_TRANSPOSITION = 'conjurer.benign-transposition';

const conjurer: SubclassDef = {
  id: 'conjurer',
  name: 'Призыватель',
  source: 'Arcana Unleashed',
  description: 'Маг, для которого расстояние и материя — лишь условности: мгновенные перемещения и стойкие призванные существа.',
  levels: withSavant(
    {
      3: [
        {
          id: 'conjurer.benign-transposition',
          name: 'Безопасный перенос',
          description:
            'Бонусным действием вы телепортируетесь в видимое свободное пространство в пределах 30 футов (60 с 6-го уровня) или меняетесь местами с согласным существом Среднего размера или меньше в пределах этой дистанции. Использований — модификатор Интеллекта (минимум 1) за продолжительный отдых.',
          action: 'bonus',
          resource: { id: BENIGN_TRANSPOSITION, name: 'Безопасный перенос', max: modifierOf('intelligence'), recharge: 'long' },
          iconName: 'teleport',
          color: '#8d7dd9',
        },
      ],
      6: [
        {
          id: 'conjurer.distant-transposition',
          name: 'Дальний перенос',
          description: 'Дистанция Безопасного переноса — 60 футов. Потратив ячейку 3-го круга или выше (без действия), вы восстанавливаете одно его использование.',
          iconName: 'magic-portal',
        },
        {
          id: 'conjurer.durable-summons',
          name: 'Надёжный вызов',
          description:
            'Существо, которое вы вызываете или создаёте заклинанием Вызова, сотворённым с ячейкой, при появлении получает временные хиты, равные 2 × уровень волшебника. Пока они есть, у него сопротивление всем видам урона, кроме некротического, психического, силового и лучистого.',
          damage: (ctx) => `${2 * ctx.classLevel}`,
          iconName: 'healing-shield',
        },
      ],
      10: [
        {
          id: 'conjurer.focused-conjuration',
          name: 'Сфокусированный призыв',
          description: 'Получение урона не может прервать вашу концентрацию на заклинаниях Вызова.',
          iconName: 'meditation',
        },
      ],
      14: [
        {
          id: 'conjurer.split-summons',
          name: 'Разделённый вызов',
          description:
            'Сотворяя с ячейкой заклинание Вызова, призывающее духа со своим блоком статистики (как «Вызов аберрации»), вы можете призвать двух одинаковых существ вместо одного — в разных свободных пространствах в пределах дистанции, с половиной хитов каждое; потеря концентрации убирает обоих. Раз в продолжительный отдых; использование возвращает ячейка 5-го круга или выше (без действия).',
          action: 'passive',
          resource: { id: 'conjurer.split-summons', name: 'Разделённый вызов', max: 1, recharge: 'long' },
          iconName: 'magic-gate',
        },
      ],
    },
    savant('conjurer', 'Учёный-Призыватель', 'Вызов', 'Вызова', 'star-formation'),
  ),
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

export const WIZARD_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [{ ref: 'dagger', quantity: 2 }, { ref: 'quarterstaff' }, { ref: 'robe' }, { ref: 'spellbook' }, { ref: 'scholars-pack' }],
    gold: 5,
  },
  { id: 'b', label: 'B', items: [], gold: 55 },
];

export const WIZARD: ClassDef = {
  id: 'wizard',
  name: 'Волшебник',
  description: 'Учёный маг, хранящий заклинания в книге: самый широкий выбор магии и умение восстанавливать силы над страницами.',
  hitDie: 6,
  primary: ['intelligence'],
  saves: ['intelligence', 'wisdom'],
  skillChoices: { count: 2, list: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'] },
  proficiencies: [{ type: 'proficiency', category: 'weapon', value: 'Простое оружие' }],
  subclassLevel: 3,
  subclasses: [abjurer, diviner, evoker, illusionist, bladesinger, necromancer, enchanter, transmuter, conjurer],
  startingEquipment: WIZARD_KITS,
  spellcasting: {
    ability: 'intelligence',
    list: 'wizard',
    slots: FULL_CASTER_SLOTS,
    mode: 'spellbook',
    prepared: byTable([4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25]),
    cantrips: byClassLevel({ 1: 3, 4: 4, 10: 5 }),
  },
  levels: {
    1: [
      {
        id: 'wizard.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания волшебника Интеллектом (СЛ = 8 + бонус мастерства + модификатор Интеллекта; бонус атаки = бонус мастерства + модификатор Интеллекта); фокусировка — магическая. Заговоров 3 (4 с 4-го уровня, 5 с 10-го); после продолжительного отдыха один заговор можно заменить. В книге заклинаний сначала шесть заклинаний 1-го круга, с каждым уровнем — ещё два, доступных по ячейкам. После продолжительного отдыха вы готовите из книги любые заклинания в числе по таблице класса. Найденное заклинание можно переписать в книгу: 2 часа и 50 зм за круг; копия своей книги — 1 час и 10 зм за круг.',
        action: 'passive',
        iconName: 'spell-book',
      },
      {
        id: 'wizard.ritual-adept',
        name: 'Знаток ритуалов',
        description: 'Любое заклинание с пометкой «ритуал» из вашей книги можно сотворить как ритуал, даже не подготовив его, — читая его из книги.',
        iconName: 'scroll-quill',
      },
      {
        id: 'wizard.arcane-recovery',
        name: 'Магическое восстановление',
        description:
          'Завершив короткий отдых, вы восстанавливаете потраченные ячейки с суммой кругов не больше половины уровня волшебника (с округлением вверх); ни одна не может быть 6-го круга или выше. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'wizard.arcane-recovery', name: 'Магическое восстановление', max: 1, recharge: 'long' },
        iconName: 'book-pile',
      },
    ],
    2: [
      {
        id: 'wizard.scholar',
        name: 'Академические знания',
        description: 'Вы получаете экспертность в одном навыке, которым владеете: История, Медицина, Природа, Расследование, Религия или Тайная магия.',
        iconName: 'quill-ink',
        choices: [
          {
            id: 'expertise',
            label: 'Экспертность',
            count: 1,
            options: { from: 'expertise', list: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'] },
          },
        ],
      },
    ],
    3: [subclassHeading('wizard', 'Подкласс волшебника', 'Школа магии, на которой вы специализируетесь, определяет умения подкласса.')],
    4: [abilityScoreImprovement('wizard', 4)],
    5: [
      {
        id: 'wizard.memorize-spell',
        name: 'Запомнить заклинание',
        description: 'Завершив короткий отдых, вы можете заменить одно подготовленное заклинание 1-го круга или выше другим заклинанием 1-го круга или выше из книги.',
        iconName: 'gift-of-knowledge',
      },
    ],
    8: [abilityScoreImprovement('wizard', 8)],
    12: [abilityScoreImprovement('wizard', 12)],
    16: [abilityScoreImprovement('wizard', 16)],
    18: [
      {
        id: 'wizard.spell-mastery',
        name: 'Мастерство заклинателя',
        description:
          'Выберите в книге по одному заклинанию 1-го и 2-го круга со временем сотворения «действие». Они всегда подготовлены, и вы творите их на минимальном круге без ячейки (на более высоком — тратя ячейку). После продолжительного отдыха одно из них можно заменить другим подходящим заклинанием того же круга из книги.',
        action: 'passive',
        iconName: 'crystal-wand',
        choices: [
          { id: 'first', label: 'Мастерство: 1 круг', count: 1, spellAbility: 'intelligence', hint: 'Заклинание из вашей книги со временем «действие».', options: { from: 'spells', lists: ['wizard'], minLevel: 1, maxLevel: 1, fromSpellbook: true } },
          { id: 'second', label: 'Мастерство: 2 круг', count: 1, spellAbility: 'intelligence', hint: 'Заклинание из вашей книги со временем «действие».', options: { from: 'spells', lists: ['wizard'], minLevel: 2, maxLevel: 2, fromSpellbook: true } },
        ],
      },
    ],
    19: [epicBoon('wizard')],
    20: [
      {
        id: 'wizard.signature-spells',
        name: 'Фирменные заклинания',
        description:
          'Два заклинания 3-го круга из вашей книги становятся фирменными: они всегда подготовлены, и каждое можно раз в короткий или продолжительный отдых сотворить на 3-м круге без ячейки (на более высоком — тратя ячейку).',
        action: 'passive',
        resource: { id: 'wizard.signature-spells', name: 'Фирменные заклинания', max: 2, recharge: 'shortOrLong', description: 'По одному разу на каждое фирменное заклинание.' },
        iconName: 'orb-wand',
        choices: [
          { id: 'spells', label: 'Фирменные заклинания (2)', count: 2, spellAbility: 'intelligence', hint: 'Заклинания 3-го круга из вашей книги.', options: { from: 'spells', lists: ['wizard'], minLevel: 3, maxLevel: 3, fromSpellbook: true } },
        ],
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const WIZARD_ICONS = {
  class: 'pointy-hat',
  subclasses: {
    abjurer: 'magic-shield',
    diviner: 'crystal-ball',
    evoker: 'fire-zone',
    illusionist: 'drama-masks',
    bladesinger: 'sparkling-sabre',
    necromancer: 'skull-staff',
    enchanter: 'charm',
    transmuter: 'stone-sphere',
    conjurer: 'magic-gate',
  } as Record<string, string>,
};
