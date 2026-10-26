import { byClassLevel, modifierOf } from '../../helpers';
import type { BuildContext, ClassDef, FeatureDef, KitOption, SubclassDef } from '../../types';
import { THIRD_CASTER_SLOTS, abilityScoreImprovement, epicBoon, subclassHeading, weaponMasteryChoice } from './shared';

/** Плут of the 2024 Player's Handbook. Descriptions are our own summaries of the rules. */

const PSIONIC_ENERGY = 'soulknife.psionic-energy';

/** DC of Cunning Strike and of the rogue's own saves: 8 + Dexterity modifier + proficiency bonus. */
const dexDC = (ctx: BuildContext) => 8 + ctx.proficiencyBonus + ctx.modifier('dexterity');

/** Soulknife's Psionic Energy die: d6, d8 from level 5, d10 from 11, d12 from 17. */
const psionicDie = byClassLevel({ 3: 6, 5: 8, 11: 10, 17: 12 });
const psionicDice = (ctx: BuildContext) => `1d${psionicDie(ctx)}`;

const expertise = (level: number): FeatureDef => ({
  id: level === 1 ? 'rogue.expertise' : `rogue.expertise-${level}`,
  name: 'Экспертность',
  description:
    level === 1
      ? 'Вы получаете Экспертность в двух навыках, которыми владеете (рекомендуются Ловкость рук и Скрытность): бонус мастерства к их проверкам удваивается.'
      : 'Вы получаете Экспертность ещё в двух навыках, которыми владеете.',
  iconName: 'wisdom',
  choices: [{ id: 'expertise', label: 'Экспертность (2)', count: 2, pool: 'expertise', options: { from: 'expertise' } }],
});

// ------------------------------------------------------------------------------------------------
// Subclasses
// ------------------------------------------------------------------------------------------------

const arcaneTrickster: SubclassDef = {
  id: 'arcane-trickster',
  name: 'Мистический ловкач',
  description: 'Плут, подкрепивший скрытность и ловкость магией волшебников: невидимая волшебная рука, иллюзии и украденные заклинания.',
  spellcasting: {
    ability: 'intelligence',
    list: 'wizard',
    slots: THIRD_CASTER_SLOTS,
    mode: 'known',
    prepared: byClassLevel({ 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 }),
    cantrips: byClassLevel({ 3: 2, 10: 3 }),
  },
  levels: {
    3: [
      {
        id: 'arcane-trickster.spellcasting',
        name: 'Сотворение заклинаний',
        description:
          'Вы творите заклинания волшебника Интеллектом (СЛ = 8 + бонус мастерства + модификатор Интеллекта). Вы знаете «Волшебную руку» и ещё 2 заговора волшебника (3 с 10-го уровня), а также держите подготовленными заклинания волшебника: 3 на 3-м уровне, дальше по таблице подкласса, только тех кругов, для которых есть ячейки. Повышая уровень, можно заменить один заговор (кроме «Волшебной руки») и одно заклинание. Заклинательная фокусировка — магическая.',
        action: 'passive',
        effects: [{ type: 'spell', spell: 'mage-hand', alwaysPrepared: true }],
        iconName: 'spell-book',
      },
      {
        id: 'arcane-trickster.mage-hand-legerdemain',
        name: 'Ловкость волшебной руки',
        description:
          'Вы творите «Волшебную руку» бонусным действием и можете сделать её невидимой. Управлять рукой можно бонусным действием, и ею можно совершать проверки Ловкости (Ловкость рук).',
        action: 'bonus',
        iconName: 'magic-palm',
      },
    ],
    9: [
      {
        id: 'arcane-trickster.magical-ambush',
        name: 'Магическая засада',
        description: 'Если вы невидимы, когда творите заклинание на существо, в этом ходу оно совершает спасброски от этого заклинания с помехой.',
        action: 'passive',
        iconName: 'invisible',
      },
    ],
    13: [
      {
        id: 'arcane-trickster.versatile-trickster',
        name: 'Многогранный ловкач',
        description: 'Применяя к существу Подсечку Хитрого удара, вы можете применить тот же эффект и к другому существу в пределах 5 футов от вашей Волшебной руки.',
        action: 'passive',
        iconName: 'glowing-hands',
      },
    ],
    17: [
      {
        id: 'arcane-trickster.spell-thief',
        name: 'Вор заклинаний',
        description:
          'Сразу после того, как существо творит заклинание, нацеленное на вас или задевающее вас областью, вы можете реакцией заставить его совершить спасбросок Интеллекта против СЛ ваших заклинаний. При провале заклинание на вас не действует, а если оно 1-го круга или выше и вам доступен его круг, вы крадёте его: 8 часов оно у вас подготовлено (даже не из списка волшебника), а заклинатель не может его творить.\n\nРаз в продолжительный отдых.',
        action: 'reaction',
        resource: { id: 'arcane-trickster.spell-thief', name: 'Вор заклинаний', max: 1, recharge: 'long', iconName: 'swap-bag' },
        saveAttribute: 'intelligence',
        saveDC: (ctx) => 8 + ctx.proficiencyBonus + ctx.modifier('intelligence'),
        iconName: 'swap-bag',
      },
    ],
  },
};

