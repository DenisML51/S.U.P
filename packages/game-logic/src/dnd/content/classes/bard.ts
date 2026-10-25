import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SkillId, SubclassDef } from '../../types';
import { MUSICAL_INSTRUMENT_NAMES } from '../equipment';
import {
  FULL_CASTER_SLOTS,
  abilityScoreImprovement,
  byTable,
  epicBoon,
  subclassHeading,
} from './shared';

/** Бард of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const BARDIC_INSPIRATION = 'bard.bardic-inspiration';

/** Size of the Bardic Inspiration die: d6, d8 from level 5, d10 from 10, d12 from 15. */
const inspirationDie = byClassLevel({ 1: 6, 5: 8, 10: 10, 15: 12 });
const inspirationDice = (ctx: BuildContext) => `1d${inspirationDie(ctx)}`;

/** The bard's spell save DC: 8 + proficiency bonus + Charisma modifier. */
const spellDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('charisma');

/** Highest spell level the bard has slots for at the current class level. */
const maxBardSpellLevel = (ctx: BuildContext) => FULL_CASTER_SLOTS[Math.min(20, Math.max(1, ctx.classLevel)) - 1]?.length ?? 0;

const ALL_SKILLS: SkillId[] = [
  'athletics', 'acrobatics', 'sleightOfHand', 'stealth', 'arcana', 'history', 'investigation', 'nature', 'religion',
  'animalHandling', 'insight', 'medicine', 'perception', 'survival', 'deception', 'intimidation', 'performance', 'persuasion',
];

const expertise = (level: number): FeatureDef => ({
  id: level === 2 ? 'bard.expertise' : `bard.expertise-${level}`,
  name: 'Экспертность',
  description:
    level === 2
      ? 'Вы получаете Экспертность в двух навыках, которыми владеете (рекомендуются Выступление и Убеждение): бонус мастерства к их проверкам удваивается.'
      : 'Вы получаете Экспертность ещё в двух навыках, которыми владеете.',
  iconName: 'wisdom',
  choices: [{ id: 'expertise', label: 'Экспертность (2)', count: 2, pool: 'expertise', options: { from: 'expertise' } }],
});

// ------------------------------------------------------------------------------------------------
// Colleges
// ------------------------------------------------------------------------------------------------

const dance: SubclassDef = {
  id: 'college-of-dance',
  name: 'Коллегия танца',
  description: 'Барды, черпающие магию из движения: без доспехов они уворачиваются, бьют в танце и ведут союзников за собой.',
  levels: {
    3: [
      {
        id: 'dance.dazzling-footwork',
        name: 'Ослепительные фуэте',
        description:
          'Пока на вас нет доспехов и щита:\n\n- **Виртуоз танца.** Проверки Харизмы (Выступление) с танцем — с преимуществом.\n- **Защита без доспехов.** Базовый КД = 10 + модификатор Ловкости + модификатор Харизмы.\n- **Ловкие выпады.** Тратя Бардовское вдохновение частью действия, бонусного действия или реакции, вы можете тем же действием совершить безоружный удар.\n- **Бардовский урон.** Безоружные удары могут использовать Ловкость вместо Силы и наносить дробящий урон, равный броску кости вдохновения + модификатор Ловкости (кость не тратится).',
        action: 'passive',
        iconName: 'high-kick',
        effects: [
          { type: 'unarmoredDefense', attribute: 'charisma', noShield: true },
          {
            type: 'attack',
            attack: {
              id: 'dance.unarmed-strike',
              name: 'Безоружный удар (танец)',
              description: 'Бардовский урон: кость бардовского вдохновения + модификатор Ловкости, дробящий. Только без доспехов и щита.',
              damage: inspirationDice,
              damageType: 'Дробящий',
              abilities: ['dexterity', 'strength'],
              iconName: 'fist',
            },
          },
        ],
      },
    ],
    6: [
      {
        id: 'dance.inspiring-movement',
        name: 'Вдохновляющие движения',
        description:
          'Когда видимый вами враг заканчивает ход в пределах 5 футов от вас, вы можете реакцией потратить Бардовское вдохновение и переместиться на половину скорости; затем один союзник в пределах 30 футов может реакцией переместиться на половину своей скорости. Эти перемещения не провоцируют атак.',
        action: 'reaction',
        usesResource: { id: BARDIC_INSPIRATION },
        iconName: 'run',
      },
      {
        id: 'dance.tandem-footwork',
        name: 'Совместный танец',
        description:
          'Бросая инициативу (если вы не недееспособны), вы можете потратить Бардовское вдохновение: бросьте кость вдохновения — вы и союзники в пределах 30 футов, которые видят или слышат вас, прибавляют результат к инициативе.',
        action: 'passive',
        usesResource: { id: BARDIC_INSPIRATION },
        damage: inspirationDice,
        iconName: 'footprint',
      },
    ],
    14: [
      {
        id: 'dance.leading-evasion',
        name: 'Ведущее уклонение',
        description:
          'Если эффект позволяет спасброском Ловкости получить половину урона, при успехе вы не получаете урона, а при провале — половину. Существа в пределах 5 футов, совершающие тот же спасбросок, могут получить то же преимущество. Не работает, пока вы недееспособны.',
        action: 'passive',
        iconName: 'dodging',
      },
    ],
  },
};