const assassin: SubclassDef = {
  id: 'assassin',
  name: 'Убийца',
  description: 'Мастер засад, ядов и маскировки: первый удар из тени часто становится последним.',
  levels: {
    3: [
      {
        id: 'assassin.assassinate',
        name: 'Ликвидация',
        description:
          '**Инициатива.** Броски инициативы вы совершаете с преимуществом.\n\n**Внезапные атаки.** В первом раунде боя вы атакуете с преимуществом любое существо, которое ещё не совершило ход. Если в первом раунде ваша Коварная атака наносит урон, цель получает дополнительный урон того же типа, равный вашему уровню плута.',
        action: 'passive',
        damage: (ctx) => String(ctx.classLevel),
        iconName: 'ninja-mask',
      },
      {
        id: 'assassin.assassins-tools',
        name: 'Инструменты убийцы',
        description: 'Вы получаете набор для грима и инструменты отравителя и владеете ими.',
        iconName: 'poison-bottle',
        effects: [
          { type: 'proficiency', category: 'tool', value: 'Набор для грима' },
          { type: 'proficiency', category: 'tool', value: 'Инструменты отравителя' },
        ],
      },
    ],
    9: [
      {
        id: 'assassin.infiltration-expertise',
        name: 'Мастер проникновения',
        description:
          '**Мастерское подражание.** Изучив чужую речь или почерк не менее часа, вы безошибочно их подделываете.\n\n**Прицеливание на ходу.** Точное прицеливание не снижает вашу скорость до 0.',
        action: 'passive',
        iconName: 'robber-mask',
      },
    ],
    13: [
      {
        id: 'assassin.envenom-weapons',
        name: 'Покрытое ядом оружие',
        description: 'Когда вы применяете Отравление Хитрого удара, цель получает 2к6 урона ядом при каждом проваленном спасброске от этого эффекта. Урон игнорирует сопротивление яду.',
        action: 'passive',
        damage: '2d6',
        damageType: 'Яд',
        iconName: 'poison-gas',
        color: '#7fb069',
      },
    ],
    17: [
      {
        id: 'assassin.death-strike',
        name: 'Смертельный удар',
        description: 'Когда вы попадаете Коварной атакой в первом раунде боя, цель совершает спасбросок Телосложения; при провале урон всей атаки удваивается.',
        action: 'passive',
        saveAttribute: 'constitution',
        saveDC: dexDC,
        iconName: 'grim-reaper',
      },
    ],
  },
};

const soulknife: SubclassDef = {
  id: 'soulknife',
  name: 'Клинок душ',
  description: 'Плут с пробудившейся псионикой: клинки из психической энергии, телепатия и прыжки сквозь пространство.',
  levels: {
    3: [
      {
        id: 'soulknife.psionic-power',
        name: 'Псионическая сила',
        description:
          'У вас есть кости пси-энергии: 4 к6 на 3-м уровне, 6 к8 с 5-го, 8 к8 с 9-го, 8 к10 с 11-го, 10 к10 с 13-го, 12 к12 с 17-го. Короткий отдых возвращает одну потраченную кость, продолжительный — все. Их тратят умения этого подкласса.',
        action: 'passive',
        resource: {
          id: PSIONIC_ENERGY,
          name: 'Кости пси-энергии',
          max: byClassLevel({ 3: 4, 5: 6, 9: 8, 13: 10, 17: 12 }),
          recharge: 'long',
          shortRestRegain: 1,
          description: 'Кость пси-энергии: к6, с 5-го уровня к8, с 11-го к10, с 17-го к12. Короткий отдых возвращает одну кость.',
          iconName: 'psychic-waves',
        },
        iconName: 'psychic-waves',
        color: '#9b7fd4',
      },
      {
        id: 'soulknife.psi-bolstered-knack',
        name: 'Усиленная псионикой сноровка',
        description: 'Провалив проверку характеристики с навыком или инструментом, которым владеете, вы можете бросить кость пси-энергии и прибавить результат. Кость тратится, только если проверка стала успешной.',
        action: 'passive',
        usesResource: { id: PSIONIC_ENERGY },
        damage: psionicDice,
        iconName: 'third-eye',
      },
      {
        id: 'soulknife.psychic-whispers',
        name: 'Психический шёпот',
        description:
          'Действием «Магия» вы выбираете видимых существ (не больше бонуса мастерства) и бросаете кость пси-энергии: на столько часов вы и они можете телепатически общаться на расстоянии до 1 мили. Первое использование после продолжительного отдыха бесплатно, далее каждое тратит кость пси-энергии.',
        action: 'action',
        resource: { id: 'soulknife.psychic-whispers', name: 'Психический шёпот', max: 1, recharge: 'long' },
        damage: psionicDice,
        iconName: 'brain-tentacle',
      },
      {
        id: 'soulknife.psychic-blades',
        name: 'Психические клинки',
        description:
          'Совершая действие «Атака» или атаку по возможности, вы можете проявить в свободной руке психический клинок и атаковать им: простое рукопашное оружие, 1к6 + модификатор психического урона, свойства Фехтовальное и Метательное (60/120), мастерство Отвлекающее (не считается в лимит Оружейного мастерства). Клинок исчезает после атаки.\n\nАтаковав клинком в свой ход, вы можете бонусным действием атаковать вторым клинком другой рукой; его кость урона — 1к4.',
        action: 'passive',
        iconName: 'energy-sword',
        effects: [
          {
            type: 'attack',
            attack: {
              id: 'soulknife.psychic-blade',
              name: 'Психический клинок',
              description: 'Фехтовальное, метательное (60/120), мастерство «Отвлекающее». Исчезает после атаки.',
              damage: '1d6',
              damageType: 'Психический',
              abilities: ['strength', 'dexterity'],
              actionType: 'action',
              iconName: 'energy-sword',
            },
          },
          {
            type: 'attack',
            attack: {
              id: 'soulknife.psychic-blade-bonus',
              name: 'Второй психический клинок',
              description: 'Бонусным действием после атаки психическим клинком в этот ход, другой свободной рукой.',
              damage: '1d4',
              damageType: 'Психический',
              abilities: ['strength', 'dexterity'],
              actionType: 'bonus',
              iconName: 'lightning-saber',
            },
          },
        ],
      },
    ],
    9: [
      {
        id: 'soulknife.homing-strikes',
        name: 'Клинки души: самонаводящиеся удары',
        description: 'Промахнувшись атакой психическим клинком, вы можете бросить кость пси-энергии и прибавить результат к броску атаки. Кость тратится, только если атака попала.',
        action: 'passive',
        usesResource: { id: PSIONIC_ENERGY },
        damage: psionicDice,
        iconName: 'eye-target',
      },
      {
        id: 'soulknife.psychic-teleportation',
        name: 'Клинки души: психическая телепортация',
        description: 'Бонусным действием вы тратите кость пси-энергии, бросаете её и мечете клинок в видимое свободное пространство на расстоянии до 10 × результат футов, а затем телепортируетесь туда.',
        action: 'bonus',
        usesResource: { id: PSIONIC_ENERGY },
        damage: psionicDice,
        iconName: 'teleport',
      },
    ],
    13: [
      {
        id: 'soulknife.psychic-veil',
        name: 'Психическая завеса',
        description:
          'Действием «Магия» вы становитесь невидимым на 1 час или пока не отмените эффект. Невидимость кончается сразу после того, как вы наносите урон существу или заставляете его совершить спасбросок.\n\nРаз в продолжительный отдых; использование можно вернуть, потратив кость пси-энергии.',
        action: 'action',
        resource: { id: 'soulknife.psychic-veil', name: 'Психическая завеса', max: 1, recharge: 'long' },
        iconName: 'smoking-orb',
      },
    ],
    17: [
      {
        id: 'soulknife.rend-mind',
        name: 'Раздирание разума',
        description:
          'Когда вы наносите урон Коварной атакой психическим клинком, цель совершает спасбросок Мудрости; при провале она ошеломлена на 1 минуту, повторяя спасбросок в конце каждого своего хода.\n\nРаз в продолжительный отдых; использование можно вернуть, потратив три кости пси-энергии.',
        action: 'passive',
        resource: { id: 'soulknife.rend-mind', name: 'Раздирание разума', max: 1, recharge: 'long' },
        saveAttribute: 'wisdom',
        saveDC: dexDC,
        iconName: 'burning-eye',
      },
    ],
  },
};