const glamour: SubclassDef = {
  id: 'college-of-glamour',
  name: 'Коллегия очарования',
  description: 'Барды фейской магии: их песни очаровывают и пугают, а сами они облекаются в неземное величие.',
  alwaysPrepared: {
    3: ['charm-person', 'mirror-image'],
    6: ['command'],
  },
  levels: {
    3: [
      {
        id: 'glamour.beguiling-magic',
        name: 'Чарующая магия',
        description:
          'Заклинания «Очарование личности» и «Отражения» всегда подготовлены. Сразу после сотворения заклинания очарования или иллюзии с ячейкой вы можете заставить видимое существо в пределах 60 футов совершить спасбросок Мудрости против СЛ ваших заклинаний; при провале оно очаровано или испугано (на ваш выбор) на 1 минуту, повторяя спасбросок в конце каждого своего хода.\n\nРаз в продолжительный отдых; использование можно вернуть, потратив Бардовское вдохновение.',
        action: 'passive',
        resource: { id: 'glamour.beguiling-magic', name: 'Чарующая магия', max: 1, recharge: 'long', iconName: 'charm' },
        saveAttribute: 'wisdom',
        saveDC: spellDC,
        iconName: 'charm',
        color: '#d66ba0',
      },
      {
        id: 'glamour.mantle-of-inspiration',
        name: 'Ореол вдохновения',
        description:
          'Бонусным действием вы тратите Бардовское вдохновение и бросаете кость вдохновения. До (модификатор Харизмы, минимум 1) других существ в пределах 60 футов получают временные хиты, равные удвоенному результату, и каждое может реакцией переместиться на свою скорость, не провоцируя атак.',
        action: 'bonus',
        usesResource: { id: BARDIC_INSPIRATION },
        damage: inspirationDice,
        iconName: 'heart-wings',
      },
    ],
    6: [
      {
        id: 'glamour.mantle-of-majesty',
        name: 'Ореол величия',
        description:
          'Заклинание «Приказ» всегда подготовлено. Бонусным действием вы творите «Приказ» без ячейки и на 1 минуту (или пока не прервётся концентрация) принимаете неземной облик: всё это время вы можете бонусным действием творить «Приказ» без ячейки, а очарованные вами существа автоматически проваливают спасбросок от него.\n\nРаз в продолжительный отдых; использование можно вернуть, потратив ячейку 3-го круга или выше.',
        action: 'bonus',
        resource: { id: 'glamour.mantle-of-majesty', name: 'Ореол величия', max: 1, recharge: 'long', iconName: 'crown' },
        iconName: 'crown',
        color: '#d4a94e',
      },
    ],
    14: [
      {
        id: 'glamour.unbreakable-majesty',
        name: 'Несокрушимое величие',
        description:
          'Бонусным действием вы на 1 минуту (или пока не станете недееспособны) принимаете величественный облик. Каждый раз, когда существо попадает по вам атакой, оно совершает спасбросок Харизмы против СЛ ваших заклинаний; при провале атака промахивается.\n\nРаз в короткий или продолжительный отдых.',
        action: 'bonus',
        resource: { id: 'glamour.unbreakable-majesty', name: 'Несокрушимое величие', max: 1, recharge: 'shortOrLong', iconName: 'crowned-heart' },
        saveAttribute: 'charisma',
        saveDC: spellDC,
        iconName: 'crowned-heart',
      },
    ],
  },
};