const thief: SubclassDef = {
  id: 'thief',
  name: 'Вор',
  description: 'Взломщик, кладоискатель и исследователь руин: быстрые руки, лазание по стенам и чужие магические предметы.',
  levels: {
    3: [
      {
        id: 'thief.fast-hands',
        name: 'Быстрые руки',
        description:
          'Бонусным действием вы можете:\n\n- **Ловкость рук.** Совершить проверку Ловкости (Ловкость рук), чтобы вскрыть замок или обезвредить ловушку воровскими инструментами либо обчистить карман.\n- **Использование предмета.** Совершить действие «Использование» или действием «Магия» применить магический предмет, которому нужно это действие.',
        action: 'bonus',
        iconName: 'grab',
      },
      {
        id: 'thief.second-story-work',
        name: 'Взлом с проникновением',
        description: '**Верхолаз.** Вы получаете скорость лазания, равную скорости ходьбы.\n\n**Прыгун.** Дальность прыжков вы можете определять Ловкостью вместо Силы.',
        effects: [{ type: 'movement', mode: 'climb' }],
        iconName: 'rope-coil',
      },
    ],
    9: [
      {
        id: 'thief.supreme-sneak',
        name: 'Совершенная скрытность',
        description: 'Вы получаете вариант Хитрого удара **Скрытная атака** (стоимость 1к6): если вы невидимы благодаря действию «Затаивание», этот удар не снимает невидимость, если вы заканчиваете ход за укрытием на три четверти или полным.',
        action: 'passive',
        iconName: 'ninja-heroic-stance',
      },
    ],
    13: [
      {
        id: 'thief.use-magic-device',
        name: 'Использование магических предметов',
        description:
          '**Настройка.** Вы можете быть настроены одновременно на четыре предмета.\n\n**Заряды.** Тратя заряды свойства магического предмета, бросьте к6: на «6» заряд не тратится.\n\n**Свитки.** Вы можете использовать любые свитки заклинаний, творя их Интеллектом. Заговор или заклинание 1-го круга творится без проверки; более высокий круг требует проверки Интеллекта (Магия) СЛ 10 + круг, при провале свиток рассыпается.',
        action: 'passive',
        iconName: 'magic-potion',
      },
    ],
    17: [
      {
        id: 'thief.thiefs-reflexes',
        name: 'Воровские рефлексы',
        description: 'В первом раунде каждого боя вы совершаете два хода: первый — по своей инициативе, второй — с инициативой на 10 меньше.',
        action: 'passive',
        iconName: 'hourglass',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Subclasses of the supplement books
// ------------------------------------------------------------------------------------------------

const BLOODTHIRST = 'scion-of-the-three.bloodthirst';

/** The three dead gods of Dread Allegiance: resistance and a cantrip cast with Intelligence. */
const DEAD_THREE: { id: string; name: string; damageType: string; resistance: string; cantrip: string; cantripName: string }[] = [
  { id: 'bhaal', name: 'Баал', damageType: 'Яд', resistance: 'урону ядом', cantrip: 'blade-ward', cantripName: 'Защита от оружия' },
  { id: 'bane', name: 'Бэйн', damageType: 'Психический', resistance: 'психическому урону', cantrip: 'minor-illusion', cantripName: 'Малая иллюзия' },
  { id: 'myrkul', name: 'Миркул', damageType: 'Некротический', resistance: 'некротическому урону', cantrip: 'chill-touch', cantripName: 'Леденящее прикосновение' },
];

const scionOfTheThree: SubclassDef = {
  id: 'scion-of-the-three',
  name: 'Наследник троицы',
  description: 'Плут, одарённый Мёртвой троицей — Баалом, Бэйном и Миркулом: телепортируется к раненым врагам, сеет страх и злобу.',
  source: 'Forgotten Realms: Heroes of Faerûn',
  levels: {
    3: [
      {
        id: 'scion-of-the-three.bloodthirst',
        name: 'Кровожадность',
        description:
          'Когда видимый вами враг в пределах 30 футов получает урон и после этого окровавлен (но не убит мгновенно), вы можете реакцией телепортироваться в видимое незанятое пространство в пределах 5 футов от него, а затем совершить одну рукопашную атаку. Использований — модификатор Интеллекта (минимум 1) за продолжительный отдых.',
        action: 'reaction',
        resource: { id: BLOODTHIRST, name: 'Кровожадность', max: modifierOf('intelligence'), recharge: 'long', iconName: 'bleeding-wound' },
        iconName: 'bleeding-wound',
        color: '#b0413e',
      },
      {
        id: 'scion-of-the-three.dread-allegiance',
        name: 'Ужасная преданность',
        description:
          'Вы выбираете одного из Троицы и получаете сопротивление урону и заговор (творится Интеллектом): Баал — яд, «Защита от оружия»; Бэйн — психический, «Малая иллюзия»; Миркул — некротический, «Леденящее прикосновение». После продолжительного отдыха божество можно сменить.',
        iconName: 'pentacle',
        choices: [
          {
            id: 'deity',
            label: 'Божество Троицы',
            count: 1,
            hint: 'Можно сменить после продолжительного отдыха.',
            options: {
              from: 'options',
              options: DEAD_THREE.map((god) => ({
                id: god.id,
                name: god.name,
                description: `Сопротивление ${god.resistance}; заговор «${god.cantripName}» (Интеллект).`,
                effects: [
                  { type: 'resistance' as const, damageType: god.damageType },
                  { type: 'spell' as const, spell: god.cantrip, alwaysPrepared: true, ability: 'intelligence' as const },
                ],
              })),
            },
          },
        ],
      },
    ],
    9: [
      {
        id: 'scion-of-the-three.strike-of-fear',
        name: 'Удар страха',
        description:
          'Вы получаете вариант Хитрого удара **Удар страха** (стоимость 1к6): цель совершает спасбросок Мудрости, иначе испугана на 1 минуту и повторяет спасбросок в конце каждого своего хода. Пока она испугана так, ваши броски атаки по ней совершаются с преимуществом.',
        action: 'passive',
        saveAttribute: 'wisdom',
        saveDC: dexDC,
        iconName: 'terror',
      },
    ],
    13: [
      {
        id: 'scion-of-the-three.aura-of-malevolence',
        name: 'Аура злобы',
        description:
          'Телепортируясь Кровожадностью, вы выбираете существ в пределах 10 футов от места, откуда или куда переместились (на выбор). Каждое получает урон, равный модификатору Интеллекта, того типа, что дало божество Ужасной преданности; этот урон игнорирует сопротивление.',
        action: 'passive',
        iconName: 'death-zone',
      },
    ],
    17: [
      {
        id: 'scion-of-the-three.dread-incarnate',
        name: 'Воплощение ужаса',
        description:
          '**Головорез.** Завершив короткий отдых, вы восстанавливаете одно использование Кровожадности.\n\n**Убийственный замысел.** В бросках урона Коварной атаки результаты «1» и «2» на костях считаются «3».',
        action: 'passive',
        iconName: 'crowned-skull',
      },
    ],
  },
};

const TOKENS = 'phantom.tokens-of-the-departed';

const phantom: SubclassDef = {
  id: 'phantom',
  name: 'Фантом',
  description: 'Плут на грани жизни и смерти: призрачные знания, стенания мертвецов в ударах и сувениры отлетевших душ.',
  source: 'Ravenloft: The Horrors Within',
  levels: {
    3: [
      {
        id: 'phantom.whispers-of-the-dead',
        name: 'Шёпот мёртвых',
        description:
          'Завершив короткий или продолжительный отдых, вы можете получить владение одним навыком или инструментом, которым ещё не владеете. Владение пропадает, когда вы снова используете это умение и выбираете другое.',
        iconName: 'human-ear',
      },
      {
        id: 'phantom.wails-from-the-grave',
        name: 'Могильные стенания',
        description:
          'Сразу после того, как в свой ход вы наносите урон Коварной атакой, вы можете выбрать второе видимое существо в пределах 30 футов от первого: оно получает некротический урон — половина костей Коварной атаки (с округлением вверх). Использований — модификатор Ловкости (минимум 1) за продолжительный отдых.',
        action: 'passive',
        resource: { id: 'phantom.wails-from-the-grave', name: 'Могильные стенания', max: modifierOf('dexterity'), recharge: 'long', iconName: 'screaming' },
        damage: (ctx) => `${Math.ceil(Math.ceil(ctx.classLevel / 2) / 2)}d6`,
        damageType: 'Некротический',
        iconName: 'screaming',
        color: '#6c8a7a',
      },
    ],
    9: [
      {
        id: 'phantom.tokens-of-the-departed',
        name: 'Сувениры усопших',
        description: [
          'У вас есть сувениры усопших — Крошечные предметы с частицей силы мёртвых; отойдя от сувенира дальше чем на 30 футов, вы находите его на себе. Сувениров не больше 2 (3 с 13-го уровня, 4 с 17-го); новый сверх лимита уничтожает один из старых. Завершив продолжительный отдых с менее чем двумя сувенирами, вы доводите их число до двух.',
          '- **Получение.** Когда видимое вами существо в пределах 30 футов умирает, вы можете реакцией получить новый сувенир.',
          '- **Перезвон смерти.** Нанеся урон Коварной атакой в свой ход, вы можете уничтожить сувенир и сразу применить Могильные стенания, не тратя их использования.',
          '- **Сущность жизни.** Пока у вас есть сувенир, спасброски от смерти и спасброски Телосложения вы совершаете с преимуществом.',
          '- **Вопрос к духам.** Действием «Магия» вы уничтожаете сувенир и творите «Гадание» без компонентов (заклинательная характеристика — Телосложение). Если вы знаете, чей это сувенир, вместо этого можете задать его духу один вопрос — он отвечает кратко на языке, который знал при жизни.',
        ].join('\n'),
        action: 'reaction',
        resource: {
          id: TOKENS,
          name: 'Сувениры усопших',
          max: byClassLevel({ 9: 2, 13: 3, 17: 4 }),
          recharge: 'none',
          description: 'Максимум сувениров; продолжительный отдых доводит их число до двух.',
          iconName: 'spectre',
        },
        effects: [{ type: 'spell', spell: 'augury', alwaysPrepared: true, ability: 'constitution', resourceId: TOKENS, note: 'Вопрос к духам: тратит сувенир' }],
        iconName: 'spectre',
      },
      {
        id: 'phantom.voice-of-the-dead',
        name: 'Голос мёртвых',
        description:
          'Вы можете сотворить «Разговор с мёртвыми» без компонентов, используя Ловкость как заклинательную характеристику; возможность возвращается после короткого или продолжительного отдыха. Целью вместо трупа может быть ваш сувенир усопшего — тогда отвечает его дух.',
        resource: { id: 'phantom.voice-of-the-dead', name: 'Голос мёртвых', max: 1, recharge: 'shortOrLong', iconName: 'skull-staff' },
        effects: [{ type: 'spell', spell: 'speak-with-dead', alwaysPrepared: true, ability: 'dexterity', resourceId: 'phantom.voice-of-the-dead' }],
        iconName: 'skull-staff',
      },
    ],
    13: [
      {
        id: 'phantom.ghost-walk',
        name: 'Призрачная походка',
        description:
          'Бонусным действием вы принимаете призрачную форму на 10 минут (или пока не прекратите её без действия):\n\n- **Полёт.** Скорость полёта 10 футов, вы можете парить.\n- **Зыбкий силуэт.** Броски атаки по вам совершаются с помехой.\n- **Бестелесное перемещение.** Вы проходите сквозь существ и предметы как по труднопроходимой местности; закончив ход внутри них, получаете 1к10 силового урона.\n\nРаз в продолжительный отдых; использование можно вернуть, уничтожив сувенир усопшего (без действия).',
        action: 'bonus',
        resource: { id: 'phantom.ghost-walk', name: 'Призрачная походка', max: 1, recharge: 'long' },
        iconName: 'wing-cloak',
      },
    ],
    17: [
      {
        id: 'phantom.deaths-friend',
        name: 'Друг смерти',
        description:
          '**Скорбный вой.** Используя Могильные стенания, вы можете нанести их некротический урон и первому, и второму существу.\n\n**Притяжение смерти.** Бросая инициативу без единого сувенира усопшего, вы получаете один.',
        action: 'passive',
        iconName: 'death-skull',
      },
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// The class
// ------------------------------------------------------------------------------------------------

/** Starting equipment of the 2024 Rogue. */
export const ROGUE_KITS: KitOption[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { ref: 'leather-armor' },
      { ref: 'dagger', quantity: 2 },
      { ref: 'shortsword' },
      { ref: 'shortbow' },
      { ref: 'arrows', quantity: 20 },
      { ref: 'quiver' },
      { ref: 'thieves-tools' },
      { ref: 'burglars-pack' },
    ],
    gold: 8,
  },
  { id: 'b', label: 'B', items: [], gold: 100 },
];

export const ROGUE: ClassDef = {
  id: 'rogue',
  name: 'Плут',
  description: 'Мастер скрытности, ловкости и хитрых приёмов. Бьёт туда, где больнее, уходит от опасности и почти в любом деле надёжнее остальных.',
  hitDie: 8,
  primary: ['dexterity'],
  saves: ['dexterity', 'intelligence'],
  skillChoices: {
    count: 4,
    list: ['acrobatics', 'athletics', 'perception', 'intimidation', 'sleightOfHand', 'deception', 'insight', 'investigation', 'stealth', 'persuasion'],
  },
  proficiencies: [
    { type: 'proficiency', category: 'armor', value: 'Лёгкие доспехи' },
    { type: 'proficiency', category: 'weapon', value: 'Простое оружие' },
    { type: 'proficiency', category: 'weapon', value: 'Воинское оружие (фехтовальное или лёгкое)' },
    { type: 'proficiency', category: 'tool', value: 'Воровские инструменты' },
  ],
  subclassLevel: 3,
  subclasses: [arcaneTrickster, assassin, soulknife, thief, scionOfTheThree, phantom],
  startingEquipment: ROGUE_KITS,
  levels: {
    1: [
      {
        id: 'rogue.sneak-attack',
        name: 'Коварная атака',
        description:
          'Раз в ход вы можете нанести дополнительный урон одному существу, по которому попали атакой с преимуществом дальнобойным или фехтовальным оружием. Тип урона — как у оружия. Преимущество не нужно, если в пределах 5 футов от цели есть ваш дееспособный союзник и у атаки нет помехи.\n\nУрон: 1к6 и ещё 1к6 на каждом нечётном уровне плута (10к6 на 19-м).',
        action: 'passive',
        damage: (ctx) => `${Math.ceil(ctx.classLevel / 2)}d6`,
        iconName: 'backstab',
        color: '#b0413e',
      },
      {
        id: 'rogue.weapon-mastery',
        name: 'Оружейное мастерство',
        description: 'Вы используете свойства мастерства двух видов оружия, которыми владеете. После продолжительного отдыха выбор можно изменить.',
        iconName: 'thrown-daggers',
        choices: [weaponMasteryChoice(2, 'Оружейное мастерство (2)')],
      },
      {
        id: 'rogue.thieves-cant',
        name: 'Воровской жаргон',
        description: 'Вы знаете Воровской жаргон и ещё один язык на свой выбор.',
        iconName: 'quill-ink',
        effects: [{ type: 'proficiency', category: 'language', value: 'Воровской жаргон' }],
        choices: [{ id: 'language', label: 'Язык', count: 1, options: { from: 'languages' } }],
      },
      expertise(1),
    ],
    2: [
      {
        id: 'rogue.cunning-action',
        name: 'Хитрое действие',
        description: 'В свой ход вы можете бонусным действием совершить Рывок, Отход или Затаивание.',
        action: 'bonus',
        iconName: 'sprint',
      },
    ],
    3: [
      subclassHeading('rogue', 'Подкласс плута', 'Вы выбираете подкласс плута, который даёт умения на 3, 9, 13 и 17 уровнях.'),
      {
        id: 'rogue.steady-aim',
        name: 'Точное прицеливание',
        description: 'Бонусным действием вы получаете преимущество на следующий бросок атаки в этом ходу. Только если вы не перемещались в этом ходу; после этого ваша скорость до конца хода равна 0.',
        action: 'bonus',
        iconName: 'crosshair',
      },
    ],
    4: [abilityScoreImprovement('rogue', 4)],
    5: [
      {
        id: 'rogue.cunning-strike',
        name: 'Хитрый удар',
        description:
          'Нанося урон Коварной атакой, вы можете добавить один эффект, убрав из её урона указанное число костей до броска. СЛ спасброска = 8 + модификатор Ловкости + бонус мастерства.\n\n- **Отравление (1к6).** Спасбросок Телосложения, иначе цель отравлена на 1 минуту (повторяет спасбросок в конце каждого своего хода). Нужны инструменты отравителя.\n- **Подсечка (1к6).** Цель Большого размера или меньше совершает спасбросок Ловкости, иначе падает ничком.\n- **Отступление (1к6).** Сразу после атаки вы перемещаетесь на половину скорости, не провоцируя атак.',
        action: 'passive',
        saveDC: dexDC,
        iconName: 'knife-thrust',
      },
      {
        id: 'rogue.uncanny-dodge',
        name: 'Невероятное уклонение',
        description: 'Когда видимый вами атакующий попадает по вам броском атаки, вы можете реакцией уменьшить урон этой атаки вдвое (с округлением вниз).',
        action: 'reaction',
        iconName: 'dodge',
      },
    ],
    6: [expertise(6)],
    7: [
      {
        id: 'rogue.evasion',
        name: 'Увёртливость',
        description: 'Если эффект позволяет спасброском Ловкости получить половину урона, при успехе вы не получаете урона, а при провале — половину. Не работает, пока вы недееспособны.',
        action: 'passive',
        iconName: 'dodging',
      },
      {
        id: 'rogue.reliable-talent',
        name: 'Надёжный талант',
        description: 'В проверке характеристики с навыком или инструментом, которым вы владеете, результат 1–9 на к20 считается как 10.',
        action: 'passive',
        iconName: 'perspective-dice-six-faces-random',
      },
    ],
    8: [abilityScoreImprovement('rogue', 8)],
    10: [abilityScoreImprovement('rogue', 10)],
    11: [
      {
        id: 'rogue.improved-cunning-strike',
        name: 'Улучшенный Хитрый удар',
        description: 'Нанося урон Коварной атакой, вы можете применить до двух эффектов Хитрого удара, оплачивая стоимость каждого.',
        action: 'passive',
        iconName: 'spinning-blades',
      },
    ],
    12: [abilityScoreImprovement('rogue', 12)],
    14: [
      {
        id: 'rogue.devious-strikes',
        name: 'Бесчестные удары',
        description:
          'Вы изучаете новые эффекты Хитрого удара:\n\n- **Шок (2к6).** Спасбросок Телосложения, иначе в свой следующий ход цель может только переместиться, или совершить действие, или бонусное действие.\n- **Нокаут (6к6).** Спасбросок Телосложения, иначе цель без сознания на 1 минуту или пока не получит урон (повторяет спасбросок в конце каждого своего хода).\n- **Ослепление (3к6).** Спасбросок Ловкости, иначе цель ослеплена до конца своего следующего хода.',
        action: 'passive',
        saveDC: dexDC,
        iconName: 'knocked-out-stars',
      },
    ],
    15: [
      {
        id: 'rogue.slippery-mind',
        name: 'Скользкий ум',
        description: 'Вы получаете владение спасбросками Мудрости и Харизмы.',
        effects: [
          { type: 'save', attribute: 'wisdom' },
          { type: 'save', attribute: 'charisma' },
        ],
        iconName: 'brain',
      },
    ],
    16: [abilityScoreImprovement('rogue', 16)],
    18: [
      {
        id: 'rogue.elusive',
        name: 'Неуловимость',
        description: 'Пока вы не недееспособны, броски атаки по вам не могут совершаться с преимуществом.',
        action: 'passive',
        iconName: 'shadow-follower',
      },
    ],
    19: [epicBoon('rogue')],
    20: [
      {
        id: 'rogue.stroke-of-luck',
        name: 'Улыбка фортуны',
        description: 'Провалив тест к20, вы можете заменить результат броска на «20». Раз в короткий или продолжительный отдых.',
        action: 'passive',
        resource: { id: 'rogue.stroke-of-luck', name: 'Улыбка фортуны', max: 1, recharge: 'shortOrLong', iconName: 'dice-fire' },
        iconName: 'dice-fire',
      },
    ],
  },
};

/** Pictures of the class and its subclasses on the creation screen. */
export const ROGUE_ICONS = {
  class: 'cloak-dagger',
  subclasses: {
    'arcane-trickster': 'magic-palm',
    assassin: 'hooded-assassin',
    soulknife: 'energy-sword',
    thief: 'lockpicks',
    'scion-of-the-three': 'tentacles-skull',
    phantom: 'ghost',
  } as Record<string, string>,
};