const lore: SubclassDef = {
  id: 'college-of-lore',
  name: 'Коллегия знаний',
  description: 'Собиратели тайн и заклинаний из любых источников: острое слово сбивает врагов, а магия берётся отовсюду.',
  levels: {
    3: [
      {
        id: 'lore.bonus-proficiencies',
        name: 'Дополнительные навыки',
        description: 'Вы получаете владение тремя навыками на свой выбор.',
        iconName: 'book-pile',
        choices: [{ id: 'skills', label: 'Навыки (3)', count: 3, options: { from: 'skills' } }],
      },
      {
        id: 'lore.cutting-words',
        name: 'Острое словцо',
        description:
          'Когда видимое вами существо в пределах 60 футов совершает бросок урона, преуспевает в проверке характеристики или попадает атакой, вы можете реакцией потратить Бардовское вдохновение: бросьте кость вдохновения и вычтите результат из его броска.',
        action: 'reaction',
        usesResource: { id: BARDIC_INSPIRATION },
        damage: inspirationDice,
        iconName: 'drama-masks',
      },
    ],
    6: [
      {
        id: 'lore.magical-discoveries',
        name: 'Магические открытия',
        description:
          'Вы изучаете два заклинания из списков волшебника, друида или жреца в любой комбинации: заговоры или заклинания кругов, для которых у вас есть ячейки. Они всегда подготовлены и считаются для вас заклинаниями барда. Повышая уровень барда, можно заменить одно из них другим по тем же правилам.',
        iconName: 'crystal-ball',
        choices: [
          {
            id: 'spells',
            label: 'Магические открытия (2)',
            count: 2,
            pool: 'magical-discoveries',
            spellAbility: 'charisma',
            options: { from: 'spells', lists: ['wizard', 'druid', 'cleric'], maxLevel: maxBardSpellLevel },
          },
        ],
      },
    ],
    14: [
      {
        id: 'lore.peerless-skill',
        name: 'Непревзойдённый навык',
        description:
          'Провалив проверку характеристики или промахнувшись атакой, вы можете потратить Бардовское вдохновение: бросьте кость вдохновения и прибавьте результат к к20. Если результат всё равно провал, вдохновение не тратится.',
        action: 'passive',
        usesResource: { id: BARDIC_INSPIRATION },
        damage: inspirationDice,
        iconName: 'laurel-crown',
      },
    ],
  },
};

const valor: SubclassDef = {
  id: 'college-of-valor',
  name: 'Коллегия доблести',
  description: 'Сказители о героях прошлого, которые сами идут в бой: оружие, доспехи и вдохновение, что спасает от удара или усиливает его.',
  levels: {
    3: [
      {
        id: 'valor.combat-inspiration',
        name: 'Боевое вдохновение',
        description:
          'Существо с вашей костью Бардовского вдохновения может потратить её так:\n\n- **Защита.** Когда по нему попадает атака, оно реакцией бросает кость и прибавляет результат к КД против этой атаки.\n- **Нападение.** Попав по цели атакой, оно бросает кость и прибавляет результат к урону этой атаки.',
        action: 'passive',
        damage: inspirationDice,
        iconName: 'shield-impact',
      },
      {
        id: 'valor.martial-training',
        name: 'Боевая подготовка',
        description:
          'Вы получаете владение воинским оружием и тренированность со средними доспехами и щитами. Простое или воинское оружие может служить вам заклинательной фокусировкой для заклинаний барда.',
        iconName: 'crossed-swords',
        effects: [
          { type: 'proficiency', category: 'weapon', value: 'Воинское оружие' },
          { type: 'proficiency', category: 'armor', value: 'Средние доспехи' },
          { type: 'proficiency', category: 'armor', value: 'Щиты' },
        ],
      },
    ],
    6: [
      {
        id: 'valor.extra-attack',
        name: 'Дополнительная атака',
        description:
          'Совершая действие «Атака» в свой ход, вы атакуете дважды вместо одного раза. Одну из этих атак можно заменить сотворением заговора со временем накладывания «действие».',
        action: 'passive',
        iconName: 'sword-spin',
      },
    ],
    14: [
      {
        id: 'valor.battle-magic',
        name: 'Боевая магия',
        description: 'Сотворив заклинание со временем накладывания «действие», вы можете бонусным действием совершить одну атаку оружием.',
        action: 'bonus',
        iconName: 'rune-sword',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Colleges of the supplement books
// ------------------------------------------------------------------------------------------------

const moon: SubclassDef = {
  id: 'college-of-the-moon',
  name: 'Коллегия луны',
  description: 'Барды друидских кругов островов Муншэй: первобытная магия луны прячет их в тенях, усиливает исцеление и лечит союзников лунным светом.',
  source: 'Forgotten Realms: Heroes of Faerûn',
  alwaysPrepared: { 6: ['moonbeam'] },
  levels: {
    3: [
      {
        id: 'moon.inspired-eclipse',
        name: 'Вдохновение луны: вдохновенное затмение',
        description:
          'Когда вы бонусным действием даёте кость Бардовского вдохновения, тем же действием вы можете стать Невидимым и телепортироваться на 30 футов в видимое незанятое пространство. Невидимость длится до начала вашего следующего хода и кончается сразу, как вы сотворите заклинание, нанесёте урон или совершите бросок атаки.',
        action: 'passive',
        iconName: 'moon-orbit',
        color: '#b8c4e8',
      },
      {
        id: 'moon.lunar-vitality',
        name: 'Вдохновение луны: лунная живучесть',
        description:
          'Раз в ход, восстанавливая существу хиты заклинанием, вы можете потратить Бардовское вдохновение: бросьте кость вдохновения и прибавьте результат к восстановленным хитам, а скорость существа до конца его следующего хода растёт на 10 футов.',
        action: 'passive',
        usesResource: { id: BARDIC_INSPIRATION },
        damage: inspirationDice,
        damageType: 'Лечение',
        iconName: 'moon',
        color: '#b8c4e8',
      },
      {
        id: 'moon.primal-lore',
        name: 'Древние знания',
        description:
          'Вы знаете Друидический язык и один заговор друида: он считается для вас заклинанием барда и не входит в число известных заговоров; повышая уровень барда, его можно заменить другим заговором друида. Кроме того, вы владеете одним навыком на выбор: Восприятие, Выживание, Медицина, Обращение с животными, Природа или Проницательность.',
        iconName: 'oak-leaf',
        effects: [{ type: 'proficiency', category: 'language', value: 'Друидический' }],
        choices: [
          {
            id: 'cantrip',
            label: 'Заговор друида',
            count: 1,
            pool: 'moon-cantrip',
            spellAbility: 'charisma',
            options: { from: 'spells', lists: ['druid'], maxLevel: 0 },
          },
          {
            id: 'skill',
            label: 'Навык',
            count: 1,
            options: { from: 'skills', list: ['perception', 'survival', 'medicine', 'animalHandling', 'nature', 'insight'] },
          },
        ],
      },
    ],
    6: [
      {
        id: 'moon.blessing-of-moonlight',
        name: 'Благословение лунного света',
        description:
          'Заклинание «Лунный луч» всегда подготовлено. Сотворяя его, вы можете изменить заклинание: пока оно действует, вы излучаете тусклый свет на 5 футов, и каждый раз, когда существо проваливает спасбросок от этого луча, другое видимое вами существо в пределах 60 футов восстанавливает 2к4 хитов. Раз в продолжительный отдых.',
        action: 'passive',
        resource: { id: 'moon.blessing-of-moonlight', name: 'Благословение лунного света', max: 1, recharge: 'long', iconName: 'night-sky' },
        damage: '2d4',
        damageType: 'Лечение',
        iconName: 'night-sky',
        color: '#b8c4e8',
      },
    ],
    14: [
      {
        id: 'moon.eventides-splendor',
        name: 'Вечернее великолепие',
        description:
          'Вдохновение луны усиливается:\n\n- **Тень новолуния.** Используя Вдохновенное затмение, существо, получившее кость вдохновения, тоже может стать Невидимым (до начала своего следующего хода) и реакцией телепортироваться на 30 футов в видимое им незанятое пространство.\n- **Резонанс полнолуния.** Для Лунной живучести можно не тратить вдохновение, а бросить 1к6 вместо кости вдохновения.',
        action: 'passive',
        iconName: 'star-swirl',
        color: '#b8c4e8',
      },
    ],
  },
};

const spirits: SubclassDef = {
  id: 'college-of-the-spirits',
  name: 'Коллегия духов',
  description: 'Барды-медиумы, призывающие духов из древних легенд. Духи своенравны: какой придёт, решает кость вдохновения.',
  source: 'Ravenloft: The Horrors Within',
  alwaysPrepared: { 6: ['spirit-guardians'] },
  levels: {
    3: [
      {
        id: 'spirits.guiding-whispers',
        name: 'Проводник',
        description:
          '- **Направляющий шёпот.** Вы знаете заговор «Наставление»; его дистанция для вас — 60 футов.\n- **Спиритическая фокусировка.** Вы получаете игральные карты и владение ими. Они служат фокусировкой для заклинаний барда; вместо них подходят кристалл, сфера, свеча или писчее перо.',
        iconName: 'rolling-dices',
        effects: [
          { type: 'spell', spell: 'guidance', alwaysPrepared: true, note: 'Дистанция 60 футов' },
          { type: 'proficiency', category: 'tool', value: 'Игральные карты' },
        ],
      },
      {
        id: 'spirits.tales-from-beyond',
        name: 'Замогильные духи',
        description:
          'Давая бонусным действием кость Бардовского вдохновения, вы можете призвать случайного духа: бросьте кость вдохновения и сверьтесь с таблицей. Дух остаётся, пока вы его не выпустите или не закончите короткий или продолжительный отдых.\n\n**Управляемый призыв.** Бонусным действием вы тратите Бардовское вдохновение и выбираете духа сами — с номером не выше максимума кости вдохновения (к8 → до Тени).\n\n1. **Возлюбленный** — цель восстанавливает кость + мод. Харизмы хитов.\n2. **Стрелок** — кость + мод. Харизмы силового урона.\n3. **Мститель** — до конца вашего следующего хода каждый, кто попадает по цели рукопашной атакой, получает кость силового урона.\n4. **Отступник** — цель может реакцией телепортироваться на 30 футов в видимое незанятое пространство.\n5. **Предсказатель** — цель совершает все тесты к20 с преимуществом до начала вашего следующего хода.\n6. **Странник** — временные хиты: кость + уровень барда; пока они есть, скорость +10 футов.\n7. **Проказник** — спасбросок Мудрости: при провале 2 кости психического урона и Очарован до начала вашего следующего хода, при успехе половина урона.\n8. **Тень** — цель Невидима до конца своего следующего хода (или пока не атакует, не нанесёт урон, не сотворит заклинание); когда невидимость кончается, существа в эманации 5 футов совершают спасбросок Телосложения — 2 кости некротического урона при провале.\n9. **Поджигатель** — спасбросок Ловкости: 4 кости урона огнём, половина при успехе.\n10. **Трус** — цель и выбранные существа в эманации 30 футов от неё при провале спасброска Мудрости Испуганы до начала вашего следующего хода; их скорость вдвое меньше, и в ход они совершают либо действие, либо бонусное действие.\n11. **Силач** — выбранные существа в эманации 30 футов от цели совершают спасбросок Силы: 3 кости урона звуком и Опрокинуты при провале, половина урона при успехе.\n12. **Жрец** — цель восстанавливает 2 кости хитов, и с неё снимается одно состояние на выбор: Оглохший, Ослеплённый, Отравленный, Очарованный, Ошеломлённый или Парализованный.',
        action: 'bonus',
        usesResource: { id: BARDIC_INSPIRATION },
        damage: inspirationDice,
        iconName: 'spectre',
        color: '#9fd4c8',
      },
      {
        id: 'spirits.release-spirit',
        name: 'Выпустить духа',
        description: 'Действием «Магия» вы выпускаете одного призванного духа на видимое существо в пределах 30 футов: на него действует эффект этого духа из таблицы Замогильных духов. СЛ спасбросков — СЛ ваших заклинаний барда.',
        action: 'action',
        saveDC: spellDC,
        damage: inspirationDice,
        iconName: 'smoking-orb',
        color: '#9fd4c8',
      },
    ],
    6: [
      {
        id: 'spirits.otherworldly-powers',
        name: 'Улучшенный призыв: силы с того света',
        description: 'Раз в ход, сотворяя с ячейкой заклинание барда, которое наносит урон или восстанавливает хиты, бросьте 1к6 и прибавьте результат к одному броску урона или к восстановленным хитам.',
        action: 'passive',
        damage: '1d6',
        iconName: 'magic-swirl',
      },
      {
        id: 'spirits.spirit-manifestation',
        name: 'Улучшенный призыв: проявление духов',
        description:
          'Заклинание «Духовные стражи» всегда подготовлено; раз в продолжительный отдых его можно сотворить без ячейки. Сотворяя его, вы можете изменить заклинание: вы и союзники в эманации стражей получаете укрытие на половину. Такое изменение — раз в короткий или продолжительный отдых.',
        action: 'passive',
        resource: { id: 'spirits.spirit-manifestation', name: 'Духовные стражи без ячейки', max: 1, recharge: 'long', iconName: 'hooded-figure' },
        iconName: 'hooded-figure',
        color: '#9fd4c8',
      },
    ],
    14: [
      {
        id: 'spirits.mystical-connection',
        name: 'Мистическая связь',
        description: 'Бросая по таблице Замогильных духов, вы бросаете дважды и выбираете духа; если выпали одинаковые числа, можно выбрать любого духа таблицы.',
        action: 'passive',
        iconName: 'perspective-dice-six-faces-random',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

/** Starting equipment of the 2024 Bard. */
export const BARD_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'leather-armor' },
      { ref: 'dagger', quantity: 2 },
      { ref: 'musical-instrument' },
      { ref: 'entertainers-pack' },
    ],
    gold: 19,
  },
  { id: 'b', label: 'B', items: [], gold: 90 },
];

export const BARD: ClassDef = {
  id: 'bard',
  name: 'Бард',
  description: 'Исполнитель, чья музыка, слово или танец несут магию. Вдохновляет союзников, знает понемногу всё и черпает заклинания из любых традиций.',
  hitDie: 8,
  primary: ['charisma'],
  saves: ['dexterity', 'charisma'],
  skillChoices: { count: 3, list: ALL_SKILLS },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
  ],
  subclassLevel: 3,
  subclasses: [dance, glamour, lore, valor, moon, spirits],
  startingEquipment: BARD_KITS,
  replaceable: [
    { pool: 'magical-discoveries', label: 'Замена магического открытия' },
    { pool: 'moon-cantrip', label: 'Замена заговора друида' },
  ],
  spellcasting: {
    ability: 'charisma',
    list: 'bard',
    slots: FULL_CASTER_SLOTS,
    mode: 'known',
    prepared: byTable([4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22]),
    cantrips: byClassLevel({ 1: 2, 4: 3, 10: 4 }),
    extraLists: { from: 10, lists: ['cleric', 'druid', 'wizard'] },
  },
  levels: {
    1: [
      {
        id: 'bard.bardic-inspiration',
        name: 'Бардовское вдохновение',
        description:
          'Бонусным действием вы даёте существу в пределах 60 футов, которое видит или слышит вас, кость Бардовского вдохновения (у существа может быть только одна). В течение часа, провалив тест к20, оно может бросить кость и прибавить результат, возможно превратив провал в успех.\n\nКость: к6, к8 с 5-го уровня, к10 с 10-го, к12 с 15-го. Использований — модификатор Харизмы (минимум 1); восстанавливаются после продолжительного отдыха (с 5-го уровня — и после короткого).',
        action: 'bonus',
        damage: inspirationDice,
        resource: {
          id: BARDIC_INSPIRATION,
          name: 'Бардовское вдохновение',
          max: modifierOf('charisma'),
          recharge: (ctx) => (ctx.classLevel >= 5 ? 'shortOrLong' : 'long'),
          description: 'Кость вдохновения: к6, с 5-го уровня к8, с 10-го к10, с 15-го к12.',
          iconName: 'musical-notes',
        },
        iconName: 'musical-notes',
        color: '#c9a0dc',
      },
      {
        id: 'bard.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания барда Харизмой (СЛ = 8 + бонус мастерства + модификатор Харизмы; бонус атаки = бонус мастерства + модификатор Харизмы). Вы знаете 2 заговора (3 с 4-го уровня, 4 с 10-го) и держите подготовленными заклинания из списка барда: 4 на 1-м уровне, дальше по таблице класса. Повышая уровень, можно заменить один заговор и одно заклинание. Музыкальный инструмент служит заклинательной фокусировкой.',
        action: 'passive',
        iconName: 'spell-book',
      },
      {
        id: 'bard.instruments',
        name: 'Музыкальные инструменты',
        description: 'Вы владеете тремя музыкальными инструментами на свой выбор.',
        hidden: true,
        choices: [{ id: 'tools', label: 'Музыкальные инструменты (3)', count: 3, options: { from: 'tools', list: MUSICAL_INSTRUMENT_NAMES } }],
      },
    ],
    2: [
      {
        id: 'bard.jack-of-all-trades',
        name: 'Мастер на все руки',
        description: 'К проверкам характеристик с навыком, которым вы не владеете, вы прибавляете половину бонуса мастерства (с округлением вниз), если бонус мастерства не прибавляется к ним иначе.',
        action: 'passive',
        effects: [{ type: 'halfProficiency' }],
        iconName: 'jester-hat',
      },
      expertise(2),
    ],
    3: [subclassHeading('bard', 'Подкласс барда', 'Вы выбираете коллегию: танца, очарования, знаний, доблести, луны или духов.')],
    4: [abilityScoreImprovement('bard', 4)],
    5: [
      {
        id: 'bard.font-of-inspiration',
        name: 'Источник вдохновения',
        description:
          'Бардовское вдохновение восстанавливается после короткого или продолжительного отдыха. Кроме того, вы можете потратить ячейку заклинаний, чтобы вернуть одно использование вдохновения (действие не требуется).',
        action: 'passive',
        iconName: 'sing',
      },
    ],
    7: [
      {
        id: 'bard.countercharm',
        name: 'Контрочарование',
        description:
          'Когда вы или существо в пределах 30 футов проваливаете спасбросок от эффекта, накладывающего состояние «Очарован» или «Испуган», вы можете реакцией заставить перебросить его с преимуществом.',
        action: 'reaction',
        iconName: 'shield-reflect',
      },
    ],
    8: [abilityScoreImprovement('bard', 8)],
    9: [expertise(9)],
    10: [
      {
        id: 'bard.magical-secrets',
        name: 'Тайны магии',
        description:
          'Когда число ваших подготовленных заклинаний растёт с уровнем, новые заклинания можно брать из списков барда, волшебника, друида и жреца; они считаются для вас заклинаниями барда. Заменяя заклинание, вы тоже можете выбрать замену из этих списков.',
        action: 'passive',
        iconName: 'book-aura',
      },
    ],
    12: [abilityScoreImprovement('bard', 12)],
    16: [abilityScoreImprovement('bard', 16)],
    18: [
      {
        id: 'bard.superior-inspiration',
        name: 'Превосходное вдохновение',
        description: 'Бросая инициативу, вы восстанавливаете использования Бардовского вдохновения, пока их не станет два, если у вас было меньше.',
        action: 'passive',
        iconName: 'rally-the-troops',
      },
    ],
    19: [epicBoon('bard')],
    20: [
      {
        id: 'bard.words-of-creation',
        name: 'Слова Творения',
        description:
          'Заклинания «Слово силы: исцеление» и «Слово силы: смерть» всегда подготовлены. Творя любое из них, вы можете выбрать вторую цель в пределах 10 футов от первой.',
        action: 'passive',
        effects: [
          { type: 'spell', spell: 'power-word-heal', alwaysPrepared: true },
          { type: 'spell', spell: 'power-word-kill', alwaysPrepared: true },
        ],
        iconName: 'life-in-the-balance',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const BARD_ICONS = {
  class: 'lyre',
  subclasses: {
    'college-of-dance': 'flower-twirl',
    'college-of-glamour': 'fairy-wings',
    'college-of-lore': 'book-pile',
    'college-of-valor': 'sparkling-sabre',
    'college-of-the-moon': 'moon',
    'college-of-the-spirits': 'ghost',
  } as Record<string, string>,
};
